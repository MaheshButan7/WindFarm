"""
Wind Turbine Monitoring Backend
FastAPI app with REST API, ASGI Socket.IO, and data processing
"""
import os
import sys
import asyncio
import threading
from datetime import datetime, timedelta, timezone
from collections import deque
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
import socketio
from pydantic import BaseModel, Field, field_validator
from dotenv import load_dotenv

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("Warning: OpenAI not available. AI features will be disabled.")

load_dotenv()

INGEST_TOKEN = os.getenv("INGEST_TOKEN", "dev-token-change-in-production")
PORT = int(os.getenv("PORT", "8080"))
OPENAI_KEY = os.getenv("OPENAI_KEY", "")
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
allowed_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
if not allowed_origins:
    allowed_origins = ["*"]

# Initialize OpenAI client if available
openai_client = None
if OPENAI_AVAILABLE and OPENAI_KEY:
    try:
        openai_client = OpenAI(api_key=OPENAI_KEY)
        print("OpenAI client initialized successfully")
    except Exception as e:
        print(f"Warning: Failed to initialize OpenAI client: {e}")
        openai_client = None


# Pydantic Models
class PitchDeg(BaseModel):
    A: float = Field(..., ge=-90, le=90)
    B: float = Field(..., ge=-90, le=90)
    C: float = Field(..., ge=-90, le=90)


class Limits(BaseModel):
    vibration_rms_mm_s: Optional[Dict[str, float]] = None
    gearbox_oil_temp_c: Optional[Dict[str, float]] = None
    generator_winding_temp_c: Optional[Dict[str, float]] = None
    rotor_speed_rpm: Optional[Dict[str, float]] = None
    power_kw: Optional[Dict[str, float]] = None


class MetaData(BaseModel):
    capacity_kw: Optional[float] = None
    generator_type: Optional[str] = None
    blade_length_m: Optional[float] = None
    height_m: Optional[float] = None
    limits: Optional[Limits] = None


class SignalData(BaseModel):
    vibration_rms_mm_s: Optional[float] = None
    rotor_speed_rpm: Optional[float] = None
    power_kw: Optional[float] = None
    pitch_deg: Optional[PitchDeg] = None
    yaw_deg: Optional[float] = Field(None, ge=0, le=360)
    wind_speed_ms: Optional[float] = Field(None, ge=0)
    wind_direction_deg: Optional[float] = Field(None, ge=0, le=360)
    gearbox_oil_temp_c: Optional[float] = None
    generator_winding_temp_c: Optional[float] = None
    ambient_temp_c: Optional[float] = None
    humidity_pct: Optional[float] = Field(None, ge=0, le=100)
    grid_status: Optional[str] = None

    @field_validator("grid_status")
    @classmethod
    def validate_grid_status(cls, v):
        if v and v not in ["connected", "tripped", "islanded"]:
            raise ValueError("grid_status must be 'connected', 'tripped', or 'islanded'")
        return v


class IngestPayload(BaseModel):
    turbine_id: str
    ts: str
    seq: int
    signals: SignalData
    meta: Optional[MetaData] = None


# Data Structures
@dataclass
class TurbineState:
    turbine_id: str
    last_seq: int = 0
    last_update: Optional[datetime] = None
    health_score: float = 100.0
    status: str = "unknown"  # "online", "offline", "warning", "critical"

    # Metadata
    capacity_kw: Optional[float] = None
    generator_type: Optional[str] = None
    blade_length_m: Optional[float] = None
    height_m: Optional[float] = None
    limits: Optional[Limits] = None

    # Raw signal buffers (ring buffers)
    vibration_rms_mm_s: deque = field(default_factory=lambda: deque(maxlen=7200))  # 2h @ 1s
    rotor_speed_rpm: deque = field(default_factory=lambda: deque(maxlen=1800))  # 1h @ 2s
    power_kw: deque = field(default_factory=lambda: deque(maxlen=1800))  # 1h @ 2s
    pitch_deg_A: deque = field(default_factory=lambda: deque(maxlen=1800))
    pitch_deg_B: deque = field(default_factory=lambda: deque(maxlen=1800))
    pitch_deg_C: deque = field(default_factory=lambda: deque(maxlen=1800))
    yaw_deg: deque = field(default_factory=lambda: deque(maxlen=720))  # 1h @ 5s
    wind_speed_ms: deque = field(default_factory=lambda: deque(maxlen=720))
    wind_direction_deg: deque = field(default_factory=lambda: deque(maxlen=720))
    gearbox_oil_temp_c: deque = field(default_factory=lambda: deque(maxlen=480))  # 2h @ 15s
    generator_winding_temp_c: deque = field(default_factory=lambda: deque(maxlen=480))
    ambient_temp_c: deque = field(default_factory=lambda: deque(maxlen=60))  # 1h @ 60s
    humidity_pct: deque = field(default_factory=lambda: deque(maxlen=60))
    grid_status: deque = field(default_factory=lambda: deque(maxlen=3600))  # 5h @ 5s

    # Timestamp buffers
    timestamps: deque = field(default_factory=lambda: deque(maxlen=7200))

    # Aggregates (1-min, 15-min, hourly)
    aggregates_1min: deque = field(default_factory=lambda: deque(maxlen=1440))  # 24h
    aggregates_15min: deque = field(default_factory=lambda: deque(maxlen=672))  # 7 days
    aggregates_hourly: deque = field(default_factory=lambda: deque(maxlen=720))  # 30 days

    # Risk scores
    component_risks: Dict[str, float] = field(default_factory=lambda: {
        "gearbox": 0.0,
        "blades": 0.0,
        "generator": 0.0,
        "bearings": 0.0,
        "power_panel": 0.0
    })

    # RUL (Remaining Useful Life)
    rul: Dict[str, Dict[str, float]] = field(default_factory=lambda: {
        "gearbox": {"value": 365.0, "confidence": 0.85},
        "blades": {"value": 730.0, "confidence": 0.90},
        "generator": {"value": 1095.0, "confidence": 0.80},
        "bearings": {"value": 180.0, "confidence": 0.75},
        "power_panel": {"value": 540.0, "confidence": 0.85}
    })


# Global state
turbines: Dict[str, TurbineState] = {}
connected_clients = set()

# Initialize Socket.IO AsyncServer
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*" if "*" in allowed_origins else allowed_origins
)


# Helper functions
def get_or_create_turbine(turbine_id: str) -> TurbineState:
    if turbine_id not in turbines:
        turbines[turbine_id] = TurbineState(turbine_id=turbine_id)
    return turbines[turbine_id]


def parse_rfc3339(ts_str: str) -> datetime:
    """Parse RFC3339 timestamp"""
    try:
        if ts_str.endswith("Z"):
            ts_str = ts_str[:-1] + "+00:00"
        return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    except Exception as e:
        raise ValueError(f"Invalid timestamp format: {ts_str}")


def get_latest_value(buffer: deque):
    """Helper to safely get latest value from a deque buffer. Returns None if buffer is empty."""
    if buffer and len(buffer) > 0:
        item = buffer[-1]
        return item[1] if isinstance(item, tuple) else item
    return None


def get_latest_values(turbine: TurbineState) -> Dict[str, Any]:
    """Extract all latest values from turbine state"""
    latest_values = {}

    # Power and mechanical signals
    latest = get_latest_value(turbine.power_kw)
    if latest is not None:
        latest_values["power_kw"] = latest
    latest = get_latest_value(turbine.rotor_speed_rpm)
    if latest is not None:
        latest_values["rotor_speed_rpm"] = latest
    latest = get_latest_value(turbine.vibration_rms_mm_s)
    if latest is not None:
        latest_values["vibration_rms_mm_s"] = latest

    # Wind and environmental signals
    latest = get_latest_value(turbine.wind_speed_ms)
    if latest is not None:
        latest_values["wind_speed_ms"] = latest
    latest = get_latest_value(turbine.wind_direction_deg)
    if latest is not None:
        latest_values["wind_direction_deg"] = latest
    latest = get_latest_value(turbine.ambient_temp_c)
    if latest is not None:
        latest_values["ambient_temp_c"] = latest
    latest = get_latest_value(turbine.humidity_pct)
    if latest is not None:
        latest_values["humidity_pct"] = latest

    # Operational signals
    latest = get_latest_value(turbine.yaw_deg)
    if latest is not None:
        latest_values["yaw_deg"] = latest
    latest = get_latest_value(turbine.pitch_deg_A)
    if latest is not None:
        latest_values["pitch_deg_A"] = latest
    latest = get_latest_value(turbine.pitch_deg_B)
    if latest is not None:
        latest_values["pitch_deg_B"] = latest
    latest = get_latest_value(turbine.pitch_deg_C)
    if latest is not None:
        latest_values["pitch_deg_C"] = latest

    # Thermal signals
    latest = get_latest_value(turbine.gearbox_oil_temp_c)
    if latest is not None:
        latest_values["gearbox_oil_temp_c"] = latest
    latest = get_latest_value(turbine.generator_winding_temp_c)
    if latest is not None:
        latest_values["generator_winding_temp_c"] = latest

    # Grid status (string, not numeric)
    latest = get_latest_value(turbine.grid_status)
    if latest is not None:
        latest_values["grid_status"] = latest

    return latest_values


def generate_ai_text(prompt: str, max_tokens: int = 200) -> str:
    """Generate AI text using OpenAI API"""
    if not openai_client:
        return f"Analysis: {prompt[:100]}... Based on the data provided, this requires further investigation."

    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a wind turbine maintenance expert. Provide concise, technical analysis."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return f"Analysis: {prompt[:100]}... Based on the data provided, this requires further investigation."


def check_anomalies(turbine: TurbineState, signals: SignalData, ts: datetime):
    """Check for anomalies and generate alerts"""
    alerts = []

    if turbine.limits:
        # Vibration check
        if signals.vibration_rms_mm_s is not None and turbine.limits.vibration_rms_mm_s:
            warn = turbine.limits.vibration_rms_mm_s.get("warn")
            alarm = turbine.limits.vibration_rms_mm_s.get("alarm")
            if alarm and signals.vibration_rms_mm_s >= alarm:
                alerts.append({
                    "type": "alert",
                    "turbine_id": turbine.turbine_id,
                    "ts": ts.isoformat() + "Z",
                    "severity": "critical",
                    "code": "GEARBOX_VIBRATION_HIGH",
                    "message": "Gearbox vibration exceeds alarm threshold.",
                    "context": {
                        "vibration_rms_mm_s": signals.vibration_rms_mm_s,
                        "warn": warn,
                        "alarm": alarm
                    }
                })
            elif warn and signals.vibration_rms_mm_s >= warn:
                alerts.append({
                    "type": "alert",
                    "turbine_id": turbine.turbine_id,
                    "ts": ts.isoformat() + "Z",
                    "severity": "warning",
                    "code": "GEARBOX_VIBRATION_ELEVATED",
                    "message": "Gearbox vibration exceeds warning threshold.",
                    "context": {
                        "vibration_rms_mm_s": signals.vibration_rms_mm_s,
                        "warn": warn,
                        "alarm": alarm
                    }
                })

        # Gearbox temperature check
        if signals.gearbox_oil_temp_c is not None and turbine.limits.gearbox_oil_temp_c:
            warn = turbine.limits.gearbox_oil_temp_c.get("warn")
            alarm = turbine.limits.gearbox_oil_temp_c.get("alarm")
            if alarm and signals.gearbox_oil_temp_c >= alarm:
                alerts.append({
                    "type": "alert",
                    "turbine_id": turbine.turbine_id,
                    "ts": ts.isoformat() + "Z",
                    "severity": "critical",
                    "code": "GEARBOX_TEMP_HIGH",
                    "message": "Gearbox oil temperature exceeds alarm threshold.",
                    "context": {
                        "gearbox_oil_temp_c": signals.gearbox_oil_temp_c,
                        "warn": warn,
                        "alarm": alarm
                    }
                })

        # Generator temperature check
        if signals.generator_winding_temp_c is not None and turbine.limits.generator_winding_temp_c:
            warn = turbine.limits.generator_winding_temp_c.get("warn")
            alarm = turbine.limits.generator_winding_temp_c.get("alarm")
            if alarm and signals.generator_winding_temp_c >= alarm:
                alerts.append({
                    "type": "alert",
                    "turbine_id": turbine.turbine_id,
                    "ts": ts.isoformat() + "Z",
                    "severity": "critical",
                    "code": "GENERATOR_TEMP_HIGH",
                    "message": "Generator winding temperature exceeds alarm threshold.",
                    "context": {
                        "generator_winding_temp_c": signals.generator_winding_temp_c,
                        "warn": warn,
                        "alarm": alarm
                    }
                })

    # Grid status change check
    if signals.grid_status:
        if turbine.grid_status and len(turbine.grid_status) > 0:
            last_status = turbine.grid_status[-1][1] if isinstance(turbine.grid_status[-1], tuple) else turbine.grid_status[-1]
            if last_status != signals.grid_status:
                alerts.append({
                    "type": "alert",
                    "turbine_id": turbine.turbine_id,
                    "ts": ts.isoformat() + "Z",
                    "severity": "warning" if signals.grid_status != "connected" else "info",
                    "code": f"GRID_STATUS_{signals.grid_status.upper()}",
                    "message": f"Grid status changed to {signals.grid_status}.",
                    "context": {
                        "previous_status": last_status,
                        "current_status": signals.grid_status
                    }
                })

    return alerts


# WebSocket Event Handlers
@sio.event
async def connect(sid, environ):
    """Handle WebSocket connection"""
    connected_clients.add(sid)
    print(f"Client connected: {sid}")


@sio.event
async def disconnect(sid):
    """Handle WebSocket disconnection"""
    connected_clients.discard(sid)
    print(f"Client disconnected: {sid}")


@sio.event
async def subscribe(sid, data):
    """Handle subscription request"""
    await sio.emit("message", {"type": "subscribed", "turbine_ids": data.get("turbine_ids", [])}, to=sid)


# Background Tasks
async def compute_rolling_metrics_task():
    """Every 10s: compute rolling metrics for fast signals"""
    while True:
        try:
            for turbine in turbines.values():
                if len(turbine.vibration_rms_mm_s) > 10:
                    recent_vib = [v for _, v in list(turbine.vibration_rms_mm_s)[-10:]]
                    avg_vib = sum(recent_vib) / len(recent_vib)

                if len(turbine.rotor_speed_rpm) > 5:
                    recent_rpm = [v for _, v in list(turbine.rotor_speed_rpm)[-5:]]
                    avg_rpm = sum(recent_rpm) / len(recent_rpm)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in rolling metrics: {e}")
        await asyncio.sleep(10)


async def compute_aggregates_task():
    """Every 1min: compute aggregates + health score"""
    while True:
        try:
            now = datetime.now(timezone.utc)
            cutoff_1min = now - timedelta(minutes=1)

            for turbine in turbines.values():
                agg = {}
                if turbine.power_kw:
                    recent_power = [(ts, v) for ts, v in turbine.power_kw if ts >= cutoff_1min]
                    if recent_power:
                        values = [v for _, v in recent_power]
                        agg["power_kw"] = {
                            "min": min(values),
                            "max": max(values),
                            "avg": sum(values) / len(values)
                        }

                if turbine.vibration_rms_mm_s:
                    recent_vib = [(ts, v) for ts, v in turbine.vibration_rms_mm_s if ts >= cutoff_1min]
                    if recent_vib:
                        values = [v for _, v in recent_vib]
                        agg["vibration_rms_mm_s"] = {
                            "min": min(values),
                            "max": max(values),
                            "avg": sum(values) / len(values)
                        }

                if agg:
                    turbine.aggregates_1min.append((now, agg))

                # Compute health score
                health_factors = []
                if turbine.limits and turbine.limits.vibration_rms_mm_s:
                    if turbine.vibration_rms_mm_s:
                        latest_vib = turbine.vibration_rms_mm_s[-1][1]
                        warn = turbine.limits.vibration_rms_mm_s.get("warn", 0)
                        if latest_vib < warn:
                            health_factors.append(1.0)
                        elif latest_vib < turbine.limits.vibration_rms_mm_s.get("alarm", warn * 1.5):
                            health_factors.append(0.7)
                        else:
                            health_factors.append(0.3)

                if health_factors:
                    turbine.health_score = sum(health_factors) / len(health_factors) * 100
                else:
                    turbine.health_score = 100.0

                # Update status based on health
                if turbine.health_score >= 90:
                    turbine.status = "online"
                elif turbine.health_score >= 70:
                    turbine.status = "warning"
                else:
                    turbine.status = "critical"

                # Broadcast aggregate update
                await sio.emit("message", {
                    "type": "agg",
                    "turbine_id": turbine.turbine_id,
                    "ts": now.isoformat().replace("+00:00", "Z"),
                    "aggregates": agg,
                    "health_score": turbine.health_score
                })
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in aggregates: {e}")
        await asyncio.sleep(60)


async def compute_risk_scores_task():
    """Every 5min: compute risk scores"""
    while True:
        try:
            for turbine in turbines.values():
                risks = {}

                # Gearbox risk
                if turbine.vibration_rms_mm_s and turbine.limits and turbine.limits.vibration_rms_mm_s:
                    latest_vib = turbine.vibration_rms_mm_s[-1][1]
                    warn = turbine.limits.vibration_rms_mm_s.get("warn", 7)
                    alarm = turbine.limits.vibration_rms_mm_s.get("alarm", 10)
                    if latest_vib >= alarm:
                        risks["gearbox"] = 90.0
                    elif latest_vib >= warn:
                        risks["gearbox"] = 50.0 + (latest_vib - warn) / (alarm - warn) * 40
                    else:
                        risks["gearbox"] = (latest_vib / warn) * 50
                else:
                    risks["gearbox"] = 0.0

                # Generator risk
                if turbine.generator_winding_temp_c and turbine.limits and turbine.limits.generator_winding_temp_c:
                    latest_temp = turbine.generator_winding_temp_c[-1][1]
                    warn = turbine.limits.generator_winding_temp_c.get("warn", 95)
                    alarm = turbine.limits.generator_winding_temp_c.get("alarm", 110)
                    if latest_temp >= alarm:
                        risks["generator"] = 90.0
                    elif latest_temp >= warn:
                        risks["generator"] = 50.0 + (latest_temp - warn) / (alarm - warn) * 40
                    else:
                        risks["generator"] = (latest_temp / warn) * 50
                else:
                    risks["generator"] = 0.0

                # Simple risk for other components
                risks["blades"] = risks.get("gearbox", 0) * 0.7
                risks["bearings"] = risks.get("gearbox", 0) * 0.9
                risks["power_panel"] = 0.0

                turbine.component_risks = risks

                # Update RUL based on risks
                for component in risks:
                    if component in turbine.rul:
                        risk = risks[component]
                        turbine.rul[component]["value"] = max(0, turbine.rul[component]["value"] - (risk / 100) * 0.083)
                        turbine.rul[component]["confidence"] = max(0.5, 1.0 - (risk / 100) * 0.3)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in risk scores: {e}")
        await asyncio.sleep(300)


async def refresh_forecasts_task():
    """Every 15min: refresh short-term forecast; Every 6h: long-term"""
    short_term_counter = 0
    while True:
        try:
            now = datetime.now(timezone.utc)
            short_term_counter += 1

            for turbine in turbines.values():
                if turbine.wind_speed_ms and len(turbine.wind_speed_ms) > 10:
                    recent_wind = [v for _, v in list(turbine.wind_speed_ms)[-10:]]
                    avg_wind = sum(recent_wind) / len(recent_wind)
                    forecast_power = min(turbine.capacity_kw or 2000, avg_wind ** 3 * 0.1) if turbine.capacity_kw else avg_wind ** 3 * 0.1

                    await sio.emit("message", {
                        "type": "forecast",
                        "turbine_id": turbine.turbine_id,
                        "ts": now.isoformat().replace("+00:00", "Z"),
                        "forecast_type": "short_term",
                        "predicted_power_kw": forecast_power
                    })

            if short_term_counter >= 24:
                short_term_counter = 0
                for turbine in turbines.values():
                    await sio.emit("message", {
                        "type": "forecast",
                        "turbine_id": turbine.turbine_id,
                        "ts": now.isoformat().replace("+00:00", "Z"),
                        "forecast_type": "long_term",
                        "predicted_power_kw": turbine.capacity_kw * 0.7 if turbine.capacity_kw else 1400
                    })
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in forecasts: {e}")
        await asyncio.sleep(900)


ENABLE_SIMULATOR = os.getenv("ENABLE_SIMULATOR", "false").lower() in ("true", "1", "yes")
simulator_stop_event = threading.Event()


def run_internal_simulator():
    """Run the simulator in a background thread if enabled"""
    try:
        import time
        import traceback
        # Allow uvicorn time to bind to the port and accept connections
        time.sleep(2)
        import simulate
        target_url = f"http://127.0.0.1:{PORT}"
        print(f"🚀 Internal turbine simulator active! Target URL: {target_url}")
        simulate.run_simulation(
            url=target_url,
            token=INGEST_TOKEN,
            turbines=10,
            stop_event=simulator_stop_event
        )
    except Exception as e:
        print(f"Error in internal simulator thread: {e}")
        traceback.print_exc()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI Lifespan for managing background tasks and resources"""
    print(f"Wind Turbine Backend starting on port {PORT}...")
    print(f"Internal simulator setting: ENABLE_SIMULATOR={ENABLE_SIMULATOR}")
    tasks = [
        asyncio.create_task(compute_rolling_metrics_task()),
        asyncio.create_task(compute_aggregates_task()),
        asyncio.create_task(compute_risk_scores_task()),
        asyncio.create_task(refresh_forecasts_task())
    ]
    if ENABLE_SIMULATOR:
        sim_thread = threading.Thread(target=run_internal_simulator, daemon=True)
        sim_thread.start()

    yield

    print("Shutting down background tasks...")
    simulator_stop_event.set()
    for t in tasks:
        t.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)


# Initialize FastAPI Application
app = FastAPI(
    title="Wind Turbine Monitoring API",
    description="FastAPI backend for wind turbine telemetry, analytics, and alerts",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends

security = HTTPBearer(auto_error=False)

def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Validate Bearer token from request Authorization header"""
    if not credentials or credentials.credentials != INGEST_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization"
        )
    return credentials.credentials


# REST API Endpoints
@app.get("/health")
@app.get("/")
async def health_check():
    """Health check endpoint for Railway and load balancers"""
    return {
        "status": "ok",
        "service": "wind-turbine-backend",
        "turbines_count": len(turbines)
    }


@app.post(
    "/api/ingest",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(verify_token)]
)
async def ingest(payload: IngestPayload):
    """Accept simulator data"""
    turbine = get_or_create_turbine(payload.turbine_id)

    # Validate sequence number
    if payload.seq <= turbine.last_seq:
        raise HTTPException(status_code=400, detail="Out of order sequence number")

    turbine.last_seq = payload.seq
    ts = parse_rfc3339(payload.ts)
    turbine.last_update = ts

    # Store signals in buffers
    if payload.signals.vibration_rms_mm_s is not None:
        turbine.vibration_rms_mm_s.append((ts, payload.signals.vibration_rms_mm_s))
    if payload.signals.rotor_speed_rpm is not None:
        turbine.rotor_speed_rpm.append((ts, payload.signals.rotor_speed_rpm))
    if payload.signals.power_kw is not None:
        turbine.power_kw.append((ts, payload.signals.power_kw))
    if payload.signals.pitch_deg:
        turbine.pitch_deg_A.append((ts, payload.signals.pitch_deg.A))
        turbine.pitch_deg_B.append((ts, payload.signals.pitch_deg.B))
        turbine.pitch_deg_C.append((ts, payload.signals.pitch_deg.C))
    if payload.signals.yaw_deg is not None:
        turbine.yaw_deg.append((ts, payload.signals.yaw_deg))
    if payload.signals.wind_speed_ms is not None:
        turbine.wind_speed_ms.append((ts, payload.signals.wind_speed_ms))
    if payload.signals.wind_direction_deg is not None:
        turbine.wind_direction_deg.append((ts, payload.signals.wind_direction_deg))
    if payload.signals.gearbox_oil_temp_c is not None:
        turbine.gearbox_oil_temp_c.append((ts, payload.signals.gearbox_oil_temp_c))
    if payload.signals.generator_winding_temp_c is not None:
        turbine.generator_winding_temp_c.append((ts, payload.signals.generator_winding_temp_c))
    if payload.signals.ambient_temp_c is not None:
        turbine.ambient_temp_c.append((ts, payload.signals.ambient_temp_c))
    if payload.signals.humidity_pct is not None:
        turbine.humidity_pct.append((ts, payload.signals.humidity_pct))
    if payload.signals.grid_status:
        turbine.grid_status.append((ts, payload.signals.grid_status))

    turbine.timestamps.append(ts)

    # Update metadata if provided
    if payload.meta:
        if payload.meta.capacity_kw is not None:
            turbine.capacity_kw = payload.meta.capacity_kw
        if payload.meta.generator_type:
            turbine.generator_type = payload.meta.generator_type
        if payload.meta.blade_length_m is not None:
            turbine.blade_length_m = payload.meta.blade_length_m
        if payload.meta.height_m is not None:
            turbine.height_m = payload.meta.height_m
        if payload.meta.limits:
            turbine.limits = payload.meta.limits

    # Check for anomalies
    alerts = check_anomalies(turbine, payload.signals, ts)

    # Broadcast alerts via WebSocket
    for alert in alerts:
        await sio.emit("message", alert)

    # Broadcast tick update
    tick_data = {
        "type": "tick",
        "turbine_id": payload.turbine_id,
        "ts": payload.ts,
        "signals": {
            k: v for k, v in payload.signals.model_dump().items()
            if v is not None and k != "pitch_deg"
        }
    }
    if payload.signals.pitch_deg:
        tick_data["signals"]["pitch_deg"] = payload.signals.pitch_deg.model_dump()

    await sio.emit("message", tick_data)

    return {
        "received": True,
        "turbine_id": payload.turbine_id,
        "seq": payload.seq
    }


@app.get("/api/turbine/{turbine_id}/analytics")
async def turbine_analytics(turbine_id: str):
    """Return detailed analytics for a specific turbine"""
    if turbine_id not in turbines:
        raise HTTPException(status_code=404, detail="Turbine not found")

    turbine = turbines[turbine_id]
    maintenance_recommendations = []

    # Check gearbox condition
    if turbine.vibration_rms_mm_s and len(turbine.vibration_rms_mm_s) > 0:
        latest_vib = turbine.vibration_rms_mm_s[-1][1]
        warn_val = (turbine.limits.vibration_rms_mm_s.get("warn", 7) if turbine.limits and turbine.limits.vibration_rms_mm_s else 7)
        if latest_vib >= warn_val:
            prompt = f"Turbine {turbine_id} shows elevated vibration levels ({latest_vib:.2f} mm/s). Gearbox bearing health is declining. Recommend maintenance action."
            analysis = await asyncio.to_thread(generate_ai_text, prompt)
            maintenance_recommendations.append({
                "priority": "high",
                "title": "Gearbox Bearing Replacement",
                "description": "Elevated vibration levels indicate potential bearing wear.",
                "root_cause": analysis,
                "cost_impact": "$45,000",
                "action_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat() + "Z",
            })

    # Check generator temperature
    if turbine.generator_winding_temp_c and len(turbine.generator_winding_temp_c) > 0:
        latest_temp = turbine.generator_winding_temp_c[-1][1]
        warn_val = (turbine.limits.generator_winding_temp_c.get("warn", 95) if turbine.limits and turbine.limits.generator_winding_temp_c else 95)
        if latest_temp >= warn_val:
            prompt = f"Turbine {turbine_id} generator winding temperature is elevated ({latest_temp:.1f}°C). Analyze potential causes and recommend actions."
            analysis = await asyncio.to_thread(generate_ai_text, prompt)
            maintenance_recommendations.append({
                "priority": "medium",
                "title": "Generator Winding Inspection",
                "description": "Elevated generator temperature detected.",
                "root_cause": analysis,
                "cost_impact": "$12,000",
                "action_date": (datetime.now(timezone.utc) + timedelta(days=45)).isoformat() + "Z",
            })

    return {
        "turbine_id": turbine_id,
        "health_score": turbine.health_score,
        "component_risks": turbine.component_risks,
        "rul": turbine.rul,
        "maintenance_recommendations": maintenance_recommendations,
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    }


@app.get("/api/snapshot")
async def snapshot(window: str = Query("30m")):
    """Return current dashboard state"""
    try:
        try:
            window_minutes = int(window.rstrip("m"))
        except ValueError:
            window_minutes = 30

        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=window_minutes)

        # Build farm KPIs
        current_power_sum = 0
        rotor_rpm_sum = 0
        valid_turbines_for_power = 0
        valid_turbines_for_rpm = 0

        for turbine in turbines.values():
            # Current power
            if turbine.power_kw:
                latest_power = get_latest_value(turbine.power_kw)
                if latest_power is not None:
                    ts_check = turbine.power_kw[-1][0] if isinstance(turbine.power_kw[-1], tuple) else cutoff_time
                    if ts_check >= cutoff_time:
                        current_power_sum += latest_power
                        valid_turbines_for_power += 1

            # Rotor RPM average
            if turbine.rotor_speed_rpm:
                latest_rpm = get_latest_value(turbine.rotor_speed_rpm)
                if latest_rpm is not None:
                    ts_check = turbine.rotor_speed_rpm[-1][0] if isinstance(turbine.rotor_speed_rpm[-1], tuple) else cutoff_time
                    if ts_check >= cutoff_time:
                        rotor_rpm_sum += latest_rpm
                        valid_turbines_for_rpm += 1

        farm_kpis = {
            "current_power_kw": current_power_sum,
            "rotor_rpm_avg": rotor_rpm_sum / valid_turbines_for_rpm if valid_turbines_for_rpm > 0 else 0,
            "farm_health_pct": sum(t.health_score for t in turbines.values()) / len(turbines) if turbines else 100.0,
            "turbines_online": sum(1 for t in turbines.values() if t.status == "online")
        }

        turbine_list = []
        for turbine_id, turbine in turbines.items():
            latest_values = get_latest_values(turbine)

            timeseries = {}
            for signal_name, buffer in [
                ("vibration_rms_mm_s", turbine.vibration_rms_mm_s),
                ("rotor_speed_rpm", turbine.rotor_speed_rpm),
                ("power_kw", turbine.power_kw),
                ("wind_speed_ms", turbine.wind_speed_ms),
                ("wind_direction_deg", turbine.wind_direction_deg),
                ("gearbox_oil_temp_c", turbine.gearbox_oil_temp_c),
                ("generator_winding_temp_c", turbine.generator_winding_temp_c),
            ]:
                if buffer:
                    filtered = [(ts.isoformat() + "Z", val) for ts, val in buffer if ts >= cutoff_time]
                    if filtered:
                        timeseries[signal_name] = filtered

            turbine_list.append({
                "turbine_id": turbine_id,
                "status": turbine.status,
                "health_score": turbine.health_score,
                "last_update": turbine.last_update.isoformat() + "Z" if turbine.last_update else None,
                "latest_values": latest_values,
                "timeseries": timeseries,
                "capacity_kw": turbine.capacity_kw,
                "generator_type": turbine.generator_type,
                "blade_length_m": turbine.blade_length_m,
                "height_m": turbine.height_m,
                "limits": {
                    "vibration_rms_mm_s": turbine.limits.vibration_rms_mm_s,
                    "gearbox_oil_temp_c": turbine.limits.gearbox_oil_temp_c,
                    "generator_winding_temp_c": turbine.limits.generator_winding_temp_c,
                } if turbine.limits else None,
                "component_risks": turbine.component_risks,
                "rul": turbine.rul
            })

        return {
            "farm_kpis": farm_kpis,
            "turbines": turbine_list,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        }
    except Exception as e:
        print(f"Error generating snapshot: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate snapshot")


# Wrap FastAPI application with python-socketio ASGIApp
socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=app,
    socketio_path="socket.io"
)


if __name__ == "__main__":
    import uvicorn
    server_port = int(os.getenv("PORT", "8080"))
    print(f"Starting server on port {server_port}")
    uvicorn.run("main:socket_app", host="0.0.0.0", port=server_port, reload=False)

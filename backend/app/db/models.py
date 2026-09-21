from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class Turbine(Base):
    __tablename__ = "turbines"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    farm_id: Mapped[str] = mapped_column(String, index=True)
    model: Mapped[str] = mapped_column(String)
    rated_power_kw: Mapped[float] = mapped_column(Float)
    latitude: Mapped[float] = mapped_column(Float); longitude: Mapped[float] = mapped_column(Float)
    commissioning_date: Mapped[datetime] = mapped_column(DateTime)

class Telemetry(Base):
    __tablename__ = "telemetry"
    id: Mapped[int] = mapped_column(primary_key=True)
    turbine_id: Mapped[str] = mapped_column(ForeignKey("turbines.id"), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)
    wind_speed_mps: Mapped[float] = mapped_column(Float); wind_direction_deg: Mapped[float] = mapped_column(Float); nacelle_direction_deg: Mapped[float] = mapped_column(Float)
    rotor_rpm: Mapped[float] = mapped_column(Float); generator_rpm: Mapped[float] = mapped_column(Float); power_kw: Mapped[float] = mapped_column(Float); expected_power_kw: Mapped[float] = mapped_column(Float)
    pitch_a_deg: Mapped[float] = mapped_column(Float); pitch_b_deg: Mapped[float] = mapped_column(Float); pitch_c_deg: Mapped[float] = mapped_column(Float)
    vibration_rms_mm_s: Mapped[float] = mapped_column(Float); gearbox_temperature_c: Mapped[float] = mapped_column(Float); generator_temperature_c: Mapped[float] = mapped_column(Float); bearing_temperature_c: Mapped[float] = mapped_column(Float)
    ambient_temperature_c: Mapped[float] = mapped_column(Float); humidity_pct: Mapped[float] = mapped_column(Float); grid_status: Mapped[str] = mapped_column(String); grid_frequency_hz: Mapped[float] = mapped_column(Float); curtailment_pct: Mapped[float] = mapped_column(Float, default=0)
    __table_args__ = (Index("ix_telemetry_turbine_timestamp", "turbine_id", "timestamp"),)

class Feature(Base):
    __tablename__ = "telemetry_features"
    id: Mapped[int] = mapped_column(primary_key=True); turbine_id: Mapped[str] = mapped_column(ForeignKey("turbines.id"), index=True); timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)
    health_score: Mapped[float] = mapped_column(Float); anomaly_score: Mapped[float] = mapped_column(Float); overall_failure_risk: Mapped[float] = mapped_column(Float)
    gearbox_risk: Mapped[float] = mapped_column(Float); generator_risk: Mapped[float] = mapped_column(Float); bearing_risk: Mapped[float] = mapped_column(Float); yaw_risk: Mapped[float] = mapped_column(Float); power_residual_pct: Mapped[float] = mapped_column(Float); yaw_error_deg: Mapped[float] = mapped_column(Float)

class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[int] = mapped_column(primary_key=True); turbine_id: Mapped[str] = mapped_column(ForeignKey("turbines.id")); timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    severity: Mapped[str] = mapped_column(String); alert_type: Mapped[str] = mapped_column(String); component: Mapped[str] = mapped_column(String); title: Mapped[str] = mapped_column(String); description: Mapped[str] = mapped_column(Text); evidence_json: Mapped[str] = mapped_column(Text); risk_score: Mapped[float] = mapped_column(Float); status: Mapped[str] = mapped_column(String, default="OPEN")

class Maintenance(Base):
    __tablename__ = "maintenance_records"
    id: Mapped[int] = mapped_column(primary_key=True); turbine_id: Mapped[str] = mapped_column(ForeignKey("turbines.id")); date: Mapped[datetime] = mapped_column(DateTime); component: Mapped[str] = mapped_column(String); finding: Mapped[str] = mapped_column(Text); action_taken: Mapped[str] = mapped_column(Text); downtime_hours: Mapped[float] = mapped_column(Float)

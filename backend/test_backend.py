"""
Verification test suite for Wind Turbine FastAPI backend
Tests REST endpoints, authentication, and Socket.IO real-time telemetry.
"""
import sys
import asyncio
import uvicorn
import socketio
import requests
from starlette.testclient import TestClient
import main
from main import app, INGEST_TOKEN, socket_app

def run_rest_tests():
    print("--- Running REST API Tests ---")
    client = TestClient(app)

    # 1. Health check
    print("1. Testing GET /health...")
    resp = client.get("/health")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "wind-turbine-backend"
    print("   ✓ Health check passed")

    # 2. Ingest unauthorized
    print("2. Testing POST /api/ingest without auth...")
    resp = client.post("/api/ingest", json={})
    assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
    print("   ✓ Auth check passed")

    # 3. Ingest with valid payload
    print("3. Testing POST /api/ingest with valid payload...")
    payload = {
        "turbine_id": "WTG-TEST-01",
        "ts": "2026-09-18T12:00:00Z",
        "seq": 1,
        "signals": {
            "vibration_rms_mm_s": 4.5,
            "rotor_speed_rpm": 14.2,
            "power_kw": 1600.0,
            "pitch_deg": {"A": 2.5, "B": 2.5, "C": 2.5},
            "yaw_deg": 180.0,
            "wind_speed_ms": 9.5,
            "wind_direction_deg": 220.0,
            "gearbox_oil_temp_c": 62.0,
            "generator_winding_temp_c": 75.0,
            "ambient_temp_c": 22.0,
            "humidity_pct": 55.0,
            "grid_status": "connected"
        },
        "meta": {
            "capacity_kw": 2000.0,
            "generator_type": "synchronous",
            "blade_length_m": 52.0,
            "height_m": 120.0,
            "limits": {
                "vibration_rms_mm_s": {"warn": 7.0, "alarm": 10.0},
                "gearbox_oil_temp_c": {"warn": 80.0, "alarm": 90.0},
                "generator_winding_temp_c": {"warn": 95.0, "alarm": 110.0}
            }
        }
    }
    headers = {"Authorization": f"Bearer {INGEST_TOKEN}"}
    resp = client.post("/api/ingest", json=payload, headers=headers)
    assert resp.status_code == 202, f"Expected 202, got {resp.status_code}: {resp.text}"
    ingest_json = resp.json()
    assert ingest_json["received"] is True
    assert ingest_json["turbine_id"] == "WTG-TEST-01"
    assert ingest_json["seq"] == 1
    print("   ✓ Ingest telemetry passed")

    # 4. Ingest sequence validation
    print("4. Testing out-of-order sequence rejection...")
    resp = client.post("/api/ingest", json=payload, headers=headers)
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
    print("   ✓ Out of order sequence check passed")

    # 5. Snapshot test
    print("5. Testing GET /api/snapshot...")
    resp = client.get("/api/snapshot?window=60m")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    snap = resp.json()
    assert "farm_kpis" in snap
    assert "turbines" in snap
    assert any(t["turbine_id"] == "WTG-TEST-01" for t in snap["turbines"])
    print("   ✓ Snapshot KPI & timeseries passed")

    # 6. Analytics test
    print("6. Testing GET /api/turbine/WTG-TEST-01/analytics...")
    resp = client.get("/api/turbine/WTG-TEST-01/analytics")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    ana = resp.json()
    assert ana["turbine_id"] == "WTG-TEST-01"
    assert "health_score" in ana
    assert "component_risks" in ana
    assert "rul" in ana
    print("   ✓ Turbine analytics passed")

    # 7. Analytics 404 test
    print("7. Testing 404 for unknown turbine...")
    resp = client.get("/api/turbine/NON_EXISTENT/analytics")
    assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
    print("   ✓ 404 check passed")


async def run_ws_tests():
    print("\n--- Running Socket.IO Real-time Tests ---")
    port = 8998
    config = uvicorn.Config(socket_app, host="127.0.0.1", port=port, log_level="error")
    server = uvicorn.Server(config)
    server_task = asyncio.create_task(server.serve())
    await asyncio.sleep(1)

    sio_client = socketio.AsyncClient()
    received = []

    @sio_client.event
    async def message(data):
        received.append(data)

    print("1. Connecting Socket.IO client...")
    await sio_client.connect(f"http://127.0.0.1:{port}")
    print("   ✓ Socket.IO connected")

    print("2. Subscribing to turbine stream...")
    await sio_client.emit("subscribe", {"turbine_ids": ["WTG-WS-01"]})
    await asyncio.sleep(0.5)

    print("3. Ingesting telemetry to trigger live tick broadcast...")
    payload = {
        "turbine_id": "WTG-WS-01",
        "ts": "2026-09-18T12:10:00Z",
        "seq": 2,
        "signals": {"power_kw": 1850.0, "wind_speed_ms": 11.2}
    }
    def send_post():
        return requests.post(
            f"http://127.0.0.1:{port}/api/ingest",
            json=payload,
            headers={"Authorization": f"Bearer {INGEST_TOKEN}"}
        )
    resp = await asyncio.to_thread(send_post)
    assert resp.status_code == 202

    await asyncio.sleep(0.5)
    await sio_client.disconnect()
    server.should_exit = True
    await server_task

    msg_types = [m.get("type") for m in received]
    assert "subscribed" in msg_types, "Subscribed confirmation not received"
    assert "tick" in msg_types, "Tick telemetry broadcast not received"
    print(f"   ✓ Received messages: {msg_types}")
    print("   ✓ Socket.IO streaming passed")


def main_test():
    run_rest_tests()
    asyncio.run(run_ws_tests())
    print("\n==========================================")
    print("✓ ALL FASTAPI BACKEND TESTS PASSED!")
    print("==========================================")


if __name__ == "__main__":
    main_test()

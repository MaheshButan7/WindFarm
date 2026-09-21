# Wind Asset Intelligence Platform

An **AI-powered wind turbine asset intelligence layer** that consumes turbine telemetry, detects abnormal behaviour, predicts component risk, explains performance issues and recommends maintenance actions. It is a synthetic, local client demo — not a SCADA replacement and not validated for real failure prediction.

## Run

```powershell
cd backend; python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt
python -m app.db.seed --days 30
uvicorn app.main:app --reload --port 8000

cd ..\frontend; npm install; npm run dev
```

Open `http://localhost:5173`; API documentation is at `http://localhost:8000/docs`.

## Demo workflow

The dashboard starts with 30 synthetic turbines across three fictional farms. Select T04 to follow a seeded gearbox-degradation story, acknowledge alerts from Alert Center, or inject a scenario from the header. The simulator adds a correlated telemetry record for every turbine each second (one tick represents five simulated minutes), recalculates backend health/risk, persists the result, and broadcasts it over WebSocket.

## Design and architecture

`React/Vite → REST + WebSocket → FastAPI services → simulator + analytics + deterministic copilot → SQLAlchemy/SQLite`.

Synthetic data has correlated wind, power, rpm, temperature and vibration; no customer or Suzlon operational data is included. SQLite is isolated via repositories so it can later be replaced with PostgreSQL/TimescaleDB. In production, synthetic sources would be replaced by governed SCADA, CMS, weather and maintenance/ERP ingestion.

## APIs

- `GET /api/fleet/summary`, `GET /api/fleet/turbines`
- `GET /api/turbines/{id}`, `GET /api/turbines/{id}/history`
- `GET /api/analytics/{id}`, `GET /api/alerts`; `POST /api/alerts/{id}/acknowledge`
- `GET /api/maintenance/queue`, `POST /api/copilot/query`
- `POST /api/simulator/inject`, `WS /ws/live`

## Synthetic assumptions and limitations

The 2.0–2.5 MW curve uses cut-in 3m/s, nominal 11.5m/s and cut-out 25m/s. Health, risks, loss and anomaly scores are explainable heuristic/synthetic-model outputs, trained/evaluated only against the supplied synthetic scenarios. The deterministic copilot retrieves current live state, alerts and maintenance data and never executes commands. There is no authentication, real GIS, external integration or production ML validation.

# Wind Turbine Monitoring Backend

FastAPI backend server with ASGI Socket.IO for the wind turbine monitoring system.

## Features

- **FastAPI Core**: High-performance asynchronous REST API with automatic OpenAPI documentation.
- **ASGI Socket.IO**: Real-time bidirectional streaming for live telemetry ticks, anomaly alerts, aggregates, and forecasts.
- **Background Tasks**: Native asyncio tasks for rolling metrics, 1-minute aggregations, 5-minute component risk calculations, and forecast updates.
- **Integrated Simulator Support**: Optional built-in turbine simulator activated via environment flag (`ENABLE_SIMULATOR=true`).

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Run the server:
```bash
python main.py
```
Or directly with Uvicorn:
```bash
uvicorn main:socket_app --host 0.0.0.0 --port 8080 --reload
```

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8080/docs`
- ReDoc: `http://localhost:8080/redoc`

## API Endpoints

### GET /health
Health check endpoint returning service status.

### POST /api/ingest
Accepts simulator telemetry with authentication via Bearer token.
Header: `Authorization: Bearer <INGEST_TOKEN>`

### GET /api/snapshot?window=30m
Returns current dashboard state with farm KPIs and turbine time series slices.

### GET /api/turbine/{turbine_id}/analytics
Returns detailed health scores, remaining useful life (RUL), component risks, and AI maintenance recommendations.

### WebSocket (Socket.IO at `/socket.io/`)
Live updates channel. Connect and subscribe to receive:
- `tick`: Fast telemetry updates (vibration, power, speed, pitch, etc.)
- `agg`: 1-minute aggregated metrics and updated turbine health scores
- `alert`: Anomaly thresholds exceeded
- `forecast`: Short-term and long-term generation forecasts

## Environment Variables

- `INGEST_TOKEN`: Bearer token for the ingest endpoint (default: `dev-token-change-in-production`)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins (e.g., `http://localhost:3000,https://myfrontend.up.railway.app`)
- `PORT`: Server port (default: 8080)
- `ENABLE_SIMULATOR`: Set to `true` to run the turbine simulator internally inside the backend process.
- `OPENAI_KEY`: (Optional) OpenAI API key for AI-driven root cause and maintenance analysis.

## Railway Deployment Settings

1. **Root Directory**: `backend`
2. **Build Command**: `pip install -r requirements.txt`
3. **Start Command**: `uvicorn main:socket_app --host 0.0.0.0 --port ${PORT:-8080}` (or `python main.py`)
4. **Healthcheck Path**: `/health`
5. **Variables**: Configure `INGEST_TOKEN`, `ALLOWED_ORIGINS`, `ENABLE_SIMULATOR` (if desired), and `OPENAI_KEY` (optional).

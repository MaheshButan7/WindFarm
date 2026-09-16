# Wind Turbine Monitoring Backend

Flask backend server for wind turbine monitoring system.

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

Or with uvicorn (if using ASGI wrapper):
```bash
flask run --port 8000
```

## API Endpoints

### POST /api/ingest
Accepts simulator data with authentication via Bearer token.

### GET /api/snapshot?window=30m
Returns current dashboard state with farm KPIs and turbine data.

### WebSocket /ws/stream
Live updates endpoint. Connect and subscribe to receive:
- `tick`: Fast signal updates
- `agg`: Aggregate updates
- `alert`: Anomaly alerts
- `meta`: Metadata changes

## Environment Variables

- `INGEST_TOKEN`: Bearer token for ingest endpoint
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
- `PORT`: Server port (default: 8000)


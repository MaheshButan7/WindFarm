# Backend

Run `python -m app.db.seed --days 30` to create 30 fictional turbines, historical correlated telemetry, feature records and maintenance history. Run `uvicorn app.main:app --reload --port 8000` to initialize safely when no database exists and begin the one-second synthetic simulator.

`SIMULATION_STEP_SECONDS` is conceptually one real second per five simulated minutes in this demo. Scenario injection accepts `gearbox_degradation`, `yaw_misalignment`, `generator_overheating`, `bearing_degradation`, `pitch_imbalance`, `grid_event`, `sensor_drift`, and `performance_degradation`.

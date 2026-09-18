#!/usr/bin/env python3
"""
Wind Turbine Simulator
Periodically POSTs realistic turbine data to the main server
"""
import argparse
import os
import time
import random
import json
import requests
from datetime import datetime, timedelta, timezone
from typing import Dict, List
import signal
import sys
from dotenv import load_dotenv

load_dotenv()



class TurbineSimulator:
    def __init__(self, turbine_id: str, base_wind_speed: float = 8.0):
        self.turbine_id = turbine_id
        self.base_wind_speed = base_wind_speed
        
        # State variables (bounded random walks)
        self.wind_speed = base_wind_speed
        self.wind_direction = random.uniform(0, 360)
        self.rotor_speed = 12.0
        self.power = 1200.0
        self.vibration = 4.0
        self.pitch_A = 3.0
        self.pitch_B = 3.0
        self.pitch_C = 3.0
        self.yaw = 0.0
        self.gearbox_temp = 55.0
        self.generator_temp = 70.0
        self.ambient_temp = 25.0
        self.humidity = 60.0
        self.grid_status = "connected"
        
        # Sequence number
        self.seq = 0
        
        # Metadata
        self.capacity_kw = 2000.0
        self.generator_type = random.choice(["sync", "async"])
        self.blade_length_m = random.uniform(48.0, 56.0)  # Typical range: 48-56 meters
        self.height_m = random.uniform(115.0, 125.0)  # Typical range: 115-125 meters
        self.limits = {
            "vibration_rms_mm_s": {"warn": 7, "alarm": 10},
            "gearbox_oil_temp_c": {"warn": 80, "alarm": 90},
            "generator_winding_temp_c": {"warn": 95, "alarm": 110}
        }
        
        # Event injection state
        self.event_counter = 0
        self.in_event = False
    
    def bounded_random_walk(self, current: float, min_val: float, max_val: float, step: float = 0.1) -> float:
        """Bounded random walk for smooth variation"""
        change = random.uniform(-step, step)
        new_val = current + change
        return max(min_val, min(max_val, new_val))
    
    def update_wind(self):
        """Update wind speed and direction (every 5s)"""
        self.wind_speed = self.bounded_random_walk(self.wind_speed, 3.0, 15.0, 0.5)
        self.wind_direction = self.bounded_random_walk(self.wind_direction, 0, 360, 5.0)
        if self.wind_direction < 0:
            self.wind_direction += 360
        elif self.wind_direction >= 360:
            self.wind_direction -= 360
    
    def update_power_rpm(self):
        """Update power and RPM based on wind (every 2s)"""
        # Power roughly proportional to wind^3, capped at capacity
        ideal_power = (self.wind_speed ** 3) * 0.1
        self.power = min(self.capacity_kw, ideal_power * random.uniform(0.95, 1.05))
        
        # RPM constrained by pitch and wind speed
        base_rpm = self.wind_speed * 1.5
        pitch_factor = 1.0 - (abs(self.pitch_A) / 90.0) * 0.3
        self.rotor_speed = base_rpm * pitch_factor * random.uniform(0.98, 1.02)
        self.rotor_speed = max(5.0, min(20.0, self.rotor_speed))
    
    def update_pitch(self):
        """Update pitch angles (every 2s) - simulate pitch steps during gusts"""
        if self.wind_speed > 12.0:
            # High wind: increase pitch
            target_pitch = min(15.0, (self.wind_speed - 12.0) * 2)
        elif self.wind_speed < 5.0:
            # Low wind: decrease pitch
            target_pitch = max(-5.0, (self.wind_speed - 5.0) * 0.5)
        else:
            target_pitch = 3.0
        
        # Smooth pitch changes
        self.pitch_A = self.bounded_random_walk(self.pitch_A, -90, 90, 0.5)
        self.pitch_B = self.bounded_random_walk(self.pitch_B, -90, 90, 0.5)
        self.pitch_C = self.bounded_random_walk(self.pitch_C, -90, 90, 0.5)
        
        # Occasionally desynchronize (event injection)
        if random.random() < 0.001:  # 0.1% chance per update
            self.pitch_A += random.uniform(-2, 2)
            self.in_event = True
            self.event_counter = 10  # Last 10 updates (~20s)
    
    def update_yaw(self):
        """Update yaw angle to track wind direction (every 5s)"""
        # Yaw slowly tracks wind direction with lag
        direction_diff = self.wind_direction - self.yaw
        if direction_diff > 180:
            direction_diff -= 360
        elif direction_diff < -180:
            direction_diff += 360
        
        # Max slew rate: 5 degrees per update
        if abs(direction_diff) > 5:
            self.yaw += 5 if direction_diff > 0 else -5
        else:
            self.yaw += direction_diff * 0.3
        
        if self.yaw < 0:
            self.yaw += 360
        elif self.yaw >= 360:
            self.yaw -= 360
    
    def update_temperatures(self):
        """Update temperatures (lagging behind power) - every 15s"""
        # Temps lag behind power with first-order filter
        power_factor = self.power / self.capacity_kw
        target_gearbox = 50.0 + power_factor * 30.0
        target_generator = 60.0 + power_factor * 40.0
        
        self.gearbox_temp = self.gearbox_temp * 0.9 + target_gearbox * 0.1
        self.generator_temp = self.generator_temp * 0.9 + target_generator * 0.1
        
        # Add some noise
        self.gearbox_temp += random.uniform(-1, 1)
        self.generator_temp += random.uniform(-1, 1)
    
    def update_vibration(self):
        """Update vibration (every 1s)"""
        base_vibration = 3.0 + (self.rotor_speed / 20.0) * 2.0
        self.vibration = self.bounded_random_walk(self.vibration, 2.0, 8.0, 0.2)
        
        # Event injection: vibration spike
        if random.random() < 0.0005:  # 0.05% chance per second
            self.vibration = random.uniform(11, 15)
            self.in_event = True
            self.event_counter = 5  # Last 5 seconds
    
    def update_ambient(self):
        """Update ambient temp and humidity (every 60s)"""
        self.ambient_temp = self.bounded_random_walk(self.ambient_temp, 20, 30, 1.0)
        self.humidity = self.bounded_random_walk(self.humidity, 40, 80, 2.0)
    
    def update_grid_status(self):
        """Update grid status (on change + 5s heartbeat)"""
        # Occasionally trip grid
        if random.random() < 0.0001:  # Very rare
            self.grid_status = "tripped"
            self.power = 0
            return True
        elif self.grid_status == "tripped" and random.random() < 0.1:
            # Reconnect after trip
            self.grid_status = "connected"
            return True
        return False
    
    def create_payload(self, signals: Dict) -> Dict:
        """Create ingest payload"""
        self.seq += 1
        ts = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        
        payload = {
            "turbine_id": self.turbine_id,
            "ts": ts,
            "seq": self.seq,
            "signals": signals
        }
        
        # Include meta on first message or occasionally
        if self.seq == 1 or random.random() < 0.01:
            payload["meta"] = {
                "capacity_kw": self.capacity_kw,
                "generator_type": self.generator_type,
                "blade_length_m": round(self.blade_length_m, 1),
                "height_m": round(self.height_m, 1),
                "limits": self.limits
            }
        
        return payload
    
    def send_1s(self, url: str, token: str):
        """Send 1s cadence signals (vibration)"""
        signals = {
            "vibration_rms_mm_s": round(self.vibration, 2)
        }
        payload = self.create_payload(signals)
        self._send_post(url, token, payload)
    
    def send_2s(self, url: str, token: str):
        """Send 2s cadence signals (rotor speed, power, pitch)"""
        signals = {
            "rotor_speed_rpm": round(self.rotor_speed, 2),
            "power_kw": round(self.power, 2),
            "pitch_deg": {
                "A": round(self.pitch_A, 2),
                "B": round(self.pitch_B, 2),
                "C": round(self.pitch_C, 2)
            }
        }
        payload = self.create_payload(signals)
        self._send_post(url, token, payload)
    
    def send_5s(self, url: str, token: str):
        """Send 5s cadence signals (yaw, wind)"""
        signals = {
            "yaw_deg": round(self.yaw, 1),
            "wind_speed_ms": round(self.wind_speed, 2),
            "wind_direction_deg": round(self.wind_direction, 1)
        }
        payload = self.create_payload(signals)
        self._send_post(url, token, payload)
    
    def send_15s(self, url: str, token: str):
        """Send 15s cadence signals (temperatures)"""
        signals = {
            "gearbox_oil_temp_c": round(self.gearbox_temp, 1),
            "generator_winding_temp_c": round(self.generator_temp, 1)
        }
        payload = self.create_payload(signals)
        self._send_post(url, token, payload)
    
    def send_60s(self, url: str, token: str):
        """Send 60s cadence signals (ambient)"""
        signals = {
            "ambient_temp_c": round(self.ambient_temp, 1),
            "humidity_pct": round(self.humidity, 1)
        }
        payload = self.create_payload(signals)
        self._send_post(url, token, payload)
    
    def send_grid_status(self, url: str, token: str):
        """Send grid status (on change + heartbeat)"""
        signals = {
            "grid_status": self.grid_status
        }
        payload = self.create_payload(signals)
        self._send_post(url, token, payload)
    
    def _send_post(self, url: str, token: str, payload: Dict):
        """Send POST request with retry logic"""
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    f"{url}/api/ingest",
                    json=payload,
                    headers=headers,
                    timeout=5
                )
                if response.status_code == 202:
                    return
                elif response.status_code == 401:
                    print(f"[{self.turbine_id}] Authentication failed")
                    return
                else:
                    print(f"[{self.turbine_id}] Non-200 response: {response.status_code}")
            except requests.exceptions.RequestException as e:
                if attempt < max_retries - 1:
                    # Exponential backoff with jitter
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    time.sleep(wait_time)
                else:
                    print(f"[{self.turbine_id}] Failed to send after {max_retries} attempts: {e}")


def main():
    parser = argparse.ArgumentParser(description="Wind Turbine Simulator")
    parser.add_argument("--url", default=os.getenv("URL", "http://localhost:8080"), help="Main server URL")
    parser.add_argument("--token", default=os.getenv("INGEST_TOKEN", "dev-token-change-in-production"), help="Ingest token")
    parser.add_argument("--turbines", type=int, default=10, help="Number of turbines")
    args = parser.parse_args()
    
    # Create simulators
    simulators = []
    for i in range(args.turbines):
        turbine_id = f"TURB-{i+1:03d}"
        base_wind = random.uniform(6.0, 10.0)
        simulators.append(TurbineSimulator(turbine_id, base_wind))
    
    print(f"Starting {len(simulators)} turbine simulators...")
    print(f"Target URL: {args.url}")
    
    # Timing counters
    counter_1s = 0
    counter_2s = 0
    counter_5s = 0
    counter_15s = 0
    counter_60s = 0
    counter_grid = 0
    
    # Event tracking
    for sim in simulators:
        sim.event_counter = 0
    
    try:
        while True:
            start_time = time.time()
            
            # Update states
            for sim in simulators:
                sim.update_vibration()
                sim.update_wind()
                sim.update_power_rpm()
                sim.update_pitch()
                sim.update_yaw()
                sim.update_temperatures()
                sim.update_ambient()
                
                # Reset event flag
                if sim.event_counter > 0:
                    sim.event_counter -= 1
                    if sim.event_counter == 0:
                        sim.in_event = False
            
            # Send signals based on cadence
            # 1s: vibration
            if counter_1s % 1 == 0:
                for sim in simulators:
                    sim.send_1s(args.url, args.token)
            
            # 2s: rotor speed, power, pitch
            if counter_2s % 2 == 0:
                for sim in simulators:
                    sim.send_2s(args.url, args.token)
            
            # 5s: yaw, wind
            if counter_5s % 5 == 0:
                for sim in simulators:
                    sim.send_5s(args.url, args.token)
            
            # 15s: temperatures
            if counter_15s % 15 == 0:
                for sim in simulators:
                    sim.send_15s(args.url, args.token)
            
            # 60s: ambient
            if counter_60s % 60 == 0:
                for sim in simulators:
                    sim.send_60s(args.url, args.token)
            
            # Grid status: check for changes and heartbeat
            grid_changed = False
            for sim in simulators:
                if sim.update_grid_status():
                    grid_changed = True
            
            if grid_changed or counter_grid % 5 == 0:
                for sim in simulators:
                    sim.send_grid_status(args.url, args.token)
            
            # Increment counters
            counter_1s += 1
            counter_2s += 1
            counter_5s += 1
            counter_15s += 1
            counter_60s += 1
            counter_grid += 1
            
            # Sleep to maintain 1s base cadence
            elapsed = time.time() - start_time
            sleep_time = max(0, 1.0 - elapsed)
            time.sleep(sleep_time)
            
    except KeyboardInterrupt:
        print("\nShutting down simulators...")
        sys.exit(0)


if __name__ == "__main__":
    main()


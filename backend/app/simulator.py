import random, asyncio
from datetime import datetime, timedelta
from sqlalchemy import select, desc
from .db.database import SessionLocal
from .db.models import Turbine, Telemetry, Feature, Alert
from .analytics import expected_power, features

SCENARIOS = {"gearbox_degradation", "yaw_misalignment", "generator_overheating", "bearing_degradation", "pitch_imbalance", "grid_event", "sensor_drift", "performance_degradation"}
class Simulator:
    def __init__(self): self.scenarios={"T04":"gearbox_degradation","T03":"yaw_misalignment","T17":"generator_overheating","T22":"bearing_degradation","T25":"bearing_degradation"}; self.clients=[]; self.running=False
    def make(self, turbine, ts, scenario=""):
        seed = int(turbine.id[1:]); r=random.Random(int(ts.timestamp())//60+seed*101)
        wind=max(2.2, min(17, 8.4 + math_sin(ts.timestamp()/900+seed)*2 + r.uniform(-.5,.5)))
        direction=(210+math_sin(ts.timestamp()/1700)*25+r.uniform(-6,6))%360; yaw=2+r.uniform(-2,2)
        eff=.955-(seed%5)*.006; vib=3.5+(seed%4)*.15+r.uniform(-.15,.15); gear=60+(seed%5)+r.uniform(-1,1); gen=68+(seed%6)+r.uniform(-1,1); bearing=55+(seed%5)+r.uniform(-1,1); grid="CONNECTED"
        if scenario=="gearbox_degradation": vib+=2.1; gear+=10; eff-=.13
        elif scenario=="yaw_misalignment": yaw=17; eff-=.075
        elif scenario=="generator_overheating": gen+=16; eff-=.09
        elif scenario=="bearing_degradation": vib+=1.35; bearing+=10; eff-=.06
        elif scenario=="performance_degradation": eff-=.14
        elif scenario=="grid_event": grid="UNSTABLE"; eff=.05
        elif scenario=="sensor_drift": wind+=2.5
        expected=expected_power(wind,turbine.rated_power_kw); power=expected*max(.02,eff*(1-(abs(yaw)/55)**2))
        pitch=max(0, (wind-10)*1.6)
        return Telemetry(turbine_id=turbine.id,timestamp=ts,wind_speed_mps=wind,wind_direction_deg=direction,nacelle_direction_deg=(direction-yaw)%360,rotor_rpm=wind*1.48,generator_rpm=wind*118,power_kw=power,expected_power_kw=expected,pitch_a_deg=pitch,pitch_b_deg=pitch+.1,pitch_c_deg=pitch-.1,vibration_rms_mm_s=vib,gearbox_temperature_c=gear,generator_temperature_c=gen,bearing_temperature_c=bearing,ambient_temperature_c=27+math_sin(ts.timestamp()/2500)*5,humidity_pct=56+r.uniform(-8,8),grid_status=grid,grid_frequency_hz=50+r.uniform(-.07,.07),curtailment_pct=0)
    def persist(self, db, t):
        db.add(t); f=features(t); db.add(Feature(turbine_id=t.turbine_id,timestamp=t.timestamp,**f))
        if f["overall_failure_risk"]>=55:
            component=max(("Gearbox","Generator","Bearing","Yaw"),key=lambda x:f[{"Gearbox":"gearbox_risk","Generator":"generator_risk","Bearing":"bearing_risk","Yaw":"yaw_risk"}[x]])
            # A correlated incident stays open until acknowledged/resolved; do not create
            # a fresh alert for every historical sample or simulator tick.
            recent=db.scalar(select(Alert).where(Alert.turbine_id==t.turbine_id,Alert.status=="OPEN",Alert.component==component).order_by(desc(Alert.timestamp)))
            if not recent:
                db.add(Alert(turbine_id=t.turbine_id,timestamp=t.timestamp,severity="CRITICAL" if f["overall_failure_risk"]>75 else "WARNING",alert_type="Predictive",component=component,title=f"{component} degradation pattern",description=f"Synthetic multivariate anomaly; risk {f['overall_failure_risk']}%.",evidence_json=str(f),risk_score=f["overall_failure_risk"],status="OPEN"))
        return f
    async def tick(self):
        db=SessionLocal(); ts=datetime.utcnow(); payload=[]
        try:
            for turbine in db.scalars(select(Turbine)).all():
                t=self.make(turbine,ts,self.scenarios.get(turbine.id,"")); f=self.persist(db,t); payload.append({"id":turbine.id,"power_kw":round(t.power_kw,1),"health":f["health_score"],"risk":f["overall_failure_risk"]})
            db.commit()
        finally: db.close()
        dead=[]
        for ws in self.clients:
            try: await ws.send_json({"type":"live","timestamp":ts.isoformat(),"turbines":payload})
            except Exception: dead.append(ws)
        for ws in dead: self.clients.remove(ws)
    async def run(self):
        self.running=True
        while self.running: await self.tick(); await asyncio.sleep(1)
    def inject(self,turbine_id,scenario):
        if scenario not in SCENARIOS: raise ValueError("Unknown synthetic scenario")
        self.scenarios[turbine_id]=scenario
simulator=Simulator()
def math_sin(x):
    import math; return math.sin(x)

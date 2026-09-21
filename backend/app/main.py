import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, func, desc, delete
from sqlalchemy.orm import Session
from .db.database import get_db, SessionLocal
from .db.models import Turbine, Telemetry, Feature, Alert, Maintenance
from .db.seed import seed
from .simulator import simulator, SCENARIOS

@asynccontextmanager
async def life(app):
    seed()
    # Collapse duplicated historical open signals into a single current incident per asset/component.
    db=SessionLocal()
    try:
        alerts=db.scalars(select(Alert).where(Alert.status=="OPEN").order_by(Alert.turbine_id,Alert.component,desc(Alert.timestamp))).all(); seen=set()
        for alert in alerts:
            key=(alert.turbine_id,alert.component)
            if key in seen: alert.status="RESOLVED"
            else: seen.add(key)
        db.commit()
    finally: db.close()
    task=asyncio.create_task(simulator.run()); yield; simulator.running=False; task.cancel()
app=FastAPI(title="Wind Asset Intelligence — Synthetic Demo",lifespan=life)
app.add_middleware(CORSMiddleware,allow_origins=["http://localhost:5173"],allow_methods=["*"],allow_headers=["*"])
def latest(db, tid): return db.scalar(select(Telemetry).where(Telemetry.turbine_id==tid).order_by(desc(Telemetry.timestamp)))
def latest_f(db, tid): return db.scalar(select(Feature).where(Feature.turbine_id==tid).order_by(desc(Feature.timestamp)))
def status(f): return "CRITICAL" if f.overall_failure_risk>=75 else "DEGRADED" if f.overall_failure_risk>=55 else "WARNING" if f.overall_failure_risk>=35 else "NORMAL"
def turbine_view(db,t):
    x=latest(db,t.id); f=latest_f(db,t.id)
    return {"id":t.id,"name":t.name,"farm_id":t.farm_id,"model":t.model,"rated_power_kw":t.rated_power_kw,"latitude":t.latitude,"longitude":t.longitude,"status":status(f),"telemetry":{"timestamp":x.timestamp,"power_kw":round(x.power_kw,1),"expected_power_kw":round(x.expected_power_kw,1),"wind_speed_mps":round(x.wind_speed_mps,1),"vibration_rms_mm_s":round(x.vibration_rms_mm_s,1),"gearbox_temperature_c":round(x.gearbox_temperature_c,1),"generator_temperature_c":round(x.generator_temperature_c,1),"bearing_temperature_c":round(x.bearing_temperature_c,1)},"features":{"health_score":f.health_score,"anomaly_score":f.anomaly_score,"overall_failure_risk":f.overall_failure_risk,"gearbox_risk":f.gearbox_risk,"generator_risk":f.generator_risk,"bearing_risk":f.bearing_risk,"yaw_risk":f.yaw_risk,"yaw_error_deg":f.yaw_error_deg,"power_residual_pct":f.power_residual_pct}}
@app.get("/api/fleet/turbines")
def fleet(farm: str|None=None, db:Session=Depends(get_db)):
    q=select(Turbine); q=q.where(Turbine.farm_id==farm) if farm else q
    return [turbine_view(db,t) for t in db.scalars(q).all()]
@app.get("/api/fleet/summary")
def summary(db:Session=Depends(get_db)):
    rows=[turbine_view(db,t) for t in db.scalars(select(Turbine)).all()]; telemetry=[x["telemetry"] for x in rows]; fs=[x["features"] for x in rows]
    alerts=db.scalar(select(func.count()).select_from(Alert).where(Alert.status=="OPEN"))
    return {"turbines":len(rows),"online":sum(t["status"]!="CRITICAL" for t in rows),"current_power_kw":round(sum(x["power_kw"] for x in telemetry),1),"expected_power_kw":round(sum(x["expected_power_kw"] for x in telemetry),1),"availability_pct":round(sum(t["status"]!="CRITICAL" for t in rows)/len(rows)*100,1),"fleet_health":round(sum(x["health_score"] for x in fs)/len(fs),1),"active_alerts":alerts,"critical":sum(t["status"]=="CRITICAL" for t in rows)}
@app.get("/api/turbines/{turbine_id}")
def turbine(turbine_id:str,db:Session=Depends(get_db)):
    t=db.get(Turbine,turbine_id)
    if not t: raise HTTPException(404,"Turbine not found")
    return turbine_view(db,t)
@app.get("/api/turbines/{turbine_id}/history")
def history(turbine_id:str,hours:int=168,db:Session=Depends(get_db)):
    if not db.get(Turbine,turbine_id): raise HTTPException(404,"Turbine not found")
    since=datetime.utcnow()-timedelta(hours=min(hours,720)); rows=db.scalars(select(Telemetry).where(Telemetry.turbine_id==turbine_id,Telemetry.timestamp>=since).order_by(Telemetry.timestamp)).all()
    return [{"timestamp":r.timestamp,"power_kw":r.power_kw,"expected_power_kw":r.expected_power_kw,"wind_speed_mps":r.wind_speed_mps,"vibration":r.vibration_rms_mm_s,"gearbox_temp":r.gearbox_temperature_c} for r in rows]
@app.get("/api/analytics/{turbine_id}")
def analytics(turbine_id:str,db:Session=Depends(get_db)):
    v=turbine(turbine_id,db); x=v["telemetry"]; f=v["features"]
    return {"power_curve":{"wind_speed":x["wind_speed_mps"],"actual_kw":x["power_kw"],"expected_kw":x["expected_power_kw"]},"yaw":{"error_deg":f["yaw_error_deg"],"estimated_loss_pct":round(min(25,f["yaw_error_deg"]**2*.016),1)},"energy_loss_mwh_day":round((x["expected_power_kw"]-x["power_kw"])*24/1000,2),"features":f}
@app.get("/api/alerts")
def alerts(status:str|None=None,db:Session=Depends(get_db)):
    q=select(Alert).order_by(desc(Alert.timestamp)); q=q.where(Alert.status==status) if status else q
    return [{"id":a.id,"turbine_id":a.turbine_id,"timestamp":a.timestamp,"severity":a.severity,"alert_type":a.alert_type,"component":a.component,"title":a.title,"description":a.description,"risk_score":a.risk_score,"status":a.status} for a in db.scalars(q.limit(100)).all()]
@app.post("/api/alerts/{alert_id}/acknowledge")
def acknowledge(alert_id:int,db:Session=Depends(get_db)):
    a=db.get(Alert,alert_id)
    if not a: raise HTTPException(404,"Alert not found")
    a.status="ACKNOWLEDGED";db.commit();return {"ok":True}
@app.get("/api/maintenance/queue")
def maintenance(db:Session=Depends(get_db)):
    rows=sorted([turbine_view(db,t) for t in db.scalars(select(Turbine)).all()],key=lambda x:x["features"]["overall_failure_risk"],reverse=True)[:10]
    return [{"turbine_id":x["id"],"component":max(("gearbox","generator","bearing","yaw"),key=lambda k:x["features"][k+"_risk"]),"risk":x["features"]["overall_failure_risk"],"health":x["features"]["health_score"],"recommended_action":"Inspect lubrication, bearings and alignment during the next maintenance window."} for x in rows]
class Query(BaseModel): question:str
@app.post("/api/copilot/query")
def copilot(q:Query,db:Session=Depends(get_db)):
    items=maintenance(db); target=items[0]; token=next((p.upper() for p in q.question.split() if p.upper().startswith("T") and p[1:].isdigit()),target["turbine_id"])
    v=turbine(token,db) if db.get(Turbine,token) else turbine(target["turbine_id"],db); f=v["features"]; x=v["telemetry"]
    answer=f"{v['id']} is {v['status'].lower()} with health {f['health_score']}/100 and {f['overall_failure_risk']}% overall risk. Primary signal: {max(('gearbox','generator','bearing','yaw'),key=lambda k:f[k+'_risk'])} risk. Evidence: power is {f['power_residual_pct']}% below expected, yaw error is {f['yaw_error_deg']}°, and vibration is {x['vibration_rms_mm_s']} mm/s. Recommended: inspect the affected component and lubrication/alignment at the next safe maintenance window."
    return {"answer":answer,"evidence":v,"source":"Deterministic retrieval over synthetic SQLite telemetry, alerts and maintenance context."}
class Inject(BaseModel): turbine_id:str; scenario:str
@app.post("/api/simulator/inject")
def inject(i:Inject,db:Session=Depends(get_db)):
    if not db.get(Turbine,i.turbine_id): raise HTTPException(404,"Turbine not found")
    if i.scenario not in SCENARIOS: raise HTTPException(422,"Unknown scenario")
    simulator.inject(i.turbine_id,i.scenario);return {"ok":True,"message":f"Injected {i.scenario} for {i.turbine_id}"}
@app.websocket("/ws/live")
async def live(ws:WebSocket):
    await ws.accept(); simulator.clients.append(ws)
    try:
        while True: await ws.receive_text()
    except Exception:
        if ws in simulator.clients: simulator.clients.remove(ws)

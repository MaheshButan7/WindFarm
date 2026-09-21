import argparse
from datetime import datetime, timedelta
from sqlalchemy import select
from .database import Base, engine, SessionLocal
from .models import Turbine, Maintenance
from ..simulator import simulator
def seed(days=30, reset=False):
    if reset: Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine); db=SessionLocal()
    try:
        if db.scalar(select(Turbine).limit(1)): return
        start=datetime.utcnow()-timedelta(days=days)
        for i in range(1,31):
            farm=f"Farm {chr(65+(i-1)//10)}"; rated=2000 if i%3 else 2500
            turbine=Turbine(id=f"T{i:02}",name=f"T{i:02}",farm_id=farm,model=f"WA-{rated/1000:.1f}",rated_power_kw=rated,latitude=19.1+(i-1)//10*.45+(i%10)*.018,longitude=75.2+(i-1)//10*.35+(i%10)*.022,commissioning_date=datetime(2018+i%6,1,1)); db.add(turbine); db.flush()
            for h in range(0,days*24,6):
                ts=start+timedelta(hours=h); t=simulator.make(turbine,ts,simulator.scenarios.get(turbine.id,"")); simulator.persist(db,t)
            if i in (4,17,22): db.add(Maintenance(turbine_id=turbine.id,date=start+timedelta(days=8),component="Gearbox" if i==4 else "Generator",finding="Synthetic elevated condition recorded",action_taken="Inspect lubrication, bearings and alignment",downtime_hours=6.5))
        db.commit()
    finally: db.close()
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--days",type=int,default=30);p.add_argument("--reset",action="store_true");a=p.parse_args();seed(a.days,a.reset);print("Synthetic database seeded")

import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import styles from './Maintenance.module.css';
import { globalSimulator } from '../services/simulator';
import { MaintenanceTask } from '../services/types';

export function Maintenance() {
  const [rows, setRows] = useState<MaintenanceTask[]>([]);

  useEffect(() => {
    const update = () => {
      setRows([...globalSimulator.getMaintenanceQueue()]);
    };
    update();
    const unsubscribe = globalSimulator.subscribe(update);
    return () => { unsubscribe(); };
  }, []);

  return (
    <div className={styles.container}>


      <div className={styles.priorityGrid}>
        {rows.map((x, i) => (
          <Card key={x.turbine_id} className={styles.priorityCard}>
            <div className={styles.cardHeader}>
              <span className={styles.rank}>#{i + 1}</span>
              <Pill variant={x.risk > 75 ? 'critical' : x.risk > 50 ? 'degraded' : 'warning'}>
                {x.risk > 75 ? 'CRITICAL' : x.risk > 50 ? 'DEGRADED' : 'WARNING'}
              </Pill>
            </div>
            
            <h2 className={styles.turbineId}>{x.turbine_id}</h2>
            
            <div className={styles.riskScore}>
              <strong>{Math.round(x.risk)}%</strong>
              <span className="text-tiny">RISK</span>
            </div>

            <div className={styles.details}>
              <span className={styles.componentName}>{x.component}</span>
              <p className={styles.action}>{x.recommended_action}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

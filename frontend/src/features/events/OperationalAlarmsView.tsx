import React, { useState } from 'react';
import { OperationalAlarm } from '../../services/types';
import { Pill } from '../../components/Pill';
import styles from './Events.module.css';

interface Props {
  alarms: OperationalAlarm[];
  onOpenIncident?: (incidentId: string) => void;
}

export function OperationalAlarmsView({ alarms, onOpenIncident }: Props) {
  const [selectedAlarm, setSelectedAlarm] = useState<OperationalAlarm | null>(null);
  
  const filtered = alarms;

  return (
    <div className={styles.pageLayout}>

      <div className={styles.rawTableCard}>
        <table className={styles.rawTable}>
          <thead>
            <tr>
              <th>ALARM IDENTIFIER</th>
              <th>DESCRIPTION</th>
              <th>TURBINE</th>
              <th>COMPONENT</th>
              <th>CATEGORY</th>
              <th>SEVERITY</th>
              <th>STATE</th>
              <th>FIRST DETECTED</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedAlarm(a)}>
                <td><strong>{a.rawName}</strong></td>
                <td>{a.displayName}</td>
                <td><strong>{a.turbineId}</strong></td>
                <td>{a.component}</td>
                <td>{a.category}</td>
                <td><Pill variant={a.severity.toLowerCase() as any}>{a.severity}</Pill></td>
                <td><Pill variant={a.state === 'Active' ? 'warning' : 'neutral'}>{a.state}</Pill></td>
                <td>{new Date(a.firstDetected).toLocaleTimeString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No operational alarms found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedAlarm && (
        <div className={styles.modalOverlay} onClick={() => setSelectedAlarm(null)}>
          <div className={styles.modalPanel} onClick={e => e.stopPropagation()} style={{ padding: '24px', position: 'relative' }}>
            <button className={styles.modalClose} onClick={() => setSelectedAlarm(null)}>×</button>
            <div className={styles.drawerHeader} style={{ padding: 0, border: 'none', paddingBottom: '16px' }}>
              <div>
                <div className="text-tiny text-muted uppercase font-semibold">Operational Alarm</div>
                <h3 className="text-section-heading mt-1">{selectedAlarm.rawName}</h3>
              </div>
            </div>
            
            <div className={styles.drawerBody}>
              <div>
                <div className="text-tiny text-muted uppercase font-semibold">Description</div>
                <div className="text-body mt-1">{selectedAlarm.displayName}</div>
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div>
                  <div className="text-tiny text-muted uppercase font-semibold">Turbine</div>
                  <div className="text-body mt-1 font-semibold">{selectedAlarm.turbineId}</div>
                </div>
                <div>
                  <div className="text-tiny text-muted uppercase font-semibold">Component</div>
                  <div className="text-body mt-1">{selectedAlarm.component}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '24px' }}>
                <div>
                  <div className="text-tiny text-muted uppercase font-semibold">Severity</div>
                  <div className="mt-1"><Pill variant={selectedAlarm.severity.toLowerCase() as any}>{selectedAlarm.severity}</Pill></div>
                </div>
                <div>
                  <div className="text-tiny text-muted uppercase font-semibold">Current State</div>
                  <div className="mt-1"><Pill variant={selectedAlarm.state === 'Active' ? 'warning' : 'neutral'}>{selectedAlarm.state}</Pill></div>
                </div>
              </div>
              <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '8px 0' }} />
              <div>
                <div className="text-tiny text-muted uppercase font-semibold mb-2">Occurrence</div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <div>First detected</div>
                  <div style={{ color: 'var(--text-primary)' }}>{new Date(selectedAlarm.firstDetected).toLocaleString()}</div>
                  <div>Last seen</div>
                  <div style={{ color: 'var(--text-primary)' }}>{new Date(selectedAlarm.lastSeen).toLocaleString()}</div>
                  <div>Occurrences</div>
                  <div style={{ color: 'var(--text-primary)' }}>{selectedAlarm.occurrences}</div>
                </div>
              </div>
              <div>
                <div className="text-tiny text-muted uppercase font-semibold">Source</div>
                <div className="text-body mt-1">{selectedAlarm.source}</div>
              </div>
              
              {selectedAlarm.parentIncidentId && (
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', borderLeft: '3px solid var(--brand-primary)', cursor: 'pointer' }}
                     onClick={() => {
                       if (onOpenIncident) {
                         onOpenIncident(selectedAlarm.parentIncidentId!);
                       }
                     }}>
                  <div className="text-tiny uppercase font-semibold" style={{ color: 'var(--brand-primary)' }}>Parent Incident</div>
                  <div className="text-body font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{selectedAlarm.turbineId} — System Anomaly</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Click to view correlated intelligence</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

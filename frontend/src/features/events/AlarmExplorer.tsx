import React, { useState } from 'react';
import { AlarmDefinition } from '../../services/types';
import { Pill } from '../../components/Pill';
import styles from './Events.module.css';

interface Props {
  catalogue: AlarmDefinition[];
}

export function AlarmExplorer({ catalogue }: Props) {
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmDefinition | null>(null);
  const filtered = catalogue;

  return (
    <div className={styles.pageLayout}>

      <div className={styles.rawTableCard}>
        <table className={styles.rawTable}>
          <thead>
            <tr>
              <th>ALARM IDENTIFIER</th>
              <th>DESCRIPTION</th>
              <th>CATEGORY</th>
              <th>COMPONENT</th>
              <th>SEVERITY</th>
              <th>ACTION</th>
              <th>INDEX</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedAlarm(a)}>
                <td><strong>{a.rawName}</strong></td>
                <td>{a.displayName}</td>
                <td>{a.category}</td>
                <td>{a.component}</td>
                <td><Pill variant={a.severity.toLowerCase() as any}>{a.severity}</Pill></td>
                <td>{a.action}</td>
                <td>{a.index}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedAlarm && (
        <div className={styles.modalOverlay} onClick={() => setSelectedAlarm(null)}>
          <div className={styles.modalPanel} onClick={e => e.stopPropagation()} style={{ width: '560px', position: 'relative' }}>
            <button className={styles.modalClose} onClick={() => setSelectedAlarm(null)}>×</button>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
              <div className="text-tiny text-muted uppercase font-semibold" style={{ letterSpacing: '0.05em' }}>{selectedAlarm.category} ALARM</div>
              <h3 className="text-section-heading mt-1" style={{ fontSize: '20px' }}>{selectedAlarm.rawName}</h3>
            </div>
            
            <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
              <div>
                <div className="text-tiny text-muted uppercase font-semibold" style={{ letterSpacing: '0.05em', marginBottom: '4px' }}>Display Name</div>
                <div className="text-body">{selectedAlarm.displayName}</div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <div className="text-tiny text-muted uppercase font-semibold" style={{ letterSpacing: '0.05em', marginBottom: '4px' }}>Component</div>
                  <div className="text-body font-semibold">{selectedAlarm.component}</div>
                </div>
                <div>
                  <div className="text-tiny text-muted uppercase font-semibold" style={{ letterSpacing: '0.05em', marginBottom: '6px' }}>Severity</div>
                  <div><Pill variant={selectedAlarm.severity.toLowerCase() as any}>{selectedAlarm.severity}</Pill></div>
                </div>
                
                <div>
                  <div className="text-tiny text-muted uppercase font-semibold" style={{ letterSpacing: '0.05em', marginBottom: '4px' }}>Controller Action</div>
                  <div className="text-body">{selectedAlarm.action}</div>
                </div>
                <div>
                  <div className="text-tiny text-muted uppercase font-semibold" style={{ letterSpacing: '0.05em', marginBottom: '4px' }}>Status</div>
                  <div className="text-body">{selectedAlarm.enabled ? 'Enabled' : 'Disabled'}</div>
                </div>
              </div>
              
              <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '0' }} />
              
              <div>
                <div className="text-tiny text-muted uppercase font-semibold" style={{ letterSpacing: '0.05em', marginBottom: '4px' }}>Description</div>
                <div className="text-body">{selectedAlarm.description}</div>
              </div>
              
              <div>
                <div className="text-tiny text-muted uppercase font-semibold mb-2" style={{ letterSpacing: '0.05em' }}>Related Parameters</div>
                <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0, fontSize: '13px', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>{selectedAlarm.component} Temperature</li>
                  <li>Power Output</li>
                  {selectedAlarm.component === 'Gearbox' && <li>Vibration RMS</li>}
                  {selectedAlarm.component === 'Generator' && <li>Coolant Flow</li>}
                  {selectedAlarm.category === 'Yaw' && <li>Wind Direction</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

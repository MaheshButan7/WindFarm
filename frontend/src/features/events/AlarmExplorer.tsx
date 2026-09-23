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
        <>
          <div className={styles.modalOverlay} onClick={() => setSelectedAlarm(null)}>
            <div className={styles.modalPanel} onClick={e => e.stopPropagation()} style={{ padding: '24px', position: 'relative' }}>
              <button className={styles.modalClose} onClick={() => setSelectedAlarm(null)}>×</button>
              <div className={styles.drawerHeader} style={{ padding: 0, border: 'none', paddingBottom: '16px' }}>
                <div>
                  <div className="text-tiny text-muted uppercase font-semibold">{selectedAlarm.category} ALARM</div>
                  <h3 className="text-section-heading mt-1">{selectedAlarm.rawName}</h3>
                </div>
              </div>
              <div className={styles.drawerBody}>
                <div>
                  <div className="text-tiny text-muted uppercase font-semibold">Display Name</div>
                  <div className="text-body mt-1">{selectedAlarm.displayName}</div>
                </div>
                <div>
                  <div className="text-tiny text-muted uppercase font-semibold">Component</div>
                  <div className="text-body mt-1">{selectedAlarm.component}</div>
                </div>
                <div>
                  <div className="text-tiny text-muted uppercase font-semibold">Severity</div>
                  <div className="mt-1"><Pill variant={selectedAlarm.severity.toLowerCase() as any}>{selectedAlarm.severity}</Pill></div>
                </div>
                <div>
                  <div className="text-tiny text-muted uppercase font-semibold">Controller Action</div>
                  <div className="text-body mt-1">{selectedAlarm.action}</div>
                </div>
                <div>
                  <div className="text-tiny text-muted uppercase font-semibold">Description</div>
                  <div className="text-body mt-1">{selectedAlarm.description}</div>
                </div>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div>
                    <div className="text-tiny text-muted uppercase font-semibold">Index</div>
                    <div className="text-body mt-1">{selectedAlarm.index}</div>
                  </div>
                  <div>
                    <div className="text-tiny text-muted uppercase font-semibold">Status</div>
                    <div className="text-body mt-1">{selectedAlarm.enabled ? 'Enabled' : 'Disabled'}</div>
                  </div>
                </div>
                <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '8px 0' }} />
                <div>
                  <div className="text-tiny text-muted uppercase font-semibold mb-2">Related Parameters</div>
                  <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0, fontSize: '13px', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
        </>
      )}
    </div>
  );
}

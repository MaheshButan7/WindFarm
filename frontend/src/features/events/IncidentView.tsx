import React, { useState } from 'react';
import { IntelligentIncident, OperationalAlarm } from '../../services/types';
import { Pill } from '../../components/Pill';
import { OperationalAlarmsView } from './OperationalAlarmsView';
import styles from './Events.module.css';

interface Props {
  incidents: IntelligentIncident[];
  operationalAlarms: OperationalAlarm[];
  onStatusChange: (id: string, status: 'OPEN' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED') => void;
  onOpenTurbine: (turbineId: string) => void;
  onAskIntelligence: (incident: IntelligentIncident) => void;
  onViewAnalytics: (turbineId: string) => void;
}

export function IncidentView({ incidents, operationalAlarms, onStatusChange, onOpenTurbine, onAskIntelligence, onViewAnalytics }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [drilldownAlarmId, setDrilldownAlarmId] = useState<string | null>(null);

  const selected = incidents.find(i => i.id === selectedId) || null;

  // Handle outside click for menus (simplified for POC)
  const handleMenuClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  const handleAction = (id: string, action: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMenuOpenId(null);
    const incident = incidents.find(i => i.id === id);
    if (!incident) return;

    switch (action) {
      case 'Open Event':
        setSelectedId(id);
        break;
      case 'Open Turbine':
        onOpenTurbine(incident.turbineId);
        break;
      case 'View Analytics':
        onViewAnalytics(incident.turbineId);
        break;
      case 'Ask Intelligence':
        onAskIntelligence(incident);
        break;
      case 'Acknowledge':
        onStatusChange(id, 'ACKNOWLEDGED');
        break;
      case 'Start Investigation':
        onStatusChange(id, 'INVESTIGATING');
        break;
      case 'Resolve':
        onStatusChange(id, 'RESOLVED');
        break;
      case 'Dismiss':
        onStatusChange(id, 'DISMISSED');
        break;
      case 'Reopen':
        onStatusChange(id, 'OPEN');
        break;
    }
  };

  return (
    <div className={styles.incidentsLayout}>
      {/* LEFT: Incident List */}
      <div className={styles.listPanel}>
        {incidents.map(inc => (
          <div 
            key={inc.id} 
            className={`${styles.eventRow} ${selectedId === inc.id ? styles.selected : ''}`}
            onClick={() => setSelectedId(inc.id)}
            style={selectedId === inc.id ? { borderLeft: '4px solid var(--brand-primary)' } : {}}
            onMouseLeave={() => setMenuOpenId(null)}
          >
            <div className={styles.rowCol}>
              <span className={styles.rowLabel}>Time</span>
              <span className={styles.rowValue}>{new Date(inc.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className={styles.rowCol}>
              <span className={styles.rowLabel}>Asset</span>
              <span className={styles.rowValue}>{inc.turbineId}</span>
            </div>
            <div className={styles.rowCol}>
              <span className={styles.rowLabel}>Component</span>
              <span className={styles.rowValue}>{inc.component}</span>
            </div>
            <div className={styles.rowCol}>
              <span className={styles.rowLabel}>Event</span>
              <span className={styles.rowTitle}>{inc.title}</span>
              <span className={styles.rowSubtitle}>
                {inc.relatedAlarmIds.length} related alarm{inc.relatedAlarmIds.length !== 1 ? 's' : ''} · {inc.evidence.length} signals · {inc.impact ? inc.impact.performanceDeviationPct.toFixed(1) + '% prod impact' : ''}
              </span>
            </div>
            <div className={styles.rowCol}>
              <span className={styles.rowLabel}>Severity</span>
              <span><Pill variant={inc.severity.toLowerCase() as any}>{inc.severity}</Pill></span>
            </div>
            <div className={styles.rowCol}>
              <span className={styles.rowLabel}>Risk</span>
              <span className={styles.rowValue} style={{ color: inc.risk > 80 ? 'var(--status-critical)' : 'inherit' }}>
                {Math.round(inc.risk)}%
              </span>
            </div>
            <div className={styles.rowCol}>
              <span className={styles.rowLabel}>Status</span>
              <span><Pill variant={inc.status === 'OPEN' ? 'warning' : inc.status === 'INVESTIGATING' ? 'info' : 'neutral'}>{inc.status}</Pill></span>
            </div>
            
            {/* Context Menu Icon */}
            <div className={styles.actionMenu} onClick={(e) => handleMenuClick(e, inc.id)}>
              ⋮
            </div>

            {/* Dropdown Menu */}
            {menuOpenId === inc.id && (
              <div className={styles.contextMenu} onClick={e => e.stopPropagation()}>
                <button className={styles.menuItem} onClick={() => handleAction(inc.id, 'Open Event')}>Open Event</button>
                <button className={styles.menuItem} onClick={() => handleAction(inc.id, 'Open Turbine')}>Open Turbine</button>
                <button className={styles.menuItem} onClick={() => handleAction(inc.id, 'View Analytics')}>View Analytics</button>
                <button className={styles.menuItem} onClick={() => handleAction(inc.id, 'Ask Intelligence')}>Ask Intelligence</button>
                <div className={styles.menuDivider}></div>
                
                {inc.status === 'OPEN' && <button className={styles.menuItem} onClick={() => handleAction(inc.id, 'Acknowledge')}>Acknowledge</button>}
                {inc.status === 'ACKNOWLEDGED' && <button className={styles.menuItem} onClick={() => handleAction(inc.id, 'Start Investigation')}>Start Investigation</button>}
                {(inc.status === 'ACKNOWLEDGED' || inc.status === 'INVESTIGATING' || inc.status === 'OPEN') && <button className={styles.menuItem} onClick={() => handleAction(inc.id, 'Resolve')}>Resolve</button>}
                {inc.status === 'RESOLVED' && <button className={styles.menuItem} onClick={() => handleAction(inc.id, 'Reopen')}>Reopen</button>}
                <div className={styles.menuDivider}></div>
                <button className={styles.menuItem} style={{ color: 'var(--status-critical)' }} onClick={() => handleAction(inc.id, 'Dismiss')}>Dismiss</button>
              </div>
            )}
          </div>
        ))}
        {incidents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            No events match the selected filters.
          </div>
        )}
      </div>

      {/* RIGHT: Detail Panel Modal */}
      {selected && (
        <div className={styles.modalOverlay} onClick={() => setSelectedId(null)}>
          <div className={styles.modalPanel} onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
            <button className={styles.modalClose} onClick={() => setSelectedId(null)}>×</button>
            <div className={styles.detailsPanel} style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
          <div className={styles.detailHeader}>
            <div className={styles.detailMeta} style={{ marginBottom: '8px' }}>
              <span className="text-muted font-semibold uppercase text-tiny">Event Investigation</span>
            </div>
            <h2 className={styles.detailTitle}>{selected.turbineId} — {selected.title}</h2>
            
            <div style={{ display: 'flex', gap: '24px', marginTop: '16px', flexWrap: 'wrap' }}>
              <div>
                <div className="text-tiny text-muted uppercase font-semibold">Severity</div>
                <div className="mt-1 font-semibold" style={{ color: selected.severity === 'CRITICAL' ? 'var(--status-critical)' : 'inherit' }}>{selected.severity}</div>
              </div>
              <div>
                <div className="text-tiny text-muted uppercase font-semibold">Risk</div>
                <div className="mt-1 font-semibold" style={{ color: selected.risk > 80 ? 'var(--status-critical)' : 'inherit' }}>{Math.round(selected.risk)}%</div>
              </div>
              <div>
                <div className="text-tiny text-muted uppercase font-semibold">Priority</div>
                <div className="mt-1 font-semibold">{selected.priority}</div>
              </div>
              <div>
                <div className="text-tiny text-muted uppercase font-semibold">Status</div>
                <div className="mt-1 font-semibold">{selected.status}</div>
              </div>
              <div>
                <div className="text-tiny text-muted uppercase font-semibold">Assignee</div>
                <div className="mt-1 font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--brand-primary)', display: 'inline-block' }}></div>
                  {selected.assignee || 'Unassigned'}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.detailBody}>
            {/* WHY THIS EVENT */}
            <div className={styles.detailSection}>
              <h3>Why This Event?</h3>
              <div style={{ padding: '0 8px' }}>
                <ul style={{ paddingLeft: '20px', margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                  {selected.whyThisEvent.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* EVIDENCE */}
            <div className={styles.detailSection}>
              <h3>Evidence</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 8px' }}>
                {selected.evidence.map((e, idx) => {
                  const maxVal = Math.max(e.currentValue, e.baselineValue) * 1.2;
                  const curPct = (e.currentValue / maxVal) * 100;
                  const basePct = (e.baselineValue / maxVal) * 100;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{e.parameter}</span>
                        <span style={{ fontWeight: 600, color: e.trend === 'up' ? 'var(--status-critical)' : 'var(--status-warning)' }}>
                          {e.trend === 'up' ? '↑' : '↓'} {Math.abs(e.deviationPct)}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <div style={{ width: '60px' }}>Current</div>
                        <div style={{ flex: 1, height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${curPct}%`, background: 'var(--text-primary)' }} />
                        </div>
                        <div style={{ width: '60px', textAlign: 'right', fontWeight: 500 }}>{e.currentValue} {e.unit}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <div style={{ width: '60px' }}>Baseline</div>
                        <div style={{ flex: 1, height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${basePct}%`, background: 'var(--text-muted)' }} />
                        </div>
                        <div style={{ width: '60px', textAlign: 'right' }}>{e.baselineValue} {e.unit}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CONTRIBUTING SIGNALS */}
            <div className={styles.detailSection}>
              <h3>Contributing Signals</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 8px' }}>
                {selected.contributingSignals.map((sig, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px' }}>
                    <div style={{ width: '130px', color: 'var(--text-secondary)' }}>{sig.name}</div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ height: '6px', width: `${sig.score}%`, background: sig.contribution === 'High' ? 'var(--status-critical)' : sig.contribution === 'Medium' ? 'var(--status-warning)' : 'var(--status-info)', borderRadius: '3px' }} />
                    </div>
                    <div style={{ width: '50px', textAlign: 'right', fontWeight: 500, color: 'var(--text-primary)' }}>{sig.contribution}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RELATED ALARMS */}
            <div className={styles.detailSection}>
              <h3>Related Alarms</h3>
              <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selected.relatedAlarmIds.map(rawName => (
                  <div 
                    key={rawName} 
                    style={{ 
                      color: 'var(--text-primary)', 
                      fontSize: '14px', 
                      background: 'var(--bg-primary)', 
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      border: '1px solid var(--border)'
                    }}
                    onClick={() => {
                      const alarm = operationalAlarms.find(a => a.turbineId === selected.turbineId && a.rawName === rawName);
                      if (alarm) setDrilldownAlarmId(alarm.id);
                    }}
                  >
                    {rawName}
                  </div>
                ))}
              </div>
            </div>

            {/* TIMELINE */}
            <div className={styles.detailSection}>
              <h3>Timeline</h3>
              <div className={styles.timeline}>
                {selected.timeline.map((tl, i) => (
                  <div key={i} className={`${styles.timelineItem} ${tl.isImportant ? styles.important : ''}`}>
                    <span className={styles.tlTime}>{new Date(tl.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>{tl.message}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* IMPACT */}
            {selected.impact && (
              <div className={styles.detailSection}>
                <h3>Impact <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'normal', textTransform: 'none', marginLeft: '8px' }}>(Estimated)</span></h3>
                <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Lost Power</span>
                    <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>{Math.round(selected.impact.currentLostPowerKw)} kW</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Estimated Daily Loss</span>
                    <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>{selected.impact.estimatedDailyLossMwh.toFixed(1)} MWh</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Performance Deviation</span>
                    <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--status-warning)' }}>{selected.impact.performanceDeviationPct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* AI ASSESSMENT */}
            <div className={styles.detailSection}>
              <h3>AI Assessment</h3>
              <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px', borderLeft: '3px solid var(--status-info)' }}>
                <div className="text-body" style={{ color: 'var(--text-primary)' }}>{selected.assessment}</div>
                <div className="mt-2 text-tiny font-semibold" style={{ color: 'var(--text-muted)' }}>Confidence: {selected.confidence}%</div>
              </div>
            </div>

            {/* RECOMMENDED CHECKS */}
            {selected.recommendedChecks && (
              <div className={styles.detailSection}>
                <h3>Recommended Checks</h3>
                <div style={{ padding: '0 8px' }}>
                  <ul style={{ listStyleType: 'none', padding: 0, margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {selected.recommendedChecks.map((check, idx) => (
                      <li key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="checkbox" disabled style={{ width: '16px', height: '16px' }} />
                        {check}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ACTIVITY */}
            <div className={styles.detailSection}>
              <h3>Activity</h3>
              <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                {selected.activity.map((act, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ color: 'var(--text-muted)' }}>{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div style={{ color: 'var(--text-primary)' }}>{act.message}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className={styles.detailFooter}>
            <button className={styles.btnSecondary} onClick={() => onOpenTurbine(selected.turbineId)}>Open Turbine</button>
            <button className={styles.btnSecondary} onClick={() => onViewAnalytics(selected.turbineId)}>View Analytics</button>
            <button className={styles.btnSecondary} onClick={() => onAskIntelligence(selected)}>Ask Intelligence</button>
            
            {/* State Machine Actions */}
            <div style={{ flex: 1 }}></div>
            {selected.status === 'OPEN' && (
              <button className={styles.btnPrimary} onClick={() => handleAction(selected.id, 'Acknowledge')}>Acknowledge</button>
            )}
            {selected.status === 'ACKNOWLEDGED' && (
              <button className={styles.btnPrimary} onClick={() => handleAction(selected.id, 'Start Investigation')}>Start Investigation</button>
            )}
            {selected.status === 'INVESTIGATING' && (
              <button className={styles.btnPrimary} onClick={() => handleAction(selected.id, 'Resolve')}>Resolve</button>
            )}
            {selected.status === 'RESOLVED' && (
              <button className={styles.btnSecondary} onClick={() => handleAction(selected.id, 'Reopen')}>Reopen</button>
            )}
          </div>
        </div>
        </div>
        </div>
      )}

      {/* Drilldown Drawer for Operational Alarms */}
      {drilldownAlarmId && (
        <div className={styles.drawerOverlay} onClick={() => setDrilldownAlarmId(null)} style={{ zIndex: 1100 }}>
          <div className={styles.drawer} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setDrilldownAlarmId(null)}>
                <span>← Back to Incident</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {selected?.turbineId} <span style={{ opacity: 0.5 }}>/</span> Incident <span style={{ opacity: 0.5 }}>/</span> Operational Alarm
              </div>
              <h3 className="text-section-heading mt-1">
                {operationalAlarms.find(a => a.id === drilldownAlarmId)?.rawName}
              </h3>
            </div>
            
            {/* Render the inner content by reusing OperationalAlarmsView logic but rendering it locally here to avoid prop drilling complexity for just the drawer contents */}
            <div className={styles.drawerBody}>
              {(() => {
                const alarm = operationalAlarms.find(a => a.id === drilldownAlarmId);
                if (!alarm) return null;
                return (
                  <>
                    <div>
                      <div className="text-tiny text-muted uppercase font-semibold">Description</div>
                      <div className="text-body mt-1">{alarm.displayName}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '24px' }}>
                      <div>
                        <div className="text-tiny text-muted uppercase font-semibold">Turbine</div>
                        <div className="text-body mt-1 font-semibold">{alarm.turbineId}</div>
                      </div>
                      <div>
                        <div className="text-tiny text-muted uppercase font-semibold">Component</div>
                        <div className="text-body mt-1">{alarm.component}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '24px' }}>
                      <div>
                        <div className="text-tiny text-muted uppercase font-semibold">Severity</div>
                        <div className="mt-1"><Pill variant={alarm.severity.toLowerCase() as any}>{alarm.severity}</Pill></div>
                      </div>
                      <div>
                        <div className="text-tiny text-muted uppercase font-semibold">Current State</div>
                        <div className="mt-1"><Pill variant={alarm.state === 'Active' ? 'warning' : 'neutral'}>{alarm.state}</Pill></div>
                      </div>
                    </div>
                    <hr style={{ border: 'none', borderBottom: '1px solid var(--border)', margin: '8px 0' }} />
                    <div>
                      <div className="text-tiny text-muted uppercase font-semibold mb-2">Occurrence</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <div>First detected</div>
                        <div style={{ color: 'var(--text-primary)' }}>{new Date(alarm.firstDetected).toLocaleString()}</div>
                        <div>Last seen</div>
                        <div style={{ color: 'var(--text-primary)' }}>{new Date(alarm.lastSeen).toLocaleString()}</div>
                        <div>Occurrences</div>
                        <div style={{ color: 'var(--text-primary)' }}>{alarm.occurrences}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-tiny text-muted uppercase font-semibold">Source</div>
                      <div className="text-body mt-1">{alarm.source}</div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

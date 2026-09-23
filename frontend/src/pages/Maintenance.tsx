import React, { useEffect, useState } from 'react';
import styles from './Maintenance.module.css';
import { globalSimulator } from '../services/simulator';
import { WorkOrder, IntelligentIncident } from '../services/types';
import { Clock, MapPin, Wrench, Filter } from 'lucide-react';

export function Maintenance() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [activeView, setActiveView] = useState<string>('Pending');
  const [severityFilter, setSeverityFilter] = useState<string>('All');
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [componentFilter, setComponentFilter] = useState('All Components');
  const [assigneeFilter, setAssigneeFilter] = useState('All Assignees');

  useEffect(() => {
    const update = () => {
      setWorkOrders([...globalSimulator.getWorkOrders()]);
    };
    update(); // initial load
    const unsubscribe = globalSimulator.subscribe(update);
    return () => { unsubscribe(); };
  }, []);

  const columns = [
    { id: 'Pending', label: 'Pending Approval' },
    { id: 'Scheduled', label: 'Scheduled' },
    { id: 'In Progress', label: 'In Progress' },
    { id: 'Completed', label: 'Completed' }
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'UN';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getPriorityClass = (priority: string) => {
    if (priority === 'High') return styles.priorityHigh;
    if (priority === 'Medium') return styles.priorityMedium;
    return styles.priorityLow;
  };

  const handleCardClick = (wo: WorkOrder) => {
    setSelectedWO(wo);
  };

  const renderCard = (wo: WorkOrder) => (
    <div key={wo.id} className={styles.woCard} onClick={() => handleCardClick(wo)}>
      <div className={styles.woHeader}>
        <span className={styles.woId}>{wo.id}</span>
        <span className={`${styles.priorityBadge} ${getPriorityClass(wo.priority)}`}>
          {wo.priority}
        </span>
      </div>
      
      <div className={styles.woTitle}>{wo.title}</div>
      
      <div className={styles.woMeta}>
        <div className={styles.metaItem}>
          <MapPin size={12} /> {wo.turbine_id}
        </div>
        <div className={styles.metaItem}>
          <Wrench size={12} /> {wo.component}
        </div>
      </div>

      <div className={styles.assigneeRow}>
        <div className={styles.assignee}>
          <div className={styles.avatar}>
            {getInitials(wo.assignee)}
          </div>
          <span className={styles.assigneeName}>{wo.assignee || 'Unassigned'}</span>
        </div>
        {wo.scheduled_date && (
          <div className={styles.scheduledDate} title="Scheduled Date">
            <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            {new Date(wo.scheduled_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  );

  const filteredOrders = workOrders.filter(wo => {
    if (activeView !== 'All' && wo.status !== activeView) return false;
    if (severityFilter !== 'All' && wo.priority !== severityFilter) return false;
    if (componentFilter !== 'All Components' && wo.component !== componentFilter) return false;
    if (assigneeFilter !== 'All Assignees' && wo.assignee !== assigneeFilter && (assigneeFilter !== 'Unassigned' || wo.assignee)) return false;
    return true;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header} style={{ borderBottom: 'none', paddingBottom: 0, alignItems: 'center' }}>
        <div className={styles.viewToggle}>
          {columns.map(col => (
            <button 
              key={col.id}
              className={`${styles.viewBtn} ${activeView === col.id ? styles.active : ''}`}
              onClick={() => setActiveView(col.id)}
            >
              {col.label}
              <span className={styles.countBadge}>
                {workOrders.filter(wo => wo.status === col.id).length}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {/* Severity Buttons */}
          <div className={styles.severityTabs} style={{ borderBottom: 'none', paddingBottom: 0, margin: 0, gap: '6px' }}>
            {['All', 'High', 'Medium', 'Low'].map(sev => (
              <div 
                key={sev} 
                className={`${styles.sevTab} ${severityFilter === sev ? styles.active : ''}`}
                onClick={() => setSeverityFilter(sev)}
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                <span>{sev}</span>
                <span className={styles.sevCount} style={{ 
                  background: sev === 'All' ? 'var(--bg-secondary)' : 
                              sev === 'High' ? 'var(--status-critical)' : 
                              sev === 'Medium' ? 'var(--status-warning)' : 'var(--status-healthy)',
                  color: (sev === 'All') ? 'var(--text-primary)' : '#fff'
                }}>
                  {sev === 'All' ? workOrders.length : workOrders.filter(wo => wo.priority === sev).length}
                </span>
              </div>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            <button className={styles.btnSecondary} onClick={() => setIsFilterOpen(!isFilterOpen)}>
              <Filter size={16} />
              Filter
            </button>
            {isFilterOpen && (
              <div className={styles.filterPopover}>
                <div className={styles.filterPopoverHeader}>
                  Filters
                  <button className="btn-icon" onClick={() => setIsFilterOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
                </div>
                <div className={styles.filterPopoverBody}>
                  <div className={styles.filterGroup}>
                    <label>Component</label>
                    <select className={styles.filterSelect} value={componentFilter} onChange={e => setComponentFilter(e.target.value)}>
                      <option>All Components</option>
                      <option>Gearbox</option>
                      <option>Generator</option>
                      <option>Yaw System</option>
                      <option>Pitch System</option>
                      <option>Rotor Blades</option>
                      <option>Hydraulics</option>
                    </select>
                  </div>
                  <div className={styles.filterGroup}>
                    <label>Assignee</label>
                    <select className={styles.filterSelect} value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}>
                      <option>All Assignees</option>
                      <option>Operations</option>
                      <option>Mechanical Team</option>
                      <option>Electrical Team</option>
                      <option>Blade Specialists</option>
                      <option>Tech Team Alpha</option>
                      <option>Unassigned</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--surface)', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
                  <button className={styles.btnSecondary} style={{ flex: 1, padding: '8px 0', justifyContent: 'center' }} onClick={() => { setComponentFilter('All Components'); setAssigneeFilter('All Assignees'); setIsFilterOpen(false); }}>Reset Filters</button>
                  <button className={styles.btnPrimary} style={{ flex: 1, padding: '8px 0', justifyContent: 'center' }} onClick={() => setIsFilterOpen(false)}>Apply</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {filteredOrders.length > 0 ? (
          filteredOrders.map(renderCard)
        ) : (
          <div className="text-muted" style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1' }}>
            No work orders found in this status.
          </div>
        )}
      </div>

      {/* MODAL FOR WORK ORDER DETAILS */}
      {selectedWO && (() => {
        const isPredictive = selectedWO.id.startsWith('WO-P-');
        const incident = isPredictive ? globalSimulator.getIncidents().find(i => i.turbineId === selectedWO.turbine_id && i.status === 'OPEN') : null;

        return (
          <div className={styles.modalOverlay} onClick={() => setSelectedWO(null)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2 className="text-section-heading">
                  {isPredictive ? `Detailed AI Analysis: ${selectedWO.turbine_id}` : `Routine Maintenance: ${selectedWO.turbine_id}`}
                </h2>
                <button className={styles.closeBtn} onClick={() => setSelectedWO(null)}>&times;</button>
              </div>
              <div className={styles.modalContent}>
                <p style={{ marginBottom: '16px' }}><strong>Component:</strong> {selectedWO.component}</p>
                
                {incident ? (
                  <>
                    <div className={styles.insightBlock}>
                      <h4>AI Assessment</h4>
                      <p>{incident.assessment}</p>
                      <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>{incident.whyThisEvent?.join(' ')}</p>
                    </div>

                    <div className={styles.insightBlock}>
                      <h4>System Impact & Production</h4>
                      <ul style={{ listStyle: 'disc', paddingLeft: '20px', marginTop: '8px' }}>
                        <li><strong>Current Power Loss:</strong> {incident.impact?.currentLostPowerKw?.toFixed(0)} kW</li>
                        <li><strong>Estimated Daily Loss:</strong> {incident.impact?.estimatedDailyLossMwh?.toFixed(1)} MWh</li>
                        <li><strong>Performance Deviation:</strong> {incident.impact?.performanceDeviationPct?.toFixed(1)}%</li>
                      </ul>
                    </div>

                    <div className={styles.insightBlock}>
                      <h4>Supporting Evidence</h4>
                      <table className={styles.table} style={{ marginTop: '8px' }}>
                        <thead>
                          <tr>
                            <th>Parameter</th>
                            <th>Current</th>
                            <th>Baseline</th>
                            <th>Deviation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {incident.evidence?.map((e: any, i: number) => (
                            <tr key={i}>
                              <td>{e.parameter}</td>
                              <td>{e.currentValue} {e.unit}</td>
                              <td>{e.baselineValue} {e.unit}</td>
                              <td style={{ color: e.trend === 'up' ? 'var(--status-critical)' : 'var(--status-warning)' }}>
                                {e.trend === 'up' ? '▲' : '▼'} {Math.abs(e.deviationPct)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className={styles.insightBlock} style={{ borderLeftColor: 'var(--status-healthy)' }}>
                      <h4>Recommended Checks</h4>
                      <ul style={{ paddingLeft: '20px' }}>
                        {incident.recommendedChecks?.map((c: string, i: number) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.insightBlock}>
                      <h4>Task Details</h4>
                      <p>{selectedWO.title}</p>
                    </div>
                    <div className={styles.insightBlock} style={{ borderLeftColor: 'var(--status-healthy)' }}>
                      <h4>Scheduling Information</h4>
                      <p><strong>Assignee:</strong> {selectedWO.assignee || 'Unassigned'}</p>
                      <p><strong>Scheduled Date:</strong> {selectedWO.scheduled_date ? new Date(selectedWO.scheduled_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'}</p>
                      <p><strong>Priority:</strong> {selectedWO.priority}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

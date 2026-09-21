import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import { globalSimulator } from '../services/simulator';
import { Alert } from '../services/types';
import styles from './Alerts.module.css';
import { X } from 'lucide-react';

export function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set(['Active', 'Acknowledged']));
  const [severityFilter, setSeverityFilter] = useState<Set<string>>(new Set(['Critical', 'High', 'Medium', 'Low', 'Info']));
  const [turbineSearch, setTurbineSearch] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const update = () => {
      setAlerts([...globalSimulator.getAlerts()]);
    };
    update();
    const unsubscribe = globalSimulator.subscribe(update);
    return () => { unsubscribe(); };
  }, []);

  const handleAcknowledge = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    globalSimulator.acknowledgeAlert(id);
    if (selectedAlert && selectedAlert.id === id) {
      setSelectedAlert({ ...selectedAlert, status: 'ACKNOWLEDGED' });
    }
  };

  const toggleSet = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setter(next);
  };

  const resetFilters = () => {
    setStatusFilter(new Set(['Active', 'Acknowledged']));
    setSeverityFilter(new Set(['Critical', 'High', 'Medium', 'Low', 'Info']));
    setTurbineSearch('');
  };

  const filteredAlerts = alerts.filter(a => {
    const uiStatus = a.status === 'OPEN' ? 'Active' : 'Acknowledged';
    if (!statusFilter.has(uiStatus)) return false;

    const uiSeverity = a.severity.charAt(0) + a.severity.slice(1).toLowerCase();
    if (!severityFilter.has(uiSeverity)) return false;

    if (turbineSearch && !a.turbine_id.toLowerCase().includes(turbineSearch.toLowerCase())) return false;

    return true;
  });

  return (
    <div className={styles.pageLayout}>
      
      {/* LEFT SIDEBAR FILTERS */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          <span className="text-card-heading">Filters</span>
        </div>

        <div className={styles.sidebarScrollArea}>
          <div className={styles.filterSection}>
            <label className={styles.filterLabel}>Status</label>
            <div className={styles.filterList}>
              {['Active', 'Acknowledged', 'Investigating', 'Resolved', 'Dismissed'].map((s, i) => (
                <label key={s} className={styles.checkboxRow}>
                  <input type="checkbox" checked={statusFilter.has(s)} onChange={() => toggleSet(statusFilter, s, setStatusFilter)} />
                  <span className={styles.checkboxText}>{s}</span>
                  <span className={styles.countBadge}>{s === 'Active' ? alerts.filter(a => a.status==='OPEN').length : (s === 'Acknowledged' ? alerts.filter(a=>a.status==='ACKNOWLEDGED').length : 0)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.filterSection}>
            <label className={styles.filterLabel}>Severity</label>
            <div className={styles.filterList}>
              {['Critical', 'High', 'Medium', 'Low', 'Info'].map(s => (
                <label key={s} className={styles.checkboxRow}>
                  <input type="checkbox" checked={severityFilter.has(s)} onChange={() => toggleSet(severityFilter, s, setSeverityFilter)} />
                  <Pill variant={s.toLowerCase() as any}>{s}</Pill>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.filterSection}>
            <label className={styles.filterLabel}>Alert Type</label>
            <div className={styles.accordionList}>
              {['Mechanical Issues', 'Thermal Issues', 'Electrical Issues', 'Performance Issues', 'System Issues'].map(type => (
                <div key={type} className={styles.accordionItem}>
                  <span>{type}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.filterSection}>
            <label className={styles.filterLabel}>Turbine</label>
            <input type="text" placeholder="Select turbines..." className={styles.inputField} value={turbineSearch} onChange={e => setTurbineSearch(e.target.value)} />
          </div>

          <div className={styles.filterSection}>
            <label className={styles.filterLabel}>Date Range</label>
            <div className={styles.dateInputs}>
              <input type="date" className={styles.inputField} />
              <input type="date" className={styles.inputField} />
            </div>
            <div className={styles.quickDates}>
              <button>Today</button>
              <button>Last 7d</button>
              <button>Last 30d</button>
            </div>
          </div>
        </div>

        <div className={styles.sidebarActions}>
          <button className={styles.btnApply} onClick={() => { /* Reactive, so Apply just closes mobile menu if it existed */ }}>Apply Filters</button>
          <button className={styles.btnReset} onClick={resetFilters}>Reset All</button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className={styles.mainContent}>
        <div className={styles.header}>
          <h1 className="text-page-title">Alert Center</h1>
          <p className="text-muted">Correlated operational and predictive incidents</p>
        </div>

        <Card padding="none" className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>ASSET</th>
                  <th>COMPONENT</th>
                  <th>SEVERITY</th>
                  <th>INCIDENT</th>
                  <th>RISK</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map(a => (
                  <tr key={a.id} className={styles.tableRow} onClick={() => setSelectedAlert(a)}>
                    <td>{new Date(a.timestamp).toLocaleString()}</td>
                    <td><strong>{a.turbine_id}</strong></td>
                    <td>{a.component}</td>
                    <td><Pill variant={a.severity.toLowerCase() as any}>{a.severity}</Pill></td>
                    <td>
                      <div className={styles.incidentCell}>
                        <strong>{a.title}</strong>
                        <span className="text-tiny text-muted">{a.description}</span>
                      </div>
                    </td>
                    <td>
                      <strong className={a.risk_score > 50 ? 'text-status-critical' : ''}>
                        {Math.round(a.risk_score)}%
                      </strong>
                    </td>
                    <td><Pill variant={a.status === 'OPEN' ? 'warning' : 'neutral'}>{a.status}</Pill></td>
                    <td>
                      {a.status === 'OPEN' && (
                        <button onClick={(e) => handleAcknowledge(a.id, e)} className={styles.ackBtn}>
                          Acknowledge
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredAlerts.length === 0 && (
                  <tr>
                    <td colSpan={8} className={styles.emptyState}>No alerts matching your filters were found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {/* MODAL POPUP */}
      <div className={`${styles.modalOverlay} ${selectedAlert ? styles.open : ''}`} onClick={() => setSelectedAlert(null)}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          {selectedAlert && (
            <>
              <div className={styles.modalHeader}>
                <div>
                  <h3 className="text-section-heading">{selectedAlert.turbine_id} — {selectedAlert.title}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <Pill variant={selectedAlert.severity.toLowerCase() as any}>{selectedAlert.severity}</Pill>
                    <span className="text-tiny text-muted">Detected {new Date(selectedAlert.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedAlert(null)} className={styles.closeBtn}><X size={20}/></button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.modalSection}>
                  <h4 className="text-card-heading mb-2">Evidence</h4>
                  <ul className={styles.evidenceList}>
                    <li>Vibration ↑ 31% vs baseline</li>
                    <li>Temperature ↑ 12% vs baseline</li>
                    <li>Power deviation -13.2%</li>
                    <li>Anomaly score 87</li>
                  </ul>
                </div>

                <div className={styles.modalSection}>
                  <h4 className="text-card-heading mb-2">Related Signals</h4>
                  <p className="text-muted text-body">4 correlated signals point to <strong>Possible Gearbox Degradation</strong>.</p>
                </div>

                <div className={styles.modalSection}>
                  <h4 className="text-card-heading mb-2">Incident Timeline</h4>
                  <div className={styles.timeline}>
                    <div className={styles.timelineItem}>
                      <span className={styles.timelineTime}>-2h</span>
                      <span>Vibration crossed threshold</span>
                    </div>
                    <div className={styles.timelineItem}>
                      <span className={styles.timelineTime}>-1h</span>
                      <span>Temperature rising rapidly</span>
                    </div>
                    <div className={styles.timelineItem}>
                      <span className={styles.timelineTime}>Now</span>
                      <strong>Critical alert generated</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button className={styles.modalActionBtn} onClick={() => navigate(`/turbines/${selectedAlert.turbine_id}`)}>View Turbine</button>
                <button className={styles.modalActionBtn} onClick={() => navigate('/copilot')}>Ask Copilot</button>
                {selectedAlert.status === 'OPEN' && (
                  <button className={styles.modalAckBtn} onClick={() => handleAcknowledge(selectedAlert.id)}>Acknowledge Alert</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

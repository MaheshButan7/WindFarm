import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { globalSimulator } from '../services/simulator';
import { IntelligentIncident, OperationalAlarm, AlarmDefinition, EventStatus } from '../services/types';
import { IncidentView } from '../features/events/IncidentView';
import { OperationalAlarmsView } from '../features/events/OperationalAlarmsView';
import { AlarmExplorer } from '../features/events/AlarmExplorer';
import { Search, Download } from 'lucide-react';
import styles from '../features/events/Events.module.css';

type ViewMode = 'INCIDENTS' | 'OPERATIONAL' | 'EXPLORER';

export function Alerts() {
  const [incidents, setIncidents] = useState<IntelligentIncident[]>([]);
  const [operationalAlarms, setOperationalAlarms] = useState<OperationalAlarm[]>([]);
  const [catalogue, setCatalogue] = useState<AlarmDefinition[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('INCIDENTS');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('Newest');

  const navigate = useNavigate();

  useEffect(() => {
    const update = () => {
      setIncidents([...globalSimulator.getIncidents()]);
      setOperationalAlarms([...globalSimulator.getOperationalAlarms()]);
      if (catalogue.length === 0) {
        setCatalogue([...globalSimulator.getAlarmCatalogue()]);
      }
    };
    update();
    const unsubscribe = globalSimulator.subscribe(update);
    return () => { unsubscribe(); };
  }, []);

  const handleStatusChange = (id: string, status: EventStatus) => {
    globalSimulator.updateIncidentStatus(id, status);
  };

  const handleOpenTurbine = (id: string) => {
    navigate(`/turbines/${id}`);
  };

  const handleViewAnalytics = (id: string) => {
    navigate(`/analytics?turbine=${id}`);
  };

  const handleAskIntelligence = (incident: IntelligentIncident) => {
    // In a real app, this would pass context to the Copilot. For the demo, just navigate.
    navigate('/copilot');
  };

  const filteredIncidents = incidents.filter(inc => {
    if (severityFilter !== 'All' && inc.severity !== severityFilter.toUpperCase()) {
      return false;
    }
    return true;
  });

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Turbine', 'Component', 'Title', 'Severity', 'Risk', 'Status', 'Timestamp'],
      ...filteredIncidents.map(inc => [
        inc.id,
        inc.turbineId,
        inc.component,
        `"${inc.title}"`,
        inc.severity,
        Math.round(inc.risk),
        inc.status,
        new Date(inc.lastUpdated).toISOString()
      ])
    ].map(e => e.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "events_export.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const countBySeverity = (sev: string) => incidents.filter(i => i.severity === sev.toUpperCase()).length;

  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      <div className={styles.pageLayout}>
        {/* Sub Navigation (View Toggle) */}
        <div className={styles.viewToggle}>
          <button 
            className={`${styles.viewBtn} ${viewMode === 'INCIDENTS' ? styles.active : ''}`}
            onClick={() => setViewMode('INCIDENTS')}
          >
            Intelligent Incidents
          </button>
          <button 
            className={`${styles.viewBtn} ${viewMode === 'OPERATIONAL' ? styles.active : ''}`}
            onClick={() => setViewMode('OPERATIONAL')}
          >
            Operational Alarms
          </button>
          <button 
            className={`${styles.viewBtn} ${viewMode === 'EXPLORER' ? styles.active : ''}`}
            onClick={() => setViewMode('EXPLORER')}
          >
            Alarm Explorer
          </button>
        </div>

        {/* Header */}
        <div className={styles.headerRow} style={{ justifyContent: 'space-between' }}>
          <div className={styles.headerActions}>
            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Search turbines, events, components or alarm names..." 
                className={styles.searchInput} 
              />
            </div>
            
            <div style={{ position: 'relative' }}>
              <button className={styles.btnSecondary} onClick={() => setIsFilterOpen(!isFilterOpen)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"></path></svg>
                Filter
              </button>
              
              {isFilterOpen && (
                <div className={styles.filterPopover} style={{ left: 0, right: 'auto' }}>
                  <div className={styles.filterPopoverHeader}>
                    Filters
                    <button className="btn-icon" onClick={() => setIsFilterOpen(false)}>×</button>
                  </div>
                  <div className={styles.filterPopoverBody}>
                    <div className={styles.filterGroup}>
                      <label>Severity (Event Type)</label>
                      <div className={styles.severityTabs} style={{ flexWrap: 'wrap', marginTop: '4px' }}>
                        {['All', 'Critical', 'High', 'Medium', 'Low', 'Info'].map(sev => (
                          <div 
                            key={sev} 
                            className={`${styles.sevTab} ${severityFilter === sev ? styles.active : ''}`}
                            onClick={() => setSeverityFilter(sev)}
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                          >
                            <span>{sev}</span>
                            <span className={styles.sevCount} style={{ 
                              background: sev === 'All' ? 'var(--bg-secondary)' : 
                                          sev === 'Critical' ? 'var(--status-critical)' : 
                                          sev === 'High' ? 'var(--status-warning)' : 
                                          sev === 'Medium' ? 'var(--status-degraded)' : 
                                          sev === 'Low' ? 'var(--bg-secondary)' : 'var(--status-info)',
                              color: (sev === 'All' || sev === 'Low') ? 'var(--text-primary)' : '#fff'
                            }}>
                              {sev === 'All' ? incidents.length : countBySeverity(sev)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Filters for INCIDENTS */}
                    {viewMode === 'INCIDENTS' && (
                      <>
                        <div className={styles.filterGroup}>
                          <label>Status</label>
                          <select className={styles.filterSelect}>
                            <option>All Statuses</option>
                            <option>Open</option>
                            <option>Acknowledged</option>
                            <option>Investigating</option>
                            <option>Resolved</option>
                          </select>
                        </div>
                        <div className={styles.filterGroup}>
                          <label>Farm</label>
                          <select className={styles.filterSelect} onChange={e => {
                            if (e.target.value !== 'All Farms' && !activeFilters.includes(e.target.value)) {
                              setActiveFilters([...activeFilters, e.target.value]);
                            }
                          }}>
                            <option>All Farms</option>
                            <option>Farm A</option>
                            <option>Farm B</option>
                            <option>Farm C</option>
                          </select>
                        </div>
                        <div className={styles.filterGroup}>
                          <label>Turbine</label>
                          <input 
                            type="text" 
                            className={styles.filterSelect} 
                            placeholder="Search Turbine ID..." 
                            onKeyDown={e => {
                              if (e.key === 'Enter' && e.currentTarget.value) {
                                const val = `Turbine: ${e.currentTarget.value}`;
                                if (!activeFilters.includes(val)) {
                                  setActiveFilters([...activeFilters, val]);
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                        <div className={styles.filterGroup}>
                          <label>Component</label>
                          <select className={styles.filterSelect}>
                            <option>All Components</option>
                            <option>Gearbox</option>
                            <option>Generator</option>
                            <option>Yaw System</option>
                          </select>
                        </div>
                        <div className={styles.filterGroup}>
                          <label>Date Range</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="date" className={styles.filterSelect} style={{ flex: 1, padding: '0 8px' }} />
                            <input type="date" className={styles.filterSelect} style={{ flex: 1, padding: '0 8px' }} />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Filters for OPERATIONAL */}
                    {viewMode === 'OPERATIONAL' && (
                      <>
                        <div className={styles.filterGroup}>
                          <label>State</label>
                          <select className={styles.filterSelect}>
                            <option>All States</option>
                            <option>Active</option>
                            <option>Cleared</option>
                          </select>
                        </div>
                        <div className={styles.filterGroup}>
                          <label>Category</label>
                          <select className={styles.filterSelect}>
                            <option>All Categories</option>
                            <option>Temperature</option>
                            <option>Vibration</option>
                            <option>Yaw</option>
                          </select>
                        </div>
                        <div className={styles.filterGroup}>
                          <label>Component</label>
                          <select className={styles.filterSelect}>
                            <option>All Components</option>
                            <option>Gearbox</option>
                            <option>Generator</option>
                            <option>Yaw System</option>
                          </select>
                        </div>
                        <div className={styles.filterGroup}>
                          <label>Turbine</label>
                          <input 
                            type="text" 
                            className={styles.filterSelect} 
                            placeholder="Search Turbine ID..." 
                            onKeyDown={e => {
                              if (e.key === 'Enter' && e.currentTarget.value) {
                                const val = `Turbine: ${e.currentTarget.value}`;
                                if (!activeFilters.includes(val)) {
                                  setActiveFilters([...activeFilters, val]);
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                        <div className={styles.filterGroup}>
                          <label>Date Range</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="date" className={styles.filterSelect} style={{ flex: 1, padding: '0 8px' }} />
                            <input type="date" className={styles.filterSelect} style={{ flex: 1, padding: '0 8px' }} />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Filters for EXPLORER */}
                    {viewMode === 'EXPLORER' && (
                      <>
                        <div className={styles.filterGroup}>
                          <label>Category</label>
                          <select className={styles.filterSelect}>
                            <option>All Categories</option>
                            <option>Temperature</option>
                            <option>Vibration</option>
                            <option>Yaw</option>
                          </select>
                        </div>
                        <div className={styles.filterGroup}>
                          <label>Component</label>
                          <select className={styles.filterSelect}>
                            <option>All Components</option>
                            <option>Gearbox</option>
                            <option>Generator</option>
                            <option>Yaw System</option>
                          </select>
                        </div>
                        <div className={styles.filterGroup}>
                          <label>Status</label>
                          <select className={styles.filterSelect}>
                            <option>All Statuses</option>
                            <option>Enabled</option>
                            <option>Disabled</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', padding: '16px', borderTop: '1px solid var(--border)', background: 'var(--surface)', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
                    <button className={styles.btnSecondary} style={{ flex: 1, padding: '8px 0' }} onClick={() => { setActiveFilters([]); setIsFilterOpen(false); }}>Reset Filters</button>
                    <button className={styles.btnPrimary} style={{ flex: 1, padding: '8px 0' }} onClick={() => setIsFilterOpen(false)}>Apply Filters</button>
                  </div>
                </div>
              )}
            </div>

            {viewMode === 'INCIDENTS' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginLeft: '12px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Sort by:</span>
                <select className={styles.filterSelect} style={{ border: '1px solid var(--border)', background: 'transparent', padding: '0 8px', height: '32px', borderRadius: '6px' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option>Newest</option>
                  <option>Severity</option>
                  <option>Risk</option>
                  <option>Production Impact</option>
                  <option>Recently Updated</option>
                </select>
              </div>
            )}
          </div>

          <button className={styles.btnSecondary} onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} />
            Export
          </button>
        </div>

        {activeFilters.length > 0 && (
          <div className={styles.filterChips}>
            {activeFilters.map(f => (
              <div key={f} className={styles.filterChip}>
                {f}
                <button className={styles.filterChipBtn} onClick={() => setActiveFilters(activeFilters.filter(x => x !== f))}>×</button>
              </div>
            ))}
            <button className={styles.clearAllBtn} onClick={() => setActiveFilters([])}>Clear all</button>
          </div>
        )}


        {/* Main Content Area based on View Mode */}
        {viewMode === 'INCIDENTS' && (
          <IncidentView 
            incidents={filteredIncidents} 
            operationalAlarms={operationalAlarms}
            onStatusChange={handleStatusChange}
            onOpenTurbine={handleOpenTurbine}
            onViewAnalytics={handleViewAnalytics}
            onAskIntelligence={handleAskIntelligence}
          />
        )}
        
        {viewMode === 'OPERATIONAL' && (
          <OperationalAlarmsView alarms={operationalAlarms} />
        )}

        {viewMode === 'EXPLORER' && (
          <AlarmExplorer catalogue={catalogue} />
        )}
      </div>
    </div>
  );
}

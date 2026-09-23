import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { globalSimulator } from '../services/simulator';
import { IntelligentIncident, OperationalAlarm, AlarmDefinition, EventStatus } from '../services/types';
import { IncidentView } from '../features/events/IncidentView';
import { OperationalAlarmsView } from '../features/events/OperationalAlarmsView';
import { AlarmExplorer } from '../features/events/AlarmExplorer';
import { Search, Download } from 'lucide-react';
import { useLive } from '../contexts/LiveContext';
import styles from '../features/events/Events.module.css';

type ViewMode = 'INCIDENTS' | 'OPERATIONAL' | 'EXPLORER';

export function Alerts() {
  const [incidents, setIncidents] = useState<IntelligentIncident[]>([]);
  const [operationalAlarms, setOperationalAlarms] = useState<OperationalAlarm[]>([]);
  const [catalogue, setCatalogue] = useState<AlarmDefinition[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('INCIDENTS');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [componentFilter, setComponentFilter] = useState('All Components');
  
  const { globalFarmFilter } = useLive();
  
  const [opStateFilter, setOpStateFilter] = useState('All States');
  const [opCategoryFilter, setOpCategoryFilter] = useState('All Categories');
  const [opComponentFilter, setOpComponentFilter] = useState('All Components');

  const [search, setSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

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
    if (severityFilter !== 'All' && inc.severity !== severityFilter.toUpperCase()) return false;
    if (statusFilter !== 'All Statuses' && inc.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (componentFilter !== 'All Components' && inc.component.toLowerCase() !== componentFilter.toLowerCase()) return false;
    
    // Farm filter requires looking up the turbine, but for demo assume Turbine ID prefix determines farm or we skip perfect farm filtering if farm_id isn't in incident. We'll skip farm filter for incidents unless activeFilters has it.
    if (globalFarmFilter !== 'All Farms') {
      const turbine = globalSimulator.getTurbine(inc.turbineId);
      if (turbine?.farm_id !== globalFarmFilter) return false;
    }

    if (search) {
      const s = search.toLowerCase();
      if (!inc.turbineId.toLowerCase().includes(s) && !inc.title.toLowerCase().includes(s) && !inc.component.toLowerCase().includes(s)) {
        return false;
      }
    }

    return true;
  });

  const filteredAlarms = operationalAlarms.filter(a => {
    if (opStateFilter !== 'All States' && a.state.toLowerCase() !== opStateFilter.toLowerCase()) return false;
    if (opCategoryFilter !== 'All Categories' && a.category.toLowerCase() !== opCategoryFilter.toLowerCase()) return false;
    if (opComponentFilter !== 'All Components' && a.component.toLowerCase() !== opComponentFilter.toLowerCase()) return false;

    if (search) {
      const s = search.toLowerCase();
      if (!a.turbineId.toLowerCase().includes(s) && !a.rawName.toLowerCase().includes(s) && !a.component.toLowerCase().includes(s)) {
        return false;
      }
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
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div className={styles.pageLayout}>
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '8px' }}>
          {/* Row 1: View Toggle and Export */}
          <div className={styles.headerRow} style={{ justifyContent: 'space-between' }}>
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
            
            <button className={styles.btnSecondary} onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} />
              Export
            </button>
          </div>

          {/* Row 2: Search, Severity, and Filter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div className={styles.searchBox}>
                <Search size={16} className={styles.searchIcon} />
                <input 
                  type="text" 
                  placeholder="Search turbines, events, components or alarm names..." 
                  className={styles.searchInput} 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Severity Buttons */}
              <div className={styles.severityTabs} style={{ borderBottom: 'none', paddingBottom: 0, margin: 0, gap: '6px' }}>
                {['All', 'Critical', 'High', 'Medium', 'Low', 'Info'].map(sev => (
                  <div 
                    key={sev} 
                    className={`${styles.sevTab} ${severityFilter === sev ? styles.active : ''}`}
                    onClick={() => setSeverityFilter(sev)}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
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
            
            <div style={{ position: 'relative' }}>
              <button className={styles.btnSecondary} onClick={() => setIsFilterOpen(!isFilterOpen)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"></path></svg>
                Filter
              </button>
              
              {isFilterOpen && (
                <div className={styles.filterPopover} style={{ right: 0, left: 'auto' }}>
                  <div className={styles.filterPopoverHeader}>
                    Filters
                    <button className="btn-icon" onClick={() => setIsFilterOpen(false)}>×</button>
                  </div>
                  <div className={styles.filterPopoverBody}>
                    {/* Filters for INCIDENTS */}
                    {viewMode === 'INCIDENTS' && (
                      <>
                        <div className={styles.filterGroup}>
                          <label>Status</label>
                          <select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option>All Statuses</option>
                            <option>OPEN</option>
                            <option>ACKNOWLEDGED</option>
                            <option>INVESTIGATING</option>
                            <option>RESOLVED</option>
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
                          <select className={styles.filterSelect} value={componentFilter} onChange={e => setComponentFilter(e.target.value)}>
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
                          <select className={styles.filterSelect} value={opStateFilter} onChange={e => setOpStateFilter(e.target.value)}>
                            <option>All States</option>
                            <option>Active</option>
                            <option>Cleared</option>
                          </select>
                        </div>
                        <div className={styles.filterGroup}>
                          <label>Category</label>
                          <select className={styles.filterSelect} value={opCategoryFilter} onChange={e => setOpCategoryFilter(e.target.value)}>
                            <option>All Categories</option>
                            <option>Temperature</option>
                            <option>Vibration</option>
                            <option>Yaw</option>
                          </select>
                        </div>
                        <div className={styles.filterGroup}>
                          <label>Component</label>
                          <select className={styles.filterSelect} value={opComponentFilter} onChange={e => setOpComponentFilter(e.target.value)}>
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
                    <button className={styles.btnSecondary} style={{ flex: 1, padding: '8px 0', justifyContent: 'center' }} onClick={() => { setActiveFilters([]); setIsFilterOpen(false); }}>Reset Filters</button>
                    <button className={styles.btnPrimary} style={{ flex: 1, padding: '8px 0', justifyContent: 'center' }} onClick={() => setIsFilterOpen(false)}>Apply Filters</button>
                  </div>
                </div>
              )}
            </div>

          </div>
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
          <OperationalAlarmsView alarms={filteredAlarms} />
        )}

        {viewMode === 'EXPLORER' && (
          <AlarmExplorer catalogue={catalogue} />
        )}
      </div>
    </div>
  );
}

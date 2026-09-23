import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';
import styles from './Header.module.css';
import { Moon, Sun, Bell, TerminalSquare, Search, Lightbulb } from 'lucide-react';
import { Pill } from '../components/Pill';
import { useLive } from '../contexts/LiveContext';
import { globalSimulator } from '../services/simulator';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [incidents, setIncidents] = React.useState(() => globalSimulator.getIncidents().filter(i => i.status === 'OPEN'));

  React.useEffect(() => {
    const unsub = globalSimulator.subscribe(() => {
      setIncidents(globalSimulator.getIncidents().filter(i => i.status === 'OPEN'));
    });
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved as 'light' | 'dark');
    document.documentElement.setAttribute('data-theme', saved);
    return () => { unsub(); };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const { fleet, summary, globalFarmFilter, setGlobalFarmFilter } = useLive();
  const turbineCount = globalFarmFilter === 'All Farms' ? fleet.length : fleet.filter(t => t.farm_id === globalFarmFilter).length;

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview';
    if (path.startsWith('/turbines/')) {
      const id = path.split('/')[2];
      const turbine = globalSimulator.getTurbine(id);
      const farm = turbine ? turbine.farm_id : 'Unknown Farm';
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <strong style={{ color: 'var(--brand-primary)' }}>{id}</strong>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span>{farm}</span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>Turbine Details</span>
        </span>
      );
    }
    if (path === '/turbines') return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>Farm Explorer</span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ fontWeight: 400, color: 'var(--brand-primary)' }}>{turbineCount} Turbines</span>
      </span>
    );
    if (path.startsWith('/analytics')) return 'Analytics';
    if (path.startsWith('/events')) return 'Events';
    if (path.startsWith('/maintenance')) return 'Maintenance';
    if (path.startsWith('/copilot')) return 'AI Insights';
    return 'Dashboard';
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className="text-section-heading">{getPageTitle()}</h1>
      </div>

      <div className={styles.right}>
        <div className={styles.actions}>
          {!location.pathname.startsWith('/turbines/') && (
            <div style={{ marginRight: '8px' }}>
              <select 
                value={globalFarmFilter} 
                onChange={e => setGlobalFarmFilter(e.target.value)}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  outline: 'none',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                <option>All Farms</option>
                <option>Farm A</option>
                <option>Farm B</option>
                <option>Farm C</option>
              </select>
            </div>
          )}
          <button className={styles.themeToggle} onClick={toggleTheme} title="Toggle theme">
            <span className={cn(styles.toggleIcon, theme === 'light' && styles.activeIcon)}>
              <Sun size={14} />
            </span>
            <span className={cn(styles.toggleIcon, theme === 'dark' && styles.activeIcon)}>
              <Moon size={14} />
            </span>
          </button>
          <div style={{ position: 'relative' }}>
            <button className={styles.actionBtn} title="Notifications" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={18} />
              {incidents.length > 0 && <span className={styles.badge}>{incidents.length}</span>}
            </button>
            {showNotifications && (
              <div className={styles.notificationDropdown}>
                <div className={styles.dropdownHeader}>
                  <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Notifications</span>
                </div>
                <div className={styles.dropdownBody}>
                  {incidents.length === 0 ? (
                    <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>No open incidents</div>
                  ) : (
                    <>
                      <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Incidents</div>
                      {incidents.slice(0, 3).map(inc => (
                        <div key={inc.id} className={styles.dropdownItem} onClick={() => { setShowNotifications(false); navigate('/events'); }}>
                          <span style={{ fontWeight: 600, color: 'var(--status-critical)', fontSize: 'var(--font-size-xs)' }}>{inc.turbineId}</span>
                          <span style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inc.title}</span>
                        </div>
                      ))}
                      
                      <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)', fontWeight: 600, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Lightbulb size={12} className="text-brand" />
                        AI Suggestions
                      </div>
                      {incidents.slice(0, 3).map(inc => (
                        <div key={'sugg-'+inc.id} className={styles.dropdownItem} onClick={() => { setShowNotifications(false); navigate('/copilot'); }}>
                          <span style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: 'var(--font-size-xs)' }}>{inc.turbineId}</span>
                          <span style={{ fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inc.recommendedChecks?.[0] || 'Inspect component'}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <div className={styles.dropdownFooter}>
                  <button onClick={() => { setShowNotifications(false); navigate('/events'); }} style={{ color: 'var(--brand-primary)', fontWeight: 600, fontSize: 'var(--font-size-sm)', width: '100%', textAlign: 'center' }}>View all events</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

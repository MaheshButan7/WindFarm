import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';
import styles from './Header.module.css';
import { Moon, Sun, Bell, TerminalSquare, Search } from 'lucide-react';
import { Pill } from '../components/Pill';
import { globalSimulator } from '../services/simulator';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved as 'light' | 'dark');
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview | Wind Farm / Fleet';
    if (path.startsWith('/turbines/')) {
      const id = path.split('/')[2];
      return `${id} | Farm A / Turbine Details`;
    }
    if (path.startsWith('/turbines')) return 'Turbines | 30 Assets';
    if (path.startsWith('/analytics')) return 'Analytics | Performance Lab';
    if (path.startsWith('/alerts')) return 'Alert Center | Correlated Incidents';
    if (path.startsWith('/maintenance')) return 'Predictive Maintenance';
    if (path.startsWith('/copilot')) return 'Intelligence | AI Copilot';
    return 'Dashboard';
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className="text-section-heading">{getPageTitle()}</h1>
      </div>

      <div className={styles.right}>
        <div className={styles.syntheticBadge}>
          <span className={styles.liveDot}></span>
          SYNTHETIC DATA
          <Pill variant="healthy" style={{ marginLeft: 8 }}>LIVE</Pill>
        </div>

        <div className={styles.divider} />

        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={toggleTheme} title="Toggle theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button className={styles.actionBtn} title="Notifications" onClick={() => navigate('/alerts')}>
            <Bell size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

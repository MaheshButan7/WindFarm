import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';
import styles from './Header.module.css';
import { Moon, Sun, Bell, TerminalSquare, Search } from 'lucide-react';
import { Pill } from '../components/Pill';
import { useLive } from '../contexts/LiveContext';
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

  const { summary } = useLive();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Wind Farm Overview';
    if (path.startsWith('/turbines/')) {
      const id = path.split('/')[2];
      return `${id} | Farm A / Turbine Details`;
    }
    if (path.startsWith('/turbines')) return `${summary?.turbines || 30} Turbines`;
    if (path.startsWith('/analytics')) return 'Farm Analytics';
    if (path.startsWith('/alerts')) return 'Events';
    if (path.startsWith('/maintenance')) return 'Predictive Maintenance';
    if (path.startsWith('/copilot')) return 'Intelligence';
    return 'Dashboard';
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className="text-section-heading">{getPageTitle()}</h1>
      </div>

      <div className={styles.right}>
        <div className={styles.actions}>
          <button className={styles.themeToggle} onClick={toggleTheme} title="Toggle theme">
            <span className={cn(styles.toggleIcon, theme === 'light' && styles.activeIcon)}>
              <Sun size={14} />
            </span>
            <span className={cn(styles.toggleIcon, theme === 'dark' && styles.activeIcon)}>
              <Moon size={14} />
            </span>
          </button>
          <button className={styles.actionBtn} title="Notifications" onClick={() => navigate('/alerts')}>
            <Bell size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

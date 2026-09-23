import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../utils/cn';
import styles from './Sidebar.module.css';
import {
  LayoutDashboard,
  Wind,
  LineChart,
  BellRing,
  Wrench,
  Bot,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

const navItems = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/turbines', label: 'Turbines', icon: Wind },
  { path: '/analytics', label: 'Analytics', icon: LineChart },
  { path: '/events', label: 'Events', icon: BellRing },
  { path: '/maintenance', label: 'Maintenance', icon: Wrench },
  { path: '/copilot', label: 'AI Insights', icon: Bot },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside className={cn(styles.sidebar, collapsed && styles.collapsed)}>
      <div className={styles.brand}>
        <img src="/baellchen_logo.png" alt="Logo" className={styles.logo} />
        {!collapsed && (
          <div className={styles.brandText}>
            <strong>WindFarm</strong>
          </div>
        )}
      </div>

      <nav className={styles.nav}>
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => cn(styles.navItem, isActive && styles.active)}
            title={collapsed ? label : undefined}
          >
            <Icon size={20} className={styles.icon} />
            {!collapsed && <span className={styles.label}>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <button className={styles.toggleBtn} onClick={onToggle} title="Collapse sidebar">
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </aside>
  );
}

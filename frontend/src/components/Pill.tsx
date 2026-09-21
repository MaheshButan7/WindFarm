import React from 'react';
import { cn } from '../utils/cn';
import styles from './Pill.module.css';

export type PillProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'healthy' | 'warning' | 'degraded' | 'critical' | 'info' | 'neutral' | 'offline' | 'high' | 'medium' | 'low';
};

export function Pill({ className, variant = 'neutral', children, ...props }: PillProps) {
  return (
    <span className={cn(styles.pill, styles[variant], className)} {...props}>
      {children}
    </span>
  );
}

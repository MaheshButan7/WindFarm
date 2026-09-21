import React from 'react';
import { Card } from './Card';
import { cn } from '../utils/cn';
import styles from './KPI.module.css';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type KPIProps = {
  label: string;
  value: string;
  unit?: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
  secondary?: string;
  accent?: 'healthy' | 'warning' | 'degraded' | 'critical' | 'info' | 'neutral';
  className?: string;
};

export function KPI({
  label,
  value,
  unit,
  trend,
  trendValue,
  secondary,
  accent,
  className,
}: KPIProps) {
  return (
    <Card padding="compact" className={cn(styles.kpiCard, className)}>
      {accent && <div className={cn(styles.accent, styles[accent])} />}
      <div className={styles.header}>
        <span className="text-kpi-label">{label}</span>
        {trend === 'up' && <TrendingUp className={styles.trendUp} size={16} />}
        {trend === 'down' && <TrendingDown className={styles.trendDown} size={16} />}
        {trend === 'flat' && <Minus className={styles.trendFlat} size={16} />}
      </div>
      <div className={styles.valueRow}>
        <span className="text-kpi-value">{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {(secondary || trendValue) && (
        <div className={styles.footer}>
          {secondary && <span className="text-tiny">{secondary}</span>}
          {trendValue && (
            <span
              className={cn(
                'text-tiny',
                trend === 'up' ? styles.textUp : trend === 'down' ? styles.textDown : ''
              )}
            >
              {trendValue}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

import React from 'react';
import { cn } from '../utils/cn';
import styles from './Card.module.css';

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: 'none' | 'compact' | 'standard' | 'large';
  elevated?: boolean;
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'standard', elevated = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          styles.card,
          styles[`padding-${padding}`],
          elevated && styles.elevated,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

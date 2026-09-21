import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { globalSimulator } from '../services/simulator';
import { TurbineData, FleetSummary } from '../services/types';

interface LiveContextType {
  fleet: TurbineData[];
  summary: FleetSummary | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const LiveContext = createContext<LiveContextType | undefined>(undefined);

export function LiveProvider({ children }: { children: ReactNode }) {
  const [fleet, setFleet] = useState<TurbineData[]>([]);
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const update = () => {
      // Create new references to trigger React re-renders
      setFleet([...globalSimulator.getFleet()]);
      setSummary({ ...globalSimulator.getSummary() });
      setLoading(false);
    };

    update(); // Initial load
    const unsubscribe = globalSimulator.subscribe(update);

    return () => {
      unsubscribe();
    };
  }, []);

  const mockRefresh = async () => {
    setFleet([...globalSimulator.getFleet()]);
    setSummary({ ...globalSimulator.getSummary() });
  };

  return (
    <LiveContext.Provider value={{ fleet, summary, loading, refresh: mockRefresh }}>
      {children}
    </LiveContext.Provider>
  );
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error('useLive must be used within LiveProvider');
  return ctx;
}

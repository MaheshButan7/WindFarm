import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { LiveProvider } from './contexts/LiveContext';
import './styles/theme.css';

import { Overview } from './pages/Overview';
import { TurbineDetail } from './pages/TurbineDetail';
import { Copilot } from './pages/Copilot';
import { Maintenance } from './pages/Maintenance';
import { Turbines } from './pages/Turbines';
import { Alerts } from './pages/Alerts';
import { Analytics } from './pages/Analytics';
import { FloatingCopilot } from './components/FloatingCopilot';

export function App() {
  return (
    <LiveProvider>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/turbines" element={<Turbines />} />
          <Route path="/turbines/:id" element={<TurbineDetail />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/events" element={<Alerts />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/copilot" element={<Copilot />} />
        </Route>
      </Routes>
      <FloatingCopilot />
    </LiveProvider>
  );
}

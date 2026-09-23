import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import styles from './Copilot.module.css';
import { Lightbulb } from 'lucide-react';
import { globalSimulator } from '../services/simulator';

export function Copilot() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);

  React.useEffect(() => {
    const update = () => {
      const q = globalSimulator.getIncidents().filter(i => i.status === 'OPEN' && i.eventType === 'Predictive');
      setSuggestions(q);
    };
    update();
    const unsub = globalSimulator.subscribe(update);
    return () => unsub();
  }, []);



  return (
    <div className={styles.container}>


      <div className={styles.grid}>
        {suggestions.map((suggestion, i) => (
          <Card key={suggestion.id} className={styles.suggestionCard} onClick={() => setSelectedSuggestion(suggestion)} style={{ cursor: 'pointer' }}>
            <div className={styles.suggestionHeader}>
              <Lightbulb size={20} className="text-brand" />
              <h3 className="text-card-heading">{suggestion.turbineId} — {suggestion.component}</h3>
            </div>
            <div className={styles.suggestionBody}>
              <ul className={styles.suggestionList}>
                <li><strong>Risk:</strong> {Math.round(suggestion.risk)}%</li>
                <li><strong>AI Insight:</strong> {suggestion.assessment}</li>
              </ul>
              <div className={styles.suggestionAction}>
                <strong>Action:</strong> {suggestion.recommendedChecks?.[0] || 'Inspect component'}
                <span className={styles.confidence}>Type: {suggestion.eventType}</span>
              </div>
            </div>
          </Card>
        ))}
        {suggestions.length === 0 && (
          <Card className={styles.suggestionCard}>
            <p className="text-muted">No pending suggestions.</p>
          </Card>
        )}
      </div>

      {/* MODAL FOR AI SUGGESTION DETAILS */}
      {selectedSuggestion && (
        <div className={styles.modalOverlay} onClick={() => setSelectedSuggestion(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className="text-section-heading">Detailed AI Analysis: {selectedSuggestion.turbineId}</h2>
              <button className={styles.closeBtn} onClick={() => setSelectedSuggestion(null)}>&times;</button>
            </div>
            <div className={styles.modalContent}>
              <p style={{ marginBottom: '16px' }}><strong>Component:</strong> {selectedSuggestion.component}</p>
              
              <div className={styles.insightBlock}>
                <h4>AI Assessment</h4>
                <p>{selectedSuggestion.assessment}</p>
                <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>{selectedSuggestion.whyThisEvent?.join(' ')}</p>
              </div>

              <div className={styles.insightBlock}>
                <h4>System Impact & Production</h4>
                <ul style={{ listStyle: 'disc', paddingLeft: '20px', marginTop: '8px' }}>
                  <li><strong>Current Power Loss:</strong> {selectedSuggestion.impact?.currentLostPowerKw?.toFixed(0)} kW</li>
                  <li><strong>Estimated Daily Loss:</strong> {selectedSuggestion.impact?.estimatedDailyLossMwh?.toFixed(1)} MWh</li>
                  <li><strong>Performance Deviation:</strong> {selectedSuggestion.impact?.performanceDeviationPct?.toFixed(1)}%</li>
                </ul>
              </div>

              <div className={styles.insightBlock}>
                <h4>Supporting Evidence</h4>
                <table className={styles.table} style={{ marginTop: '8px' }}>
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Current</th>
                      <th>Baseline</th>
                      <th>Deviation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSuggestion.evidence?.map((e: any, i: number) => (
                      <tr key={i}>
                        <td>{e.parameter}</td>
                        <td>{e.currentValue} {e.unit}</td>
                        <td>{e.baselineValue} {e.unit}</td>
                        <td style={{ color: e.trend === 'up' ? 'var(--status-critical)' : 'var(--status-warning)' }}>
                          {e.trend === 'up' ? '▲' : '▼'} {Math.abs(e.deviationPct)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.insightBlock} style={{ borderLeftColor: 'var(--status-healthy)' }}>
                <h4>Recommended Checks</h4>
                <ul style={{ paddingLeft: '20px' }}>
                  {selectedSuggestion.recommendedChecks?.map((c: string, i: number) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

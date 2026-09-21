import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import styles from './Copilot.module.css';
import { Bot, Send, Lightbulb } from 'lucide-react';
import { queryCopilot } from '../services/copilot';

export function Copilot() {
  const [query, setQuery] = useState('Why is T04 underperforming?');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const ask = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const data = await queryCopilot(query);
      setResponse(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className="text-page-title">Intelligence</h1>
        <p className="text-muted">AI Suggestions and Conversational Copilot</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.leftPanel}>
          <h2 className="text-section-heading mb-4">AI Suggestions</h2>
          <Card className={styles.suggestionCard}>
            <div className={styles.suggestionHeader}>
              <Lightbulb size={20} className="text-brand" />
              <h3 className="text-card-heading">Efficiency Opportunity</h3>
            </div>
            <div className={styles.suggestionBody}>
              <p><strong>T03 — Yaw Misalignment</strong></p>
              <ul className={styles.suggestionList}>
                <li><strong>Current yaw error:</strong> 16°</li>
                <li><strong>Estimated impact:</strong> 4.7% production reduction</li>
                <li><strong>Evidence:</strong> Yaw error persistent for 42 minutes.</li>
              </ul>
              <div className={styles.suggestionAction}>
                <strong>Suggestion:</strong> Inspect/calibrate yaw alignment.
                <span className={styles.confidence}>Confidence: 93%</span>
              </div>
            </div>
          </Card>
        </div>

        <div className={styles.rightPanel}>
          <Card className={styles.chatCard} padding="none">
            <div className={styles.chatHeader}>
              <Bot size={20} className="text-brand" />
              <span className="text-card-heading">AI Copilot</span>
            </div>
            
            <div className={styles.chatBody}>
              {response && (
                <>
                  <div className={styles.userBubble}>{query}</div>
                  <div className={styles.botBubble}>
                    <p className={styles.finding}>{response.finding}</p>
                    
                    <div className={styles.structuredData}>
                      {response.evidence && response.evidence.length > 0 && (
                        <div>
                          <strong className="text-muted">Evidence</strong>
                          <ul className={styles.evidenceList}>
                            {response.evidence.map((e: string, i: number) => <li key={i}>{e}</li>)}
                          </ul>
                        </div>
                      )}
                      
                      {response.impact && (
                        <div>
                          <strong className="text-muted">Impact</strong>
                          <p>{response.impact}</p>
                        </div>
                      )}

                      {response.risk && (
                        <div>
                          <strong className="text-muted">Risk</strong>
                          <p>{response.risk}</p>
                        </div>
                      )}

                      {response.historical && (
                        <div>
                          <strong className="text-muted">Historical Context</strong>
                          <p>{response.historical}</p>
                        </div>
                      )}

                      {response.recommendation && (
                        <div className={styles.recommendationBox}>
                          <strong className="text-brand">Recommendation</strong>
                          <p>{response.recommendation}</p>
                          <span className={styles.confidenceBadge}>Confidence {response.confidence}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              {loading && <div className="text-muted p-4">Analyzing context...</div>}
            </div>

            <div className={styles.chatInputArea}>
              <input 
                type="text" 
                value={query}
                onChange={e => setQuery(e.target.value)}
                className={styles.chatInput}
                onKeyDown={e => e.key === 'Enter' && ask()}
                placeholder="Ask about turbines, alerts, or performance..."
              />
              <Button onClick={ask} disabled={loading || !query} variant="primary">
                {loading ? 'Thinking...' : <Send size={16} />}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

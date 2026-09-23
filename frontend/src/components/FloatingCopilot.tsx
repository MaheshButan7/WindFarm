import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X } from 'lucide-react';
import { Button } from './Button';
import { queryCopilot } from '../services/copilot';
import styles from './FloatingCopilot.module.css';

export function FloatingCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]); 
  const bodyRef = useRef<HTMLDivElement>(null);

  const ask = async (overrideQuery?: string) => {
    const userQ = overrideQuery || query;
    if (!userQ.trim()) return;
    setQuery('');
    setHistory(prev => [...prev, { type: 'user', text: userQ }]);
    setLoading(true);

    try {
      const data = await queryCopilot(userQ);
      setHistory(prev => [...prev, { type: 'bot', data }]);
    } catch (e) {
      console.error(e);
      setHistory(prev => [...prev, { type: 'bot', text: 'Sorry, I encountered an error.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [history, loading, isOpen]);

  return (
    <div className={styles.fabContainer}>
      {isOpen && (
        <div className={styles.chatWindow}>
          <div className={styles.chatHeader}>
            <div className={styles.headerLeft}>
              <Bot size={20} className="text-brand" />
              <span>AI Copilot</span>
            </div>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className={styles.chatBody} ref={bodyRef}>
            {history.length === 0 && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px', gap: '24px' }}>
                <div className="text-muted" style={{ textAlign: 'center', fontSize: '14px' }}>
                  Ask me about turbine performance, active events, or component health.
                </div>
                <div className={styles.quickQueries}>
                  <button className={styles.quickChip} onClick={() => ask('Summarize Farm A')}>
                    Summarize Farm A
                  </button>
                  <button className={styles.quickChip} onClick={() => ask('Which turbine needs attention first?')}>
                    Which turbine needs attention first?
                  </button>
                  <button className={styles.quickChip} onClick={() => ask('How many critical turbines?')}>
                    How many critical turbines?
                  </button>
                </div>
              </div>
            )}
            {history.map((msg, i) => (
              msg.type === 'user' ? (
                <div key={i} className={styles.userBubble}>{msg.text}</div>
              ) : (
                <div key={i} className={styles.botBubble}>
                  {msg.text ? <p>{msg.text}</p> : (
                    <>
                      <p className={styles.finding}>{msg.data.finding}</p>
                      
                      <div className={styles.structuredData}>
                        {msg.data.evidence && msg.data.evidence.length > 0 && (
                          <div>
                            <strong className="text-muted">Evidence</strong>
                            <ul className={styles.evidenceList}>
                              {msg.data.evidence.map((e: string, j: number) => <li key={j}>{e}</li>)}
                            </ul>
                          </div>
                        )}
                        
                        {msg.data.impact && (
                          <div>
                            <strong className="text-muted">Impact</strong>
                            <p>{msg.data.impact}</p>
                          </div>
                        )}

                        {msg.data.risk && (
                          <div>
                            <strong className="text-muted">Risk</strong>
                            <p>{msg.data.risk}</p>
                          </div>
                        )}

                        {msg.data.historical && (
                          <div>
                            <strong className="text-muted">Historical Context</strong>
                            <p>{msg.data.historical}</p>
                          </div>
                        )}

                        {msg.data.recommendation && (
                          <div className={styles.recommendationBox}>
                            <strong className="text-brand">Recommendation</strong>
                            <p>{msg.data.recommendation}</p>
                            {msg.data.confidence && <span className={styles.confidenceBadge}>Confidence {msg.data.confidence}%</span>}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            ))}
            {loading && <div className="text-muted" style={{ fontSize: '14px', alignSelf: 'flex-start' }}>Thinking...</div>}
          </div>

          <div className={styles.chatInputArea}>
            <input 
              type="text" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              className={styles.chatInput}
              onKeyDown={e => e.key === 'Enter' && ask()}
              placeholder="Ask anything..."
            />
            <Button onClick={ask} disabled={loading || !query.trim()} variant="primary">
              <Send size={16} />
            </Button>
          </div>
        </div>
      )}

      <button className={styles.fab} onClick={() => setIsOpen(!isOpen)} title="AI Copilot">
        {isOpen ? <X size={24} /> : <Bot size={24} />}
      </button>
    </div>
  );
}

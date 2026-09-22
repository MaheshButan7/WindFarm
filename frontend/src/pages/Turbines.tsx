import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import { useLive } from '../contexts/LiveContext';
import styles from './Turbines.module.css';
import { Search, Filter, Plus, X } from 'lucide-react';
import { TurbineTile } from '../features/fleet/TurbineTile';

export function Turbines() {
  const { fleet } = useLive();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [farmFilter, setFarmFilter] = useState('All Farms');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [showModal, setShowModal] = useState(false);

  const statusRank: Record<string, number> = {
    CRITICAL: 0,
    DEGRADED: 1,
    WARNING: 2,
    NORMAL: 3,
    OFFLINE: 4
  };

  const rows = useMemo(() => {
    return fleet
      .filter(t => (farmFilter === 'All Farms' || t.farm_id === farmFilter))
      .filter(t => (statusFilter === 'All Status' || t.status === statusFilter.toUpperCase()))
      .filter(t => t.id.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const rankDiff = (statusRank[a.status] ?? 3) - (statusRank[b.status] ?? 3);
        if (rankDiff !== 0) return rankDiff;
        return a.id.localeCompare(b.id);
      });
  }, [fleet, search, farmFilter, statusFilter]);

  const onlineCount = fleet.filter(t => t.status !== 'OFFLINE').length;
  const criticalCount = fleet.filter(t => t.status === 'CRITICAL').length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className="text-page-title">Turbines</h1>
          <p className="text-muted">{fleet.length} Assets · {onlineCount} Online · {criticalCount} Critical</p>
        </div>
        
        <div className={styles.controls}>
          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search T01..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <div className={styles.filterBox}>
            <Filter size={16} className={styles.searchIcon} />
            <select value={farmFilter} onChange={e => setFarmFilter(e.target.value)} className={styles.filterSelect}>
              <option>All Farms</option>
              <option>Farm A</option>
              <option>Farm B</option>
              <option>Farm C</option>
            </select>
          </div>
          <div className={styles.filterBox}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={styles.filterSelect}>
              <option>All Status</option>
              <option>Normal</option>
              <option>Warning</option>
              <option>Degraded</option>
              <option>Critical</option>
            </select>
          </div>
          <button className={styles.addBtn} onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Turbine
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {rows.map(t => (
          <TurbineTile key={t.id} turbine={t} />
        ))}
      </div>
      
      {rows.length === 0 && (
        <div className={styles.emptyState}>No turbines match your filters.</div>
      )}

      {showModal && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className="text-section-heading">Add New Turbine</h3>
              <button onClick={() => setShowModal(false)} className={styles.closeBtn}><X size={20}/></button>
            </div>
            <div className={styles.modalBody}>
              <p className="text-muted text-body mb-4">Identity</p>
              <div className={styles.formRow}>
                <input type="text" placeholder="Turbine ID (e.g. T31)" className={styles.input} />
                <input type="text" placeholder="Turbine Name" className={styles.input} />
              </div>
              <p className="text-muted text-body mt-4 mb-4">Location</p>
              <div className={styles.formRow}>
                <select className={styles.input}><option>Farm A</option><option>Farm B</option><option>Farm C</option></select>
                <input type="text" placeholder="Latitude" className={styles.input} />
                <input type="text" placeholder="Longitude" className={styles.input} />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button className={styles.saveBtn} onClick={() => setShowModal(false)}>Add Turbine</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

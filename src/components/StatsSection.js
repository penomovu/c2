// src/components/StatsSection.js
import React from 'react';
import { formatNumber, formatDate, formatRelativeTime } from '../utils/formatters';

const StatsSection = ({ stats, loading, error, onRetry }) => {
  if (loading) {
    return (
      <section id="stats" className="stats-section">
        <div className="stats-container">
          <h2 className="stats-title">Database Statistics</h2>
          <div className="stats-loading">
            <div className="spinner"></div>
            <p>Loading statistics...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="stats" className="stats-section">
        <div className="stats-container">
          <h2 className="stats-title">Database Statistics</h2>
          <div className="stats-error">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
            <button onClick={onRetry} className="retry-button">
              Try Again
            </button>
          </div>
          {/* Fallback stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">613M+</div>
              <div className="stat-label">Leaked Passwords</div>
              <div className="stat-note">Known compromised passwords</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">684+</div>
              <div className="stat-label">Data Breaches</div>
              <div className="stat-note">Analyzed breach databases</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">Live</div>
              <div className="stat-label">Database Status</div>
              <div className="stat-note">Updated continuously</div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="stats" className="stats-section">
      <div className="stats-container">
        <h2 className="stats-title">Database Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">
              {formatNumber(stats.total_passwords)}
            </div>
            <div className="stat-label">Leaked Passwords</div>
            <div className="stat-note">
              Compromised passwords in database
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">
              {formatNumber(stats.total_breaches)}
            </div>
            <div className="stat-label">Data Breaches</div>
            <div className="stat-note">
              Analyzed breach sources
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">
              {stats.last_updated ? formatRelativeTime(stats.last_updated) : 'Unknown'}
            </div>
            <div className="stat-label">Last Updated</div>
            <div className="stat-note">
              {stats.last_updated ? formatDate(stats.last_updated) : 'Database never updated'}
            </div>
          </div>
        </div>
        
        <div className="stats-footer">
          <p className="stats-updated">
            Last refreshed: {new Date().toLocaleString()}
          </p>
          <button onClick={onRetry} className="refresh-button">
            🔄 Refresh
          </button>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
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
            <p>Loading comprehensive breach data...</p>
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
              <div className="stat-value">15B+</div>
              <div className="stat-label">Total Records</div>
              <div className="stat-note">Across all breach databases</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">90+</div>
              <div className="stat-label">Data Breaches</div>
              <div className="stat-note">Major breach sources</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">Live</div>
              <div className="stat-label">Database Status</div>
              <div className="stat-note">Continuously updated</div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="stats" className="stats-section">
      <div className="stats-container">
        <div className="stats-header">
          <h2 className="stats-title">Comprehensive Breach Database</h2>
          <p className="stats-subtitle">
            IntelX-scale breach intelligence covering {stats.by_type ? Object.keys(stats.by_type).length : 0} data types
          </p>
        </div>

        {/* Main Statistics Grid */}
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-value">
              {formatNumber(stats.total_records || (stats.passwords + stats.emails + stats.usernames + stats.ips))}
            </div>
            <div className="stat-label">Total Breach Records</div>
            <div className="stat-note">
              Comprehensive database coverage
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">
              {formatNumber(stats.passwords)}
            </div>
            <div className="stat-label">Password Hashes</div>
            <div className="stat-note">
              {stats.by_type?.password?.sources || 0} sources • {formatNumber(stats.by_type?.password?.largest_source || 0)} largest
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">
              {formatNumber(stats.emails)}
            </div>
            <div className="stat-label">Email Addresses</div>
            <div className="stat-note">
              {stats.by_type?.email?.sources || 0} sources • {formatNumber(stats.by_type?.email?.largest_source || 0)} largest
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">
              {formatNumber(stats.usernames)}
            </div>
            <div className="stat-label">Usernames</div>
            <div className="stat-note">
              {stats.by_type?.username?.sources || 0} platforms covered
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">
              {formatNumber(stats.ips)}
            </div>
            <div className="stat-label">IP Addresses</div>
            <div className="stat-note">
              IPv4 & IPv6 support
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">
              {stats.summary?.total_breaches || Object.values(stats.by_type || {}).reduce((sum, type) => sum + (type.sources || 0), 0)}
            </div>
            <div className="stat-label">Breach Sources</div>
            <div className="stat-note">
              Verified databases
            </div>
          </div>
        </div>

        {/* Severity Breakdown */}
        {stats.by_severity && (
          <div className="severity-section">
            <h3 className="section-title">Threat Severity Distribution</h3>
            <div className="severity-grid">
              {Object.entries(stats.by_severity).map(([severity, data]) => (
                <div key={severity} className={`severity-card ${severity}`}>
                  <div className="severity-header">
                    <span className="severity-badge">{severity.toUpperCase()}</span>
                    <div className="severity-count">{data.sources}</div>
                  </div>
                  <div className="severity-records">
                    {formatNumber(data.estimated_records)} records
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {stats.recent_activity && (
          <div className="activity-section">
            <h3 className="section-title">Recent Search Activity (24h)</h3>
            <div className="activity-grid">
              {Object.entries(stats.recent_activity).map(([type, count]) => (
                <div key={type} className="activity-card">
                  <div className="activity-type">{type.toUpperCase()}</div>
                  <div className="activity-count">{formatNumber(count)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Breach Sources */}
        {stats.top_sources && (
          <div className="top-sources-section">
            <h3 className="section-title">Largest Breach Sources</h3>
            <div className="sources-list">
              {stats.top_sources.slice(0, 5).map((source, index) => (
                <div key={source.name} className="source-item">
                  <div className="source-rank">#{index + 1}</div>
                  <div className="source-info">
                    <div className="source-name">{source.name}</div>
                    <div className="source-type">{source.type} • {source.severity}</div>
                  </div>
                  <div className="source-records">{formatNumber(source.records)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Database Info */}
        <div className="database-info">
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">Database Size</div>
              <div className="info-value">
                {stats.database_size_mb ? `${stats.database_size_mb} MB` : 'Optimized'}
              </div>
            </div>
            <div className="info-item">
              <div className="info-label">Data Coverage</div>
              <div className="info-value">{stats.metrics?.data_coverage || 'Global'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">API Endpoints</div>
              <div className="info-value">{stats.metrics?.api_endpoints || '15+'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Last Scan</div>
              <div className="info-value">
                {stats.summary?.last_updated ? formatRelativeTime(stats.summary.last_updated) : 'Recent'}
              </div>
            </div>
          </div>
        </div>
        
        <div className="stats-footer">
          <p className="stats-updated">
            Last refreshed: {new Date().toLocaleString()}
          </p>
          <div className="footer-actions">
            <button onClick={onRetry} className="refresh-button">
              🔄 Refresh Data
            </button>
            <div className="feature-badges">
              <span className="feature-badge">Multi-Format</span>
              <span className="feature-badge">Batch Search</span>
              <span className="feature-badge">Deep Analysis</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
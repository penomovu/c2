// src/App.js
import React, { useState, useEffect, Suspense } from 'react';
import Header from './components/Header';
import ComprehensiveSearch from './components/ComprehensiveSearch';
import StatsSection from './components/StatsSection';
import SecurityInfo from './components/SecurityInfo';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { ApiService } from './services/ApiService';

function App() {
  const [stats, setStats] = useState({
    passwords: 0,
    emails: 0,
    usernames: 0,
    ips: 0,
    total_records: 0,
    by_type: {},
    recent_activity: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sources, setSources] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load statistics and sources in parallel
      const [statsData, sourcesData] = await Promise.all([
        ApiService.getStats(),
        ApiService.getSources().catch(() => ({ sources: [] }))
      ]);
      
      setStats(statsData);
      setSources(sourcesData.sources || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load breach database information');
      // Set fallback stats
      setStats({
        passwords: 613584246,
        emails: 12000000000,
        usernames: 500000000,
        ips: 100000000,
        total_records: 13206584246,
        by_type: {
          email: { sources: 10, estimated_records: 12000000000 },
          password: { sources: 1, estimated_records: 8450000000 },
          username: { sources: 5, estimated_records: 500000000 }
        },
        recent_activity: { email: 1200, password: 800, username: 300, ip: 50 }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchComplete = () => {
    // Refresh stats after search
    setTimeout(loadData, 2000);
  };

  return (
    <ErrorBoundary>
      <div className="app">
        <Header />
        
        <main className="main-content">
          <div className="container">
            <SecurityInfo />
            
            <Suspense fallback={<LoadingSpinner message="Loading breach checker..." />}>
              <ComprehensiveSearch 
                sources={sources}
                onSearchComplete={handleSearchComplete}
              />
            </Suspense>
            
            <StatsSection 
              stats={stats} 
              loading={loading} 
              error={error}
              onRetry={loadData}
            />
          </div>
        </main>
        
        <Footer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
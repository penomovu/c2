// src/App.js
import React, { useState, useEffect, Suspense } from 'react';
import Header from './components/Header';
import PasswordChecker from './components/PasswordChecker';
import StatsSection from './components/StatsSection';
import SecurityInfo from './components/SecurityInfo';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { ApiService } from './services/ApiService';
import { formatNumber, formatDate } from './utils/formatters';

function App() {
  const [stats, setStats] = useState({
    total_passwords: 0,
    total_breaches: 0,
    last_updated: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const statsData = await ApiService.getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
      setError('Failed to load database statistics');
      // Set fallback stats
      setStats({
        total_passwords: 613584246,
        total_breaches: 684,
        last_updated: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordCheckComplete = () => {
    // Optionally refresh stats after password check
    setTimeout(loadStats, 1000);
  };

  return (
    <ErrorBoundary>
      <div className="app">
        <Header />
        
        <main className="main-content">
          <div className="container">
            <SecurityInfo />
            
            <Suspense fallback={<LoadingSpinner />}>
              <PasswordChecker 
                onCheckComplete={handlePasswordCheckComplete}
              />
            </Suspense>
            
            <StatsSection 
              stats={stats} 
              loading={loading} 
              error={error}
              onRetry={loadStats}
            />
          </div>
        </main>
        
        <Footer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
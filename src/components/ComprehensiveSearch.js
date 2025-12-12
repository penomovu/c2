// src/components/ComprehensiveSearch.js
import React, { useState, useRef } from 'react';
import { ApiService } from '../services/ApiService';
import { formatBreachCount, formatNumber, formatDate } from '../utils/formatters';

const ComprehensiveSearch = ({ sources, onSearchComplete }) => {
  const [searchType, setSearchType] = useState('password'); // password, email, username, ip, batch, deep
  const [inputValue, setInputValue] = useState('');
  const [batchQueries, setBatchQueries] = useState(['']);
  const [deepSearchDepth, setDeepSearchDepth] = useState(3);
  const [selectedSources, setSelectedSources] = useState([]);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const searchTypes = [
    { id: 'password', label: '🔐 Password Hash', icon: '🔐', description: 'Search by SHA-1 hash prefix (k-anonymity)' },
    { id: 'email', label: '📧 Email Address', icon: '📧', description: 'Check if email appears in breaches' },
    { id: 'username', label: '👤 Username', icon: '👤', description: 'Find username across platforms' },
    { id: 'ip', label: '🌐 IP Address', icon: '🌐', description: 'Search for IP addresses in breaches' },
    { id: 'batch', label: '📊 Batch Search', icon: '📊', description: 'Search multiple items at once' },
    { id: 'deep', label: '🔍 Deep Search', icon: '🔍', description: 'Comprehensive multi-level search' }
  ];

  const handleSearch = async () => {
    if (!inputValue.trim() && searchType !== 'batch') {
      setError('Please enter a value to search');
      return;
    }

    if (searchType === 'batch' && batchQueries.every(q => !q.trim())) {
      setError('Please enter at least one query for batch search');
      return;
    }

    setSearching(true);
    setError(null);
    setResults(null);

    try {
      let searchResults;
      
      switch (searchType) {
        case 'password':
          if (inputValue.length !== 5 || !/^[0-9A-Fa-f]+$/.test(inputValue)) {
            throw new Error('Password search requires a 5-character hexadecimal hash prefix');
          }
          searchResults = await ApiService.searchPasswordRange(inputValue, selectedSources);
          break;
          
        case 'email':
          if (!isValidEmail(inputValue)) {
            throw new Error('Please enter a valid email address');
          }
          searchResults = await ApiService.searchEmail(inputValue, selectedSources);
          break;
          
        case 'username':
          if (!isValidUsername(inputValue)) {
            throw new Error('Username must be 3-30 characters, alphanumeric with underscores/hyphens only');
          }
          searchResults = await ApiService.searchUsername(inputValue, selectedSources);
          break;
          
        case 'ip':
          if (!isValidIP(inputValue)) {
            throw new Error('Please enter a valid IP address (IPv4 or IPv6)');
          }
          searchResults = await ApiService.searchIP(inputValue, selectedSources);
          break;
          
        case 'batch':
          const validBatchQueries = batchQueries.filter(q => q.trim());
          if (validBatchQueries.length === 0) {
            throw new Error('No valid queries found for batch search');
          }
          searchResults = await ApiService.batchSearch(validBatchQueries);
          break;
          
        case 'deep':
          searchResults = await ApiService.deepSearch(inputValue, deepSearchDepth);
          break;
          
        default:
          throw new Error('Invalid search type');
      }

      setResults(searchResults);
      
      if (onSearchComplete) {
        onSearchComplete(searchResults);
      }
      
    } catch (err) {
      console.error('Search failed:', err);
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const clearResults = () => {
    setResults(null);
    setError(null);
    setInputValue('');
    setBatchQueries(['']);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const addBatchQuery = () => {
    setBatchQueries([...batchQueries, '']);
  };

  const updateBatchQuery = (index, value) => {
    const updated = [...batchQueries];
    updated[index] = value;
    setBatchQueries(updated);
  };

  const removeBatchQuery = (index) => {
    if (batchQueries.length > 1) {
      const updated = batchQueries.filter((_, i) => i !== index);
      setBatchQueries(updated);
    }
  };

  // Validation functions
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    return usernameRegex.test(username);
  };

  const isValidIP = (ip) => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  };

  const renderSearchInput = () => {
    switch (searchType) {
      case 'batch':
        return (
          <div className="batch-input-container">
            <div className="batch-queries">
              {batchQueries.map((query, index) => (
                <div key={index} className="batch-query-item">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => updateBatchQuery(index, e.target.value)}
                    placeholder={`Query ${index + 1} (email, username, IP, or hash)`}
                    className="batch-query-input"
                    disabled={searching}
                  />
                  {batchQueries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBatchQuery(index)}
                      className="remove-query-btn"
                      disabled={searching}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addBatchQuery}
              className="add-query-btn"
              disabled={searching}
            >
              + Add Another Query
            </button>
          </div>
        );
        
      case 'deep':
        return (
          <div className="deep-search-container">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter email, username, IP, or any identifier"
              className="search-input"
              disabled={searching}
              autoFocus
            />
            <div className="deep-search-options">
              <label className="depth-label">
                Search Depth:
                <select
                  value={deepSearchDepth}
                  onChange={(e) => setDeepSearchDepth(parseInt(e.target.value))}
                  className="depth-select"
                  disabled={searching}
                >
                  <option value={2}>Shallow (2 levels)</option>
                  <option value={3}>Medium (3 levels)</option>
                  <option value={5}>Deep (5 levels)</option>
                  <option value={10}>Maximum (10 levels)</option>
                </select>
              </label>
            </div>
          </div>
        );
        
      default:
        return (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={getPlaceholderText()}
            className="search-input"
            disabled={searching}
            autoFocus
          />
        );
    }
  };

  const getPlaceholderText = () => {
    switch (searchType) {
      case 'password': return 'Enter 5-character hash prefix (e.g., 5BAA6)';
      case 'email': return 'Enter email address to check';
      case 'username': return 'Enter username to search';
      case 'ip': return 'Enter IP address to check';
      default: return 'Enter value to search';
    }
  };

  const renderResults = () => {
    if (!results) return null;

    const renderSearchResult = (result, type) => {
      switch (type) {
        case 'password':
          return (
            <div className="search-result">
              <h4>🔐 Password Hash Search Results</h4>
              <div className="result-summary">
                <p><strong>Hash Prefix:</strong> {result.hash_prefix}</p>
                <p><strong>Matches Found:</strong> {result.results_count}</p>
                <p><strong>Search Time:</strong> {result.search_time_ms}ms</p>
              </div>
              {result.matches && result.matches.length > 0 ? (
                <div className="matches-list">
                  {result.matches.map((match, index) => (
                    <div key={index} className="match-item">
                      <div className="match-details">
                        <span className="hash-suffix">{match.suffix}</span>
                        <span className="breach-count">
                          {formatBreachCount(match.count).value} occurrences
                        </span>
                      </div>
                      {match.sources && match.sources.length > 0 && (
                        <div className="sources-list">
                          <small>Sources: {match.sources.join(', ')}</small>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-results">No passwords found for this hash prefix.</p>
              )}
            </div>
          );
          
        case 'email':
          return (
            <div className="search-result">
              <h4>📧 Email Breach Search Results</h4>
              <div className="result-summary">
                <p><strong>Email:</strong> {result.email}</p>
                <p><strong>Hash:</strong> {result.email_hash}</p>
                <p><strong>Breaches Found:</strong> {result.results_count}</p>
                <p><strong>Search Time:</strong> {result.search_time_ms}ms</p>
              </div>
              {result.breaches && result.breaches.length > 0 ? (
                <div className="breaches-list">
                  {result.breaches.map((breach, index) => (
                    <div key={index} className="breach-item">
                      <div className="breach-header">
                        <span className="breach-date">
                          {breach.breach_date || 'Unknown date'}
                        </span>
                        <span className={`severity-badge ${getSeverityClass(breach)}`}>
                          {getConfidenceLevel(breach.confidence_score)}
                        </span>
                      </div>
                      {breach.sources && breach.sources.length > 0 && (
                        <div className="sources-list">
                          <small>Sources: {breach.sources.join(', ')}</small>
                        </div>
                      )}
                      {breach.additional_data && Object.keys(breach.additional_data).length > 0 && (
                        <div className="additional-data">
                          <small>Additional info: {JSON.stringify(breach.additional_data)}</small>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-results">This email was not found in any known breaches.</p>
              )}
            </div>
          );
          
        case 'username':
          return (
            <div className="search-result">
              <h4>👤 Username Search Results</h4>
              <div className="result-summary">
                <p><strong>Username:</strong> {result.username}</p>
                {result.platform && <p><strong>Platform:</strong> {result.platform}</p>}
                <p><strong>Breaches Found:</strong> {result.results_count}</p>
                <p><strong>Search Time:</strong> {result.search_time_ms}ms</p>
              </div>
              {result.breaches && result.breaches.length > 0 ? (
                <div className="breaches-list">
                  {result.breaches.map((breach, index) => (
                    <div key={index} className="breach-item">
                      <div className="breach-header">
                        <span className="platform-name">{breach.platform}</span>
                        <span className="breach-date">{breach.breach_date}</span>
                        <span className={`severity-badge ${getSeverityClass(breach)}`}>
                          {getConfidenceLevel(breach.confidence_score)}
                        </span>
                      </div>
                      {breach.sources && breach.sources.length > 0 && (
                        <div className="sources-list">
                          <small>Sources: {breach.sources.join(', ')}</small>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-results">This username was not found in any known breaches.</p>
              )}
            </div>
          );
          
        case 'ip':
          return (
            <div className="search-result">
              <h4>🌐 IP Address Search Results</h4>
              <div className="result-summary">
                <p><strong>IP Address:</strong> {result.ip_address}</p>
                <p><strong>Type:</strong> {result.ip_type}</p>
                {result.range_search && <p><strong>Range Search:</strong> ±{result.range_search}</p>}
                <p><strong>Breaches Found:</strong> {result.results_count}</p>
                <p><strong>Search Time:</strong> {result.search_time_ms}ms</p>
              </div>
              {result.breaches && result.breaches.length > 0 ? (
                <div className="breaches-list">
                  {result.breaches.map((breach, index) => (
                    <div key={index} className="breach-item">
                      <div className="breach-header">
                        <span className="breach-date">{breach.breach_date}</span>
                        <span className={`severity-badge ${getSeverityClass(breach)}`}>
                          {getConfidenceLevel(breach.confidence_score)}
                        </span>
                      </div>
                      {breach.sources && breach.sources.length > 0 && (
                        <div className="sources-list">
                          <small>Sources: {breach.sources.join(', ')}</small>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-results">This IP address was not found in any known breaches.</p>
              )}
            </div>
          );
          
        case 'batch':
          return (
            <div className="search-result">
              <h4>📊 Batch Search Results</h4>
              <div className="result-summary">
                <p><strong>Queries Processed:</strong> {result.queries_processed}</p>
                <p><strong>Queries with Results:</strong> {result.queries_with_results}</p>
                <p><strong>Search Time:</strong> {result.search_time_ms}ms</p>
              </div>
              {result.results && Object.keys(result.results).length > 0 ? (
                <div className="batch-results">
                  {Object.entries(result.results).map(([query, queryResults]) => (
                    <div key={query} className="batch-query-result">
                      <h5>Query: {query}</h5>
                      {Object.keys(queryResults).length > 0 ? (
                        <div className="query-result-details">
                          {Object.entries(queryResults).map(([type, typeResult]) => (
                            <div key={type} className="type-result">
                              <strong>{type}:</strong> {typeResult.results_count || typeResult.matches?.length || 0} results
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-results">No results found for this query.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-results">No results found for any queries.</p>
              )}
            </div>
          );
          
        case 'deep':
          return (
            <div className="search-result">
              <h4>🔍 Deep Search Results</h4>
              <div className="result-summary">
                <p><strong>Query:</strong> {result.query}</p>
                <p><strong>Depth Reached:</strong> {result.depth_reached}</p>
                <p><strong>Total Results:</strong> {result.total_results}</p>
                <p><strong>Search Time:</strong> {result.search_time_ms}ms</p>
              </div>
              {result.searches_performed && result.searches_performed.length > 0 && (
                <div className="deep-search-details">
                  <h5>Searches Performed:</h5>
                  {result.searches_performed.map((search, index) => (
                    <div key={index} className="search-item">
                      <div className="search-header">
                        <span className="search-type">{search.type}</span>
                        <span className="search-query">{search.query}</span>
                        <span className="search-level">Level {search.level}</span>
                        <span className="results-count">{search.results_count || 0} results</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {result.related_findings && result.related_findings.length > 0 && (
                <div className="related-findings">
                  <h5>Related Findings:</h5>
                  {result.related_findings.map((finding, index) => (
                    <div key={index} className="finding-item">
                      <span className="source-name">{finding.source_name}</span>
                      <span className="frequency">Appears {finding.frequency} times</span>
                      <span className="relevance">{finding.relevance} relevance</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
          
        default:
          return <div>Unknown result type</div>;
      }
    };

    return (
      <div className="search-results">
        {error && (
          <div className="result-message error">
            <div className="message-icon">❌</div>
            <div className="message-content">
              <h3>Error</h3>
              <p>{error}</p>
            </div>
          </div>
        )}
        
        {renderSearchResult(results, searchType)}
      </div>
    );
  };

  const getSeverityClass = (breach) => {
    const score = breach.confidence_score || 0;
    if (score >= 0.9) return 'high';
    if (score >= 0.7) return 'medium';
    return 'low';
  };

  const getConfidenceLevel = (score) => {
    if (score >= 0.9) return 'High Confidence';
    if (score >= 0.7) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <section className="comprehensive-search">
      <div className="search-container">
        <div className="search-header">
          <h2 className="search-title">🔍 Comprehensive Breach Search</h2>
          <p className="search-subtitle">
            Search across passwords, emails, usernames, and IP addresses in our extensive breach database
          </p>
        </div>

        <div className="search-type-selector">
          {searchTypes.map((type) => (
            <button
              key={type.id}
              className={`search-type-btn ${searchType === type.id ? 'active' : ''}`}
              onClick={() => {
                setSearchType(type.id);
                setResults(null);
                setError(null);
              }}
              disabled={searching}
            >
              <span className="type-icon">{type.icon}</span>
              <span className="type-label">{type.label}</span>
            </button>
          ))}
        </div>

        <div className="search-type-description">
          <p>{searchTypes.find(t => t.id === searchType)?.description}</p>
        </div>

        <div className="search-form">
          <div className="input-section">
            {renderSearchInput()}
          </div>

          <div className="button-section">
            <button
              className="search-button primary"
              onClick={handleSearch}
              disabled={searching || (searchType === 'batch' && batchQueries.every(q => !q.trim()))}
            >
              {searching ? (
                <>
                  <span className="spinner"></span>
                  {searchType === 'deep' ? 'Performing Deep Search...' : 'Searching...'}
                </>
              ) : (
                <>
                  {searchType === 'deep' ? '🔍 Deep Search' : 
                   searchType === 'batch' ? '📊 Batch Search' : '🔍 Search'}
                </>
              )}
            </button>
            
            {(results || error) && (
              <button
                className="search-button secondary"
                onClick={clearResults}
                disabled={searching}
              >
                Clear Results
              </button>
            )}
          </div>
        </div>

        {renderResults()}
      </div>
    </section>
  );
};

export default ComprehensiveSearch;
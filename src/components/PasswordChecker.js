// src/components/PasswordChecker.js
import React, { useState, useRef } from 'react';
import { getPasswordHashParts } from '../utils/crypto';
import { ApiService } from '../services/ApiService';
import { formatBreachCount } from '../utils/formatters';

const PasswordChecker = ({ onCheckComplete }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await checkPassword();
  };

  const checkPassword = async () => {
    if (!password.trim()) {
      setError('Please enter a password to check');
      return;
    }

    setChecking(true);
    setError(null);
    setResult(null);

    try {
      // Hash the password and get parts for k-anonymity
      const { prefix, suffix } = await getPasswordHashParts(password);
      
      // Query the API with only the hash prefix
      const response = await ApiService.checkPasswordRange(prefix);
      
      // Check if any returned hash matches our password's suffix
      let isCompromised = false;
      let breachCount = 0;
      
      for (const match of response.matches) {
        if (match.suffix === suffix) {
          isCompromised = true;
          breachCount = match.count;
          break;
        }
      }
      
      const resultData = {
        password: password, // We'll censor this in display
        isCompromised,
        breachCount,
        hashPrefix: prefix,
        timestamp: new Date().toISOString()
      };
      
      setResult(resultData);
      
      if (onCheckComplete) {
        onCheckComplete(resultData);
      }
      
    } catch (err) {
      console.error('Password check failed:', err);
      setError('Failed to check password. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const clearResult = () => {
    setResult(null);
    setError(null);
    setPassword('');
    inputRef.current?.focus();
  };

  const censorPassword = (pwd) => {
    if (!pwd || pwd.length === 0) return '';
    if (pwd.length <= 2) return '•'.repeat(pwd.length);
    return pwd[0] + '•'.repeat(pwd.length - 2) + pwd[pwd.length - 1];
  };

  const breachCountFormatted = formatBreachCount(result?.breachCount || 0);

  return (
    <section id="checker" className="password-checker">
      <div className="checker-card">
        <div className="checker-header">
          <h2 className="checker-title">Check Your Password</h2>
          <p className="checker-subtitle">
            Your password is hashed locally and only the first 5 characters are sent to our server
          </p>
        </div>

        <form onSubmit={handleSubmit} className="checker-form">
          <div className="input-group">
            <div className="password-input-container">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to check..."
                className="password-input"
                disabled={checking}
                autoComplete="off"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password-btn"
                disabled={checking}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
          </div>

          <div className="button-group">
            <button
              type="submit"
              disabled={checking || !password.trim()}
              className="check-button primary"
            >
              {checking ? (
                <>
                  <span className="spinner"></span>
                  Checking...
                </>
              ) : (
                '🔍 Check Password'
              )}
            </button>
            
            {(result || error) && (
              <button
                type="button"
                onClick={clearResult}
                className="check-button secondary"
                disabled={checking}
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {error && (
          <div className="result-message error">
            <div className="message-icon">❌</div>
            <div className="message-content">
              <h3>Error</h3>
              <p>{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className={`result-message ${result.isCompromised ? 'danger' : 'safe'}`}>
            <div className="message-icon">
              {result.isCompromised ? '⚠️' : '✅'}
            </div>
            <div className="message-content">
              <h3>
                {result.isCompromised ? 'Password Compromised!' : 'Password Not Found'}
              </h3>
              <p className="password-display">
                Password: <span className="censored">{censorPassword(result.password)}</span>
              </p>
              
              {result.isCompromised ? (
                <>
                  <p>This password has been found in {formatBreachCount(result.breachCount).value} data breaches.</p>
                  <div className={`breach-count ${breachCountFormatted.className}`}>
                    <strong>{formatBreachCount(result.breachCount).value}</strong>
                    <span>times in known breaches</span>
                  </div>
                  <div className="recommendations">
                    <h4>⚠️ Immediate Actions Required:</h4>
                    <ul>
                      <li>Change this password immediately on all accounts</li>
                      <li>Never use this password again</li>
                      <li>Enable two-factor authentication where possible</li>
                      <li>Consider using a password manager</li>
                    </ul>
                  </div>
                </>
              ) : (
                <>
                  <p>Good news! This password was not found in our breach database.</p>
                  <div className="recommendations">
                    <h4>💡 Security Tips:</h4>
                    <ul>
                      <li>Use unique passwords for each account</li>
                      <li>Enable two-factor authentication</li>
                      <li>Consider using a password manager</li>
                      <li>Regularly check your important accounts</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PasswordChecker;
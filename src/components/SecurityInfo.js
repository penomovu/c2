// src/components/SecurityInfo.js
import React, { useState } from 'react';

const SecurityInfo = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <section id="security" className="security-info">
      <div className="security-card">
        <div className="security-header" onClick={() => setExpanded(!expanded)}>
          <h2 className="security-title">
            🔒 How Our Privacy-First Security Works
          </h2>
          <button 
            className="expand-button"
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '−' : '+'}
          </button>
        </div>

        {expanded && (
          <div className="security-content">
            <div className="security-steps">
              <div className="step">
                <div className="step-icon">1️⃣</div>
                <div className="step-content">
                  <h3>Local Hashing</h3>
                  <p>Your password is hashed locally using SHA-1 in your browser. We never see your actual password.</p>
                </div>
              </div>

              <div className="step">
                <div className="step-icon">2️⃣</div>
                <div className="step-content">
                  <h3>K-Anonymity Transfer</h3>
                  <p>Only the first 5 characters of the SHA-1 hash (hash prefix) are sent to our server for comparison.</p>
                </div>
              </div>

              <div className="step">
                <div className="step-icon">3️⃣</div>
                <div className="step-content">
                  <h3>Secure Comparison</h3>
                  <p>Our server returns all hashes that start with your hash prefix. Your browser does the final comparison.</p>
                </div>
              </div>

              <div className="step">
                <div className="step-icon">4️⃣</div>
                <div className="step-content">
                  <h3>Client-Side Censoring</h3>
                  <p>For additional security, your password is automatically censored in the display to prevent shoulder surfing.</p>
                </div>
              </div>
            </div>

            <div className="security-benefits">
              <h3>🛡️ Security Benefits</h3>
              <ul className="benefits-list">
                <li>✅ Your password never leaves your device in plain text</li>
                <li>✅ We cannot reverse-engineer your password from the hash prefix</li>
                <li>✅ Multiple users can have the same hash prefix, making correlation impossible</li>
                <li>✅ All processing happens locally in your browser</li>
                <li>✅ Passwords are automatically censored for privacy</li>
              </ul>
            </div>

            <div className="security-notes">
              <div className="note">
                <strong>⚠️ Important:</strong> While this tool uses industry-standard k-anonymity, 
                never use this service for extremely sensitive passwords without proper context.
              </div>
              <div className="note">
                <strong>🔐 Production Tip:</strong> For maximum security, always serve this over HTTPS 
                and consider implementing additional security measures.
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default SecurityInfo;
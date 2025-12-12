// src/components/Header.js
import React from 'react';

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-brand">
          <div className="brand-icon">🔐</div>
          <div className="brand-text">
            <h1 className="brand-title">Password Leak Checker</h1>
            <p className="brand-subtitle">
              Check if your passwords have been compromised in data breaches
            </p>
          </div>
        </div>
        
        <nav className="header-nav">
          <a href="#checker" className="nav-link">Check Password</a>
          <a href="#stats" className="nav-link">Statistics</a>
          <a href="#security" className="nav-link">Security</a>
          <a href="https://haveibeenpwned.com" target="_blank" rel="noopener noreferrer" className="nav-link external">
            HIBP <span className="external-icon">↗</span>
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
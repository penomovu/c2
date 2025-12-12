// src/components/Footer.js
import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3 className="footer-title">Password Leak Checker</h3>
          <p className="footer-description">
            A privacy-first password breach checking service using k-anonymity technology.
          </p>
          <div className="footer-license">
            <p>Released under MIT License</p>
            <p>Built with security and privacy in mind</p>
          </div>
        </div>

        <div className="footer-section">
          <h4 className="footer-subtitle">Security</h4>
          <ul className="footer-links">
            <li><a href="#security">How it works</a></li>
            <li><a href="https://haveibeenpwned.com/API/Key" target="_blank" rel="noopener noreferrer">HIBP API</a></li>
            <li><a href="https://owasp.org/www-project-top-ten/" target="_blank" rel="noopener noreferrer">OWASP Top 10</a></li>
            <li><a href="https://www.passwordmanager.com/" target="_blank" rel="noopener noreferrer">Password Managers</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-subtitle">Resources</h4>
          <ul className="footer-links">
            <li><a href="https://www.cybersecurity.gov/" target="_blank" rel="noopener noreferrer">Cybersecurity.gov</a></li>
            <li><a href="https://www.consumer.ftc.gov/articles/password-security" target="_blank" rel="noopener noreferrer">FTC Password Guide</a></li>
            <li><a href="https://haveibeenpwned.com/" target="_blank" rel="noopener noreferrer">Original HIBP</a></li>
            <li><a href="https://krebsonsecurity.com/" target="_blank" rel="noopener noreferrer">Krebs on Security</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-subtitle">Warning</h4>
          <div className="footer-warning">
            <p>⚠️ This tool is for educational and informational purposes.</p>
            <p>Always use strong, unique passwords for each account.</p>
            <p>Enable two-factor authentication wherever possible.</p>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-disclaimer">
          <p>
            <strong>Disclaimer:</strong> This service uses the k-anonymity model to protect your privacy. 
            While we implement industry-standard security practices, we cannot guarantee the 
            completeness or accuracy of breach data. Always verify information through 
            multiple sources.
          </p>
        </div>
        
        <div className="footer-meta">
          <p>© 2024 Password Leak Checker. Built with React and Node.js.</p>
          <p>Inspired by Have I Been Pwned (HIBP) by Troy Hunt.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
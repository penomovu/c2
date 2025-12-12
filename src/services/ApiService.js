// src/services/ApiService.js
/**
 * Enhanced API service for comprehensive breach checking
 */

class ApiService {
  constructor() {
    this.baseUrl = this.getApiBaseUrl();
    this.timeout = 30000; // 30 seconds for deep searches
  }

  /**
   * Get the API base URL
   * @returns {string} API base URL
   */
  getApiBaseUrl() {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return `http://localhost:${window.location.port || 5000}/api`;
    }
    
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api`;
    }
    
    return '/api';
  }

  /**
   * Make a request to the API with timeout and error handling
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise} Response
   */
  async makeRequest(endpoint, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again or reduce search complexity.');
      }
      
      throw error;
    }
  }

  /**
   * Get API health status
   * @returns {Promise<Object>} Health status
   */
  async getHealth() {
    return this.makeRequest('/health');
  }

  /**
   * Get available breach sources
   * @returns {Promise<Object>} Breach sources
   */
  async getSources() {
    return this.makeRequest('/sources');
  }

  /**
   * Search password by hash range (k-anonymity)
   * @param {string} hashPrefix - 5-character SHA-1 hash prefix
   * @param {Array} sources - Optional source filters
   * @returns {Promise<Object>} Password search results
   */
  async searchPasswordRange(hashPrefix, sources = []) {
    if (!hashPrefix || hashPrefix.length !== 5) {
      throw new Error('Hash prefix must be exactly 5 characters');
    }
    
    const params = new URLSearchParams();
    if (sources.length > 0) {
      params.append('sources', sources.join(','));
    }
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.makeRequest(`/password/range/${hashPrefix.toUpperCase()}${queryString}`);
  }

  /**
   * Search for email breaches
   * @param {string} email - Email address to search
   * @param {Array} sources - Optional source filters
   * @returns {Promise<Object>} Email search results
   */
  async searchEmail(email, sources = []) {
    if (!email || !this.isValidEmail(email)) {
      throw new Error('Please provide a valid email address');
    }
    
    const params = new URLSearchParams();
    if (sources.length > 0) {
      params.append('sources', sources.join(','));
    }
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.makeRequest(`/email/${encodeURIComponent(email)}${queryString}`);
  }

  /**
   * Search for username breaches
   * @param {string} username - Username to search
   * @param {string} platform - Optional platform filter
   * @param {Array} sources - Optional source filters
   * @returns {Promise<Object>} Username search results
   */
  async searchUsername(username, platform = null, sources = []) {
    if (!username || !this.isValidUsername(username)) {
      throw new Error('Please provide a valid username (3-30 characters, alphanumeric with _ and -)');
    }
    
    const params = new URLSearchParams();
    if (platform) {
      params.append('platform', platform.toLowerCase());
    }
    if (sources.length > 0) {
      params.append('sources', sources.join(','));
    }
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.makeRequest(`/username/${encodeURIComponent(username)}${queryString}`);
  }

  /**
   * Search for IP address breaches
   * @param {string} ip - IP address to search
   * @param {number} range - Optional range search for IPv4
   * @param {Array} sources - Optional source filters
   * @returns {Promise<Object>} IP search results
   */
  async searchIP(ip, range = null, sources = []) {
    if (!ip || !this.isValidIP(ip)) {
      throw new Error('Please provide a valid IP address (IPv4 or IPv6)');
    }
    
    const params = new URLSearchParams();
    if (range && this.isValidIPv4(ip)) {
      params.append('range', range.toString());
    }
    if (sources.length > 0) {
      params.append('sources', sources.join(','));
    }
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.makeRequest(`/ip/${encodeURIComponent(ip)}${queryString}`);
  }

  /**
   * Perform batch search across multiple queries and types
   * @param {Array} queries - Array of queries to search
   * @param {Array} types - Optional types to search (default: all)
   * @returns {Promise<Object>} Batch search results
   */
  async batchSearch(queries, types = ['password', 'email', 'username', 'ip']) {
    if (!Array.isArray(queries) || queries.length === 0) {
      throw new Error('Queries must be a non-empty array');
    }
    
    if (queries.length > 100) {
      throw new Error('Maximum batch size is 100 queries');
    }
    
    return this.makeRequest('/search/batch', {
      method: 'POST',
      body: JSON.stringify({
        queries,
        types
      }),
    });
  }

  /**
   * Perform deep search with multiple levels and correlation analysis
   * @param {string} query - Query to search
   * @param {number} maxDepth - Maximum search depth (2-10)
   * @returns {Promise<Object>} Deep search results
   */
  async deepSearch(query, maxDepth = 3) {
    if (!query || typeof query !== 'string') {
      throw new Error('Query must be a non-empty string');
    }
    
    if (maxDepth < 1 || maxDepth > 10) {
      throw new Error('Search depth must be between 1 and 10');
    }
    
    return this.makeRequest('/search/deep', {
      method: 'POST',
      body: JSON.stringify({
        query,
        maxDepth
      }),
    });
  }

  /**
   * Get comprehensive statistics
   * @returns {Promise<Object>} Database statistics
   */
  async getStats() {
    return this.makeRequest('/stats');
  }

  /**
   * Get search query analytics
   * @param {string} type - Optional query type filter
   * @param {string} period - Time period (1d, 7d, 30d, 90d)
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Object>} Query analytics
   */
  async getQueryAnalytics(type = null, period = '7d', limit = 100) {
    const params = new URLSearchParams({
      period,
      limit: limit.toString()
    });
    
    if (type) {
      params.append('type', type);
    }
    
    return this.makeRequest(`/analytics/queries?${params.toString()}`);
  }

  /**
   * Test API connection
   * @returns {Promise<boolean>} True if API is accessible
   */
  async testConnection() {
    try {
      await this.getHealth();
      return true;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate username format
   * @param {string} username - Username to validate
   * @returns {boolean} True if valid username
   */
  isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    return usernameRegex.test(username);
  }

  /**
   * Validate IP address format
   * @param {string} ip - IP address to validate
   * @returns {boolean} True if valid IP
   */
  isValidIP(ip) {
    return this.isValidIPv4(ip) || this.isValidIPv6(ip);
  }

  /**
   * Validate IPv4 address format
   * @param {string} ip - IP address to validate
   * @returns {boolean} True if valid IPv4
   */
  isValidIPv4(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  }

  /**
   * Validate IPv6 address format
   * @param {string} ip - IP address to validate
   * @returns {boolean} True if valid IPv6
   */
  isValidIPv6(ip) {
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv6Regex.test(ip);
  }

  /**
   * Convert IP address to numeric value (IPv4 only)
   * @param {string} ip - IPv4 address
   * @returns {number} Numeric representation
   */
  ipToNumeric(ip) {
    if (!this.isValidIPv4(ip)) {
      return null;
    }
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }

  /**
   * Hash a query for privacy (SHA-256)
   * @param {string} query - Query to hash
   * @returns {string} Hash of query
   */
  hashQuery(query) {
    // This would typically use crypto.subtle in browser
    // For now, return a simple hash for demonstration
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get breach source information
   * @param {string} sourceId - Source ID
   * @param {Array} sources - Available sources
   * @returns {Object} Source information
   */
  getSourceInfo(sourceId, sources = []) {
    return sources.find(source => source.id === sourceId) || null;
  }

  /**
   * Format breach severity for display
   * @param {Object} breach - Breach object
   * @returns {string} Severity class name
   */
  getBreachSeverity(breach) {
    const score = breach.confidence_score || 0;
    if (score >= 0.9) return 'critical';
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Check if a feature is enabled
   * @param {string} feature - Feature name
   * @returns {boolean} True if feature is enabled
   */
  async isFeatureEnabled(feature) {
    try {
      const health = await this.getHealth();
      return health.features && health.features[feature] === true;
    } catch (error) {
      console.warn('Could not check feature status:', error);
      return false;
    }
  }

  /**
   * Get recommended search types for a query
   * @param {string} query - Query to analyze
   * @returns {Array} Recommended search types
   */
  getRecommendedSearchTypes(query) {
    const recommendations = [];
    
    if (query.length === 40 && /^[0-9A-Fa-f]+$/.test(query)) {
      recommendations.push('password');
    }
    
    if (this.isValidEmail(query)) {
      recommendations.push('email');
    }
    
    if (this.isValidUsername(query)) {
      recommendations.push('username');
    }
    
    if (this.isValidIP(query)) {
      recommendations.push('ip');
    }
    
    return recommendations.length > 0 ? recommendations : ['email', 'username', 'ip'];
  }
}

// Export singleton instance
export const ApiService = new ApiService();
// src/services/ApiService.js
/**
 * API service for communicating with the password checking backend
 */

class ApiService {
  constructor() {
    this.baseUrl = this.getApiBaseUrl();
    this.timeout = 10000; // 10 seconds
  }

  /**
   * Get the API base URL
   * @returns {string} API base URL
   */
  getApiBaseUrl() {
    // In development, use localhost
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return `http://localhost:${window.location.port || 5000}/api`;
    }
    
    // In production, use same origin
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api`;
    }
    
    // Fallback for server-side rendering
    return '/api';
  }

  /**
   * Make a request to the API with timeout
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
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Please check your connection and try again.');
      }
      
      throw error;
    }
  }

  /**
   * Check password against breach database using k-anonymity
   * @param {string} hashPrefix - First 5 characters of SHA-1 hash
   * @returns {Promise<{matches: Array}>}
   */
  async checkPasswordRange(hashPrefix) {
    if (!hashPrefix || hashPrefix.length !== 5) {
      throw new Error('Hash prefix must be exactly 5 characters');
    }
    
    return this.makeRequest(`/range/${hashPrefix.toUpperCase()}`);
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>} Database statistics
   */
  async getStats() {
    return this.makeRequest('/stats');
  }

  /**
   * Get health status of the API
   * @returns {Promise<Object>} Health status
   */
  async getHealth() {
    return this.makeRequest('/health');
  }

  /**
   * Add passwords to the database (admin endpoint)
   * @param {Array} passwords - Array of passwords to add
   * @returns {Promise<Object>} Result of the operation
   */
  async addPasswords(passwords) {
    if (!Array.isArray(passwords)) {
      throw new Error('Passwords must be an array');
    }
    
    return this.makeRequest('/add-passwords', {
      method: 'POST',
      body: JSON.stringify({ passwords }),
    });
  }

  /**
   * Search for all hashes with a specific prefix
   * @param {string} hashPrefix - First 5 characters of SHA-1 hash
   * @returns {Promise<Object>} Search results with metadata
   */
  async searchHashPrefix(hashPrefix) {
    if (!hashPrefix || hashPrefix.length !== 5) {
      throw new Error('Hash prefix must be exactly 5 characters');
    }
    
    return this.makeRequest(`/search/${hashPrefix.toUpperCase()}`);
  }

  /**
   * Test the API connection
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
   * Get API configuration for the frontend
   * @returns {Promise<Object>} API configuration
   */
  async getConfig() {
    return this.makeRequest('/config').catch(() => {
      // Fallback configuration if API doesn't provide config
      return {
        version: '2.0.0',
        features: {
          statistics: true,
          passwordAddition: false,
          exportData: false
        }
      };
    });
  }
}

// Export singleton instance
export const ApiService = new ApiService();
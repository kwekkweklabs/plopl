import { CHAINS } from '../config';
import axios from 'axios';

/**
 * Plopl SDK for generating proofs through redirection
 */
class Plopl {
  /**
   * Create a new Plopl instance
   * @param {Object} config - Configuration
   * @param {string} config.schemaId - Schema ID
   * @param {string|number} config.chainId - Chain ID or name (e.g. 'base' or 84532)
   */
  constructor(config) {
    if (!config.schemaId) {
      throw new Error('schemaId is required');
    }
    
    this.schemaId = config.schemaId;
    this.schema = null;
    
    // Handle chainId parameter (support both numeric ID and string name)
    if (config.chainId) {
      // If chainId is a string like 'base', map it to the numeric ID
      if (typeof config.chainId === 'string') {
        const chain = CHAINS.find(c => c.name.toLowerCase().includes(config.chainId.toLowerCase()));
        if (chain) {
          this.chainId = chain.id;
        } else {
          throw new Error(`Unknown chain: ${config.chainId}`);
        }
      } else {
        // If chainId is already numeric
        this.chainId = config.chainId;
      }
    } else if (config.chain) {
      // For backward compatibility, also support 'chain' parameter
      console.warn('The "chain" parameter is deprecated. Use "chainId" instead.');
      
      if (typeof config.chain === 'string') {
        const chain = CHAINS.find(c => c.name.toLowerCase().includes(config.chain.toLowerCase()));
        if (chain) {
          this.chainId = chain.id;
        } else {
          throw new Error(`Unknown chain: ${config.chain}`);
        }
      } else {
        this.chainId = config.chain;
      }
    } else {
      throw new Error('chainId is required');
    }
  }
  
  /**
   * Fetch the schema data from the backend
   * @returns {Promise<Object>} The schema data
   */
  async fetchSchema() {
    if (this.schema) {
      return this.schema;
    }
    
    try {
      const res = await axios({
        method: 'GET',
        url: `${import.meta.env.VITE_BACKEND_URL}/schema/${this.schemaId}`
      });
      
      this.schema = res.data;
      return this.schema;
    } catch (error) {
      console.error('Error fetching schema:', error);
      throw new Error(`Failed to fetch schema: ${error.message}`);
    }
  }
  
  /**
   * Generate a proof by redirecting to the prepare URL
   * @param {Object} options - Options for generating the proof
   * @param {boolean} options.newTab - Whether to open in a new tab (default: true)
   * @returns {Promise<void>} Resolves when the redirect is initiated
   */
  async generateProof(options = { newTab: true }) {
    try {
      // Fetch the schema if not already fetched
      const schema = await this.fetchSchema();
      
      // Construct the URL by adding ploplSchemaId to the current URL
      const url = new URL(window.location.href);
      url.searchParams.set('ploplSchemaId', this.schemaId);
      const redirectUrl = url.toString();
      
      console.log('Redirect URL:', redirectUrl);
      
      // Perform the actual redirect
      if (options.newTab) {
        window.location.href = redirectUrl;
      } else {
        window.location.href = redirectUrl;
      }
      
      return {
        status: 'redirect_initiated',
        url: redirectUrl
      };
    } catch (error) {
      console.error('Error generating proof:', error);
      throw error;
    }
  }
}

export default Plopl;
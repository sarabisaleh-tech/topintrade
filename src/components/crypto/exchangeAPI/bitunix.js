/**
 * BitUnix Exchange API Wrapper
 * Documentation: https://bitunix-docs.github.io/apidocs/
 */

import CryptoJS from 'crypto-js';

const BITUNIX_BASE_URL = 'https://api.bitunix.com';

class BitUnixAPI {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = BITUNIX_BASE_URL;
  }

  /**
   * Generate signature for authenticated requests
   */
  generateSignature(timestamp, method, endpoint, queryString = '', body = '') {
    const message = timestamp + method + endpoint + queryString + body;
    return CryptoJS.HmacSHA256(message, this.apiSecret).toString();
  }

  /**
   * Make authenticated request to BitUnix API
   */
  async makeRequest(method, endpoint, params = {}, isPublic = false) {
    const timestamp = Date.now().toString();
    const url = new URL(this.baseUrl + endpoint);

    let queryString = '';
    let body = '';

    if (method === 'GET' && Object.keys(params).length > 0) {
      queryString = '?' + new URLSearchParams(params).toString();
      url.search = queryString;
    } else if (method === 'POST' && Object.keys(params).length > 0) {
      body = JSON.stringify(params);
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    if (!isPublic) {
      const signature = this.generateSignature(timestamp, method, endpoint, queryString, body);
      headers['BU-APIKEY'] = this.apiKey;
      headers['BU-TIMESTAMP'] = timestamp;
      headers['BU-SIGNATURE'] = signature;
    }

    console.log('🔍 BitUnix API Request:', {
      url: url.toString(),
      method,
      headers,
      endpoint,
      queryString,
      timestamp
    });

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: method === 'POST' ? body : undefined,
      });

      console.log('📡 BitUnix API Response Status:', response.status, response.statusText);

      const responseText = await response.text();
      console.log('📄 BitUnix API Response Body:', responseText);

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.msg || errorData.message || errorData.error || errorMsg;
        } catch (e) {
          errorMsg = responseText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error('❌ BitUnix API Error:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getBalance() {
    try {
      const response = await this.makeRequest('GET', '/api/v1/account/balance');

      // Normalize response format
      return {
        exchange: 'bitunix',
        totalBalance: parseFloat(response.data?.totalBalance || 0),
        totalEquity: parseFloat(response.data?.totalEquity || 0),
        availableBalance: parseFloat(response.data?.availableBalance || 0),
        unrealizedPnl: parseFloat(response.data?.unrealizedPnl || 0),
        assets: response.data?.assets || [],
        raw: response
      };
    } catch (error) {
      console.error('Error fetching BitUnix balance:', error);
      throw error;
    }
  }

  /**
   * Get open positions
   */
  async getOpenPositions() {
    try {
      const response = await this.makeRequest('GET', '/api/v1/position/list');

      const positions = (response.data || []).map(pos => ({
        symbol: pos.symbol,
        side: pos.side, // 'LONG' or 'SHORT'
        size: parseFloat(pos.size || 0),
        entryPrice: parseFloat(pos.entryPrice || 0),
        currentPrice: parseFloat(pos.markPrice || 0),
        leverage: parseInt(pos.leverage || 1),
        unrealizedPnl: parseFloat(pos.unrealizedPnl || 0),
        liquidationPrice: parseFloat(pos.liquidationPrice || 0),
        margin: parseFloat(pos.margin || 0),
        timestamp: pos.timestamp || Date.now(),
        raw: pos
      }));

      return {
        exchange: 'bitunix',
        positions,
        count: positions.length
      };
    } catch (error) {
      console.error('Error fetching BitUnix positions:', error);
      throw error;
    }
  }

  /**
   * Get trade history
   */
  async getTradeHistory(limit = 100) {
    try {
      const response = await this.makeRequest('GET', '/api/v1/trade/history', { limit });

      const trades = (response.data || []).map(trade => ({
        id: trade.id || trade.tradeId,
        symbol: trade.symbol,
        side: trade.side, // 'BUY' or 'SELL'
        type: trade.type, // 'LIMIT', 'MARKET'
        price: parseFloat(trade.price || 0),
        quantity: parseFloat(trade.quantity || 0),
        commission: parseFloat(trade.commission || 0),
        realizedPnl: parseFloat(trade.realizedPnl || 0),
        timestamp: trade.timestamp || trade.time,
        raw: trade
      }));

      return {
        exchange: 'bitunix',
        trades,
        count: trades.length
      };
    } catch (error) {
      console.error('Error fetching BitUnix trade history:', error);
      throw error;
    }
  }

  /**
   * Get account information (combined data)
   */
  async getAccountInfo() {
    try {
      const [balance, positions, trades] = await Promise.all([
        this.getBalance(),
        this.getOpenPositions(),
        this.getTradeHistory(50)
      ]);

      return {
        exchange: 'bitunix',
        balance,
        positions,
        trades,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching BitUnix account info:', error);
      throw error;
    }
  }

  /**
   * Test API credentials
   */
  async testConnection() {
    try {
      await this.getBalance();
      return { success: true, message: 'Connected successfully to BitUnix' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to connect to BitUnix'
      };
    }
  }
}

export default BitUnixAPI;

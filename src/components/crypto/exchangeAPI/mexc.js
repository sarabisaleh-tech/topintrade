/**
 * MEXC Exchange API Wrapper
 * Documentation: https://mexcdevelop.github.io/apidocs/
 */

import CryptoJS from 'crypto-js';

const MEXC_BASE_URL = 'https://api.mexc.com';

class MEXCAPI {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = MEXC_BASE_URL;
  }

  /**
   * Generate signature for authenticated requests
   */
  generateSignature(queryString) {
    return CryptoJS.HmacSHA256(queryString, this.apiSecret).toString();
  }

  /**
   * Make authenticated request to MEXC API
   */
  async makeRequest(method, endpoint, params = {}, isPublic = false) {
    const timestamp = Date.now();
    const url = new URL(this.baseUrl + endpoint);

    // Add timestamp to params
    if (!isPublic) {
      params.timestamp = timestamp;
    }

    const queryString = new URLSearchParams(params).toString();

    if (method === 'GET') {
      url.search = queryString;
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-MEXC-APIKEY': this.apiKey,
    };

    if (!isPublic && queryString) {
      const signature = this.generateSignature(queryString);
      url.searchParams.append('signature', signature);
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('MEXC API Error:', error);
      throw error;
    }
  }

  /**
   * Get account balance (Futures)
   */
  async getBalance() {
    try {
      const response = await this.makeRequest('GET', '/api/v1/private/account/assets');

      // Normalize response format
      const totalBalance = parseFloat(response.data?.totalBalance || 0);
      const availableBalance = parseFloat(response.data?.availableBalance || 0);
      const unrealizedPnl = parseFloat(response.data?.totalUnrealizedProfit || 0);

      return {
        exchange: 'mexc',
        totalBalance,
        totalEquity: totalBalance + unrealizedPnl,
        availableBalance,
        unrealizedPnl,
        assets: response.data?.assets || [],
        raw: response
      };
    } catch (error) {
      console.error('Error fetching MEXC balance:', error);
      throw error;
    }
  }

  /**
   * Get open positions (Futures)
   */
  async getOpenPositions() {
    try {
      const response = await this.makeRequest('GET', '/api/v1/private/position/open_positions');

      const positions = (response.data || []).map(pos => ({
        symbol: pos.symbol,
        side: pos.positionType === 1 ? 'LONG' : 'SHORT',
        size: Math.abs(parseFloat(pos.holdVol || 0)),
        entryPrice: parseFloat(pos.openAvgPrice || 0),
        currentPrice: parseFloat(pos.holdAvgPrice || 0),
        leverage: parseInt(pos.leverage || 1),
        unrealizedPnl: parseFloat(pos.unrealizedPnl || 0),
        liquidationPrice: parseFloat(pos.liquidatePrice || 0),
        margin: parseFloat(pos.im || 0), // Initial Margin
        timestamp: pos.timestamp || Date.now(),
        raw: pos
      }));

      return {
        exchange: 'mexc',
        positions,
        count: positions.length
      };
    } catch (error) {
      console.error('Error fetching MEXC positions:', error);
      throw error;
    }
  }

  /**
   * Get trade history (Futures)
   */
  async getTradeHistory(limit = 100) {
    try {
      const response = await this.makeRequest('GET', '/api/v1/private/order/list/history', {
        page_num: 1,
        page_size: limit
      });

      const trades = (response.data || []).map(trade => ({
        id: trade.orderId,
        symbol: trade.symbol,
        side: trade.side === 1 ? 'BUY' : 'SELL',
        type: trade.type === 1 ? 'LIMIT' : 'MARKET',
        price: parseFloat(trade.price || 0),
        quantity: parseFloat(trade.vol || 0),
        commission: parseFloat(trade.fee || 0),
        realizedPnl: parseFloat(trade.profit || 0),
        timestamp: trade.timestamp || trade.createTime,
        raw: trade
      }));

      return {
        exchange: 'mexc',
        trades,
        count: trades.length
      };
    } catch (error) {
      console.error('Error fetching MEXC trade history:', error);
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
        exchange: 'mexc',
        balance,
        positions,
        trades,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching MEXC account info:', error);
      throw error;
    }
  }

  /**
   * Test API credentials
   */
  async testConnection() {
    try {
      await this.getBalance();
      return { success: true, message: 'Connected successfully to MEXC' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to connect to MEXC'
      };
    }
  }
}

export default MEXCAPI;

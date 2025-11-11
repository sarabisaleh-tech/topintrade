/**
 * XT.com Exchange API Wrapper
 * Documentation: https://doc.xt.com/
 */

import CryptoJS from 'crypto-js';

const XT_BASE_URL = 'https://fapi.xt.com';

class XTAPI {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = XT_BASE_URL;
  }

  /**
   * Generate signature for authenticated requests
   */
  generateSignature(queryString) {
    return CryptoJS.HmacSHA256(queryString, this.apiSecret).toString();
  }

  /**
   * Make authenticated request to XT API
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
      'xt-validate-appkey': this.apiKey,
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
      console.error('XT.com API Error:', error);
      throw error;
    }
  }

  /**
   * Get account balance (Futures)
   */
  async getBalance() {
    try {
      const response = await this.makeRequest('GET', '/future/user/v1/balance/detail');

      // Normalize response format
      const totalBalance = parseFloat(response.result?.totalBalance || 0);
      const availableBalance = parseFloat(response.result?.availableBalance || 0);
      const unrealizedPnl = parseFloat(response.result?.unrealizedProfit || 0);

      return {
        exchange: 'xt',
        totalBalance,
        totalEquity: totalBalance + unrealizedPnl,
        availableBalance,
        unrealizedPnl,
        assets: response.result?.balances || [],
        raw: response
      };
    } catch (error) {
      console.error('Error fetching XT balance:', error);
      throw error;
    }
  }

  /**
   * Get open positions (Futures)
   */
  async getOpenPositions() {
    try {
      const response = await this.makeRequest('GET', '/future/user/v1/position');

      const positions = (response.result?.items || []).map(pos => ({
        symbol: pos.symbol,
        side: pos.positionSide === 'LONG' ? 'LONG' : 'SHORT',
        size: Math.abs(parseFloat(pos.positionAmt || 0)),
        entryPrice: parseFloat(pos.avgPrice || 0),
        currentPrice: parseFloat(pos.markPrice || 0),
        leverage: parseInt(pos.leverage || 1),
        unrealizedPnl: parseFloat(pos.unrealizedProfit || 0),
        liquidationPrice: parseFloat(pos.liquidationPrice || 0),
        margin: parseFloat(pos.initialMargin || 0),
        timestamp: pos.updateTime || Date.now(),
        raw: pos
      }));

      return {
        exchange: 'xt',
        positions,
        count: positions.length
      };
    } catch (error) {
      console.error('Error fetching XT positions:', error);
      throw error;
    }
  }

  /**
   * Get trade history (Futures)
   */
  async getTradeHistory(limit = 100) {
    try {
      const response = await this.makeRequest('GET', '/future/user/v1/allOrders', {
        limit: limit
      });

      const trades = (response.result?.items || []).map(trade => ({
        id: trade.orderId,
        symbol: trade.symbol,
        side: trade.side,
        type: trade.type,
        price: parseFloat(trade.avgPrice || 0),
        quantity: parseFloat(trade.origQty || 0),
        commission: parseFloat(trade.commission || 0),
        realizedPnl: parseFloat(trade.realizedProfit || 0),
        timestamp: trade.time || trade.updateTime,
        raw: trade
      }));

      return {
        exchange: 'xt',
        trades,
        count: trades.length
      };
    } catch (error) {
      console.error('Error fetching XT trade history:', error);
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
        exchange: 'xt',
        balance,
        positions,
        trades,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching XT account info:', error);
      throw error;
    }
  }

  /**
   * Test API credentials
   */
  async testConnection() {
    try {
      await this.getBalance();
      return { success: true, message: 'Connected successfully to XT.com' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to connect to XT.com'
      };
    }
  }
}

export default XTAPI;

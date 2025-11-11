/**
 * BingX Exchange API Wrapper
 * Documentation: https://bingx-api.github.io/docs/
 */

import CryptoJS from 'crypto-js';

const BINGX_BASE_URL = 'https://open-api.bingx.com';

class BingXAPI {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = BINGX_BASE_URL;
  }

  /**
   * Generate signature for authenticated requests
   */
  generateSignature(queryString) {
    return CryptoJS.HmacSHA256(queryString, this.apiSecret).toString();
  }

  /**
   * Make authenticated request to BingX API
   */
  async makeRequest(method, endpoint, params = {}, isPublic = false) {
    const timestamp = Date.now();
    const url = new URL(this.baseUrl + endpoint);

    // Add timestamp to params
    if (!isPublic) {
      params.timestamp = timestamp;
    }

    // Sort parameters alphabetically
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});

    const queryString = new URLSearchParams(sortedParams).toString();

    if (method === 'GET') {
      url.search = queryString;
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-BX-APIKEY': this.apiKey,
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
      console.error('BingX API Error:', error);
      throw error;
    }
  }

  /**
   * Get account balance (Perpetual Futures)
   */
  async getBalance() {
    try {
      const response = await this.makeRequest('GET', '/openApi/swap/v2/user/balance');

      // Normalize response format
      const balanceData = response.data?.balance || response.data || {};
      const totalBalance = parseFloat(balanceData.balance || 0);
      const availableBalance = parseFloat(balanceData.availableMargin || 0);
      const unrealizedPnl = parseFloat(balanceData.unrealizedProfit || 0);

      return {
        exchange: 'bingx',
        totalBalance,
        totalEquity: totalBalance + unrealizedPnl,
        availableBalance,
        unrealizedPnl,
        assets: response.data?.balance ? [response.data.balance] : [],
        raw: response
      };
    } catch (error) {
      console.error('Error fetching BingX balance:', error);
      throw error;
    }
  }

  /**
   * Get open positions (Perpetual Futures)
   */
  async getOpenPositions() {
    try {
      const response = await this.makeRequest('GET', '/openApi/swap/v2/user/positions');

      const positions = (response.data || []).map(pos => ({
        symbol: pos.symbol,
        side: pos.positionSide === 'LONG' ? 'LONG' : 'SHORT',
        size: Math.abs(parseFloat(pos.positionAmt || 0)),
        entryPrice: parseFloat(pos.avgPrice || 0),
        currentPrice: parseFloat(pos.markPrice || 0),
        leverage: parseInt(pos.leverage || 1),
        unrealizedPnl: parseFloat(pos.unrealizedProfit || 0),
        liquidationPrice: parseFloat(pos.liquidationPrice || 0),
        margin: parseFloat(pos.isolatedMargin || 0),
        timestamp: pos.updateTime || Date.now(),
        raw: pos
      }));

      return {
        exchange: 'bingx',
        positions,
        count: positions.length
      };
    } catch (error) {
      console.error('Error fetching BingX positions:', error);
      throw error;
    }
  }

  /**
   * Get trade history (Perpetual Futures)
   */
  async getTradeHistory(limit = 100) {
    try {
      const response = await this.makeRequest('GET', '/openApi/swap/v2/user/income', {
        limit: limit
      });

      const trades = (response.data || []).map(trade => ({
        id: trade.tranId || trade.id,
        symbol: trade.symbol,
        side: trade.side,
        type: trade.incomeType || 'TRADE',
        price: parseFloat(trade.price || 0),
        quantity: parseFloat(trade.amount || 0),
        commission: parseFloat(trade.commission || 0),
        realizedPnl: parseFloat(trade.income || 0),
        timestamp: trade.time || trade.timestamp,
        raw: trade
      }));

      return {
        exchange: 'bingx',
        trades,
        count: trades.length
      };
    } catch (error) {
      console.error('Error fetching BingX trade history:', error);
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
        exchange: 'bingx',
        balance,
        positions,
        trades,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching BingX account info:', error);
      throw error;
    }
  }

  /**
   * Test API credentials
   */
  async testConnection() {
    try {
      await this.getBalance();
      return { success: true, message: 'Connected successfully to BingX' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to connect to BingX'
      };
    }
  }
}

export default BingXAPI;

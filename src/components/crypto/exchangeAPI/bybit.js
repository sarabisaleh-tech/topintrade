/**
 * Bybit Exchange API Wrapper (V5)
 * Documentation: https://bybit-exchange.github.io/docs/v5/intro
 */

import CryptoJS from 'crypto-js';

const BYBIT_BASE_URL = 'https://api.bybit.com';

class BybitAPI {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = BYBIT_BASE_URL;
  }

  /**
   * Generate signature for authenticated requests (V5)
   */
  generateSignature(timestamp, params) {
    const paramStr = timestamp + this.apiKey + '5000' + params;
    return CryptoJS.HmacSHA256(paramStr, this.apiSecret).toString();
  }

  /**
   * Make authenticated request to Bybit API
   */
  async makeRequest(method, endpoint, params = {}, isPublic = false) {
    const timestamp = Date.now().toString();
    const url = new URL(this.baseUrl + endpoint);

    let queryString = '';
    if (Object.keys(params).length > 0) {
      queryString = JSON.stringify(params);
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    if (!isPublic) {
      const signature = this.generateSignature(timestamp, queryString);
      headers['X-BAPI-API-KEY'] = this.apiKey;
      headers['X-BAPI-TIMESTAMP'] = timestamp;
      headers['X-BAPI-SIGN'] = signature;
      headers['X-BAPI-RECV-WINDOW'] = '5000';
    }

    if (method === 'GET' && Object.keys(params).length > 0) {
      url.search = new URLSearchParams(params).toString();
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: method === 'POST' ? queryString : undefined,
      });

      const data = await response.json();

      if (data.retCode !== 0) {
        throw new Error(data.retMsg || 'Bybit API Error');
      }

      return data;
    } catch (error) {
      console.error('Bybit API Error:', error);
      throw error;
    }
  }

  /**
   * Get account balance (Unified Trading Account)
   */
  async getBalance() {
    try {
      const response = await this.makeRequest('GET', '/v5/account/wallet-balance', {
        accountType: 'UNIFIED'
      });

      const accountData = response.result?.list?.[0] || {};
      const totalEquity = parseFloat(accountData.totalEquity || 0);
      const totalWalletBalance = parseFloat(accountData.totalWalletBalance || 0);
      const totalAvailableBalance = parseFloat(accountData.totalAvailableBalance || 0);
      const unrealizedPnl = parseFloat(accountData.totalPerpUPL || 0);

      return {
        exchange: 'bybit',
        totalBalance: totalWalletBalance,
        totalEquity,
        availableBalance: totalAvailableBalance,
        unrealizedPnl,
        assets: accountData.coin || [],
        raw: response
      };
    } catch (error) {
      console.error('Error fetching Bybit balance:', error);
      throw error;
    }
  }

  /**
   * Get open positions
   */
  async getOpenPositions() {
    try {
      const response = await this.makeRequest('GET', '/v5/position/list', {
        category: 'linear',
        settleCoin: 'USDT'
      });

      const positions = (response.result?.list || [])
        .filter(pos => parseFloat(pos.size) > 0)
        .map(pos => ({
          symbol: pos.symbol,
          side: pos.side, // 'Buy' or 'Sell'
          size: parseFloat(pos.size || 0),
          entryPrice: parseFloat(pos.avgPrice || 0),
          currentPrice: parseFloat(pos.markPrice || 0),
          leverage: parseFloat(pos.leverage || 1),
          unrealizedPnl: parseFloat(pos.unrealisedPnl || 0),
          liquidationPrice: parseFloat(pos.liqPrice || 0),
          margin: parseFloat(pos.positionIM || 0),
          timestamp: pos.updatedTime || Date.now(),
          raw: pos
        }));

      return {
        exchange: 'bybit',
        positions,
        count: positions.length
      };
    } catch (error) {
      console.error('Error fetching Bybit positions:', error);
      throw error;
    }
  }

  /**
   * Get trade history
   */
  async getTradeHistory(limit = 100) {
    try {
      const response = await this.makeRequest('GET', '/v5/execution/list', {
        category: 'linear',
        limit
      });

      const trades = (response.result?.list || []).map(trade => ({
        id: trade.execId,
        symbol: trade.symbol,
        side: trade.side, // 'Buy' or 'Sell'
        type: trade.orderType,
        price: parseFloat(trade.execPrice || 0),
        quantity: parseFloat(trade.execQty || 0),
        commission: parseFloat(trade.execFee || 0),
        realizedPnl: parseFloat(trade.closedPnl || 0),
        timestamp: parseInt(trade.execTime),
        raw: trade
      }));

      return {
        exchange: 'bybit',
        trades,
        count: trades.length
      };
    } catch (error) {
      console.error('Error fetching Bybit trade history:', error);
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
        exchange: 'bybit',
        balance,
        positions,
        trades,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching Bybit account info:', error);
      throw error;
    }
  }

  /**
   * Test API credentials
   */
  async testConnection() {
    try {
      await this.getBalance();
      return { success: true, message: 'Connected successfully to Bybit' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to connect to Bybit'
      };
    }
  }
}

export default BybitAPI;

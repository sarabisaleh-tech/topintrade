/**
 * Binance Exchange API Wrapper (Futures)
 * Documentation: https://binance-docs.github.io/apidocs/futures/en/
 */

import CryptoJS from 'crypto-js';

const BINANCE_FUTURES_BASE_URL = 'https://fapi.binance.com';

class BinanceAPI {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = BINANCE_FUTURES_BASE_URL;
  }

  /**
   * Generate signature for authenticated requests
   */
  generateSignature(queryString) {
    return CryptoJS.HmacSHA256(queryString, this.apiSecret).toString();
  }

  /**
   * Make authenticated request to Binance API
   */
  async makeRequest(method, endpoint, params = {}, isPublic = false) {
    const timestamp = Date.now();
    const url = new URL(this.baseUrl + endpoint);

    if (!isPublic) {
      params.timestamp = timestamp;
    }

    const queryString = new URLSearchParams(params).toString();

    if (!isPublic && queryString) {
      const signature = this.generateSignature(queryString);
      url.search = queryString + `&signature=${signature}`;
    } else if (queryString) {
      url.search = queryString;
    }

    const headers = {
      'X-MBX-APIKEY': this.apiKey,
    };

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
      console.error('Binance API Error:', error);
      throw error;
    }
  }

  /**
   * Get account balance (Futures)
   */
  async getBalance() {
    try {
      const response = await this.makeRequest('GET', '/fapi/v2/balance');

      const totalBalance = response.reduce((sum, asset) => {
        return sum + parseFloat(asset.balance || 0);
      }, 0);

      const availableBalance = response.reduce((sum, asset) => {
        return sum + parseFloat(asset.availableBalance || 0);
      }, 0);

      // Get account info for unrealized PnL
      const accountInfo = await this.makeRequest('GET', '/fapi/v2/account');
      const unrealizedPnl = parseFloat(accountInfo.totalUnrealizedProfit || 0);

      return {
        exchange: 'binance',
        totalBalance,
        totalEquity: totalBalance + unrealizedPnl,
        availableBalance,
        unrealizedPnl,
        assets: response,
        raw: { balance: response, account: accountInfo }
      };
    } catch (error) {
      console.error('Error fetching Binance balance:', error);
      throw error;
    }
  }

  /**
   * Get open positions (Futures)
   */
  async getOpenPositions() {
    try {
      const response = await this.makeRequest('GET', '/fapi/v2/positionRisk');

      const positions = response
        .filter(pos => parseFloat(pos.positionAmt) !== 0)
        .map(pos => ({
          symbol: pos.symbol,
          side: parseFloat(pos.positionAmt) > 0 ? 'LONG' : 'SHORT',
          size: Math.abs(parseFloat(pos.positionAmt || 0)),
          entryPrice: parseFloat(pos.entryPrice || 0),
          currentPrice: parseFloat(pos.markPrice || 0),
          leverage: parseInt(pos.leverage || 1),
          unrealizedPnl: parseFloat(pos.unRealizedProfit || 0),
          liquidationPrice: parseFloat(pos.liquidationPrice || 0),
          margin: parseFloat(pos.isolatedMargin || 0),
          timestamp: pos.updateTime || Date.now(),
          raw: pos
        }));

      return {
        exchange: 'binance',
        positions,
        count: positions.length
      };
    } catch (error) {
      console.error('Error fetching Binance positions:', error);
      throw error;
    }
  }

  /**
   * Get trade history (Futures)
   */
  async getTradeHistory(limit = 100) {
    try {
      const response = await this.makeRequest('GET', '/fapi/v1/userTrades', { limit });

      const trades = response.map(trade => ({
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side, // 'BUY' or 'SELL'
        type: trade.type,
        price: parseFloat(trade.price || 0),
        quantity: parseFloat(trade.qty || 0),
        commission: parseFloat(trade.commission || 0),
        realizedPnl: parseFloat(trade.realizedPnl || 0),
        timestamp: trade.time,
        raw: trade
      }));

      return {
        exchange: 'binance',
        trades,
        count: trades.length
      };
    } catch (error) {
      console.error('Error fetching Binance trade history:', error);
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
        exchange: 'binance',
        balance,
        positions,
        trades,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching Binance account info:', error);
      throw error;
    }
  }

  /**
   * Test API credentials
   */
  async testConnection() {
    try {
      await this.makeRequest('GET', '/fapi/v2/account');
      return { success: true, message: 'Connected successfully to Binance Futures' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to connect to Binance Futures'
      };
    }
  }
}

export default BinanceAPI;

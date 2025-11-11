/**
 * KuCoin Exchange API Wrapper (Futures)
 * Documentation: https://docs.kucoin.com/futures/
 */

import CryptoJS from 'crypto-js';

const KUCOIN_FUTURES_BASE_URL = 'https://api-futures.kucoin.com';

class KuCoinAPI {
  constructor(apiKey, apiSecret, passphrase) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase; // KuCoin requires passphrase
    this.baseUrl = KUCOIN_FUTURES_BASE_URL;
  }

  /**
   * Generate signature for authenticated requests
   */
  generateSignature(timestamp, method, endpoint, body = '') {
    const message = timestamp + method + endpoint + body;
    return CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(message, this.apiSecret));
  }

  /**
   * Encrypt passphrase
   */
  encryptPassphrase() {
    return CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(this.passphrase, this.apiSecret));
  }

  /**
   * Make authenticated request to KuCoin API
   */
  async makeRequest(method, endpoint, params = {}, isPublic = false) {
    const timestamp = Date.now().toString();
    const url = new URL(this.baseUrl + endpoint);

    let body = '';
    let fullEndpoint = endpoint;

    if (method === 'GET' && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      url.search = queryString;
      fullEndpoint = endpoint + '?' + queryString;
    } else if (method === 'POST' && Object.keys(params).length > 0) {
      body = JSON.stringify(params);
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    if (!isPublic) {
      const signature = this.generateSignature(timestamp, method, fullEndpoint, body);
      const encryptedPassphrase = this.encryptPassphrase();

      headers['KC-API-KEY'] = this.apiKey;
      headers['KC-API-SIGN'] = signature;
      headers['KC-API-TIMESTAMP'] = timestamp;
      headers['KC-API-PASSPHRASE'] = encryptedPassphrase;
      headers['KC-API-KEY-VERSION'] = '2';
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: method === 'POST' ? body : undefined,
      });

      const data = await response.json();

      if (data.code !== '200000') {
        throw new Error(data.msg || 'KuCoin API Error');
      }

      return data;
    } catch (error) {
      console.error('KuCoin API Error:', error);
      throw error;
    }
  }

  /**
   * Get account balance (Futures)
   */
  async getBalance() {
    try {
      const response = await this.makeRequest('GET', '/api/v1/account-overview');

      const accountData = response.data || {};
      const totalBalance = parseFloat(accountData.accountEquity || 0);
      const availableBalance = parseFloat(accountData.availableBalance || 0);
      const unrealizedPnl = parseFloat(accountData.unrealisedPNL || 0);

      return {
        exchange: 'kucoin',
        totalBalance: totalBalance - unrealizedPnl,
        totalEquity: totalBalance,
        availableBalance,
        unrealizedPnl,
        assets: [accountData],
        raw: response
      };
    } catch (error) {
      console.error('Error fetching KuCoin balance:', error);
      throw error;
    }
  }

  /**
   * Get open positions (Futures)
   */
  async getOpenPositions() {
    try {
      const response = await this.makeRequest('GET', '/api/v1/positions');

      const positions = (response.data || [])
        .filter(pos => parseFloat(pos.currentQty) !== 0)
        .map(pos => ({
          symbol: pos.symbol,
          side: parseFloat(pos.currentQty) > 0 ? 'LONG' : 'SHORT',
          size: Math.abs(parseFloat(pos.currentQty || 0)),
          entryPrice: parseFloat(pos.avgEntryPrice || 0),
          currentPrice: parseFloat(pos.markPrice || 0),
          leverage: parseFloat(pos.realLeverage || 1),
          unrealizedPnl: parseFloat(pos.unrealisedPnl || 0),
          liquidationPrice: parseFloat(pos.liquidationPrice || 0),
          margin: parseFloat(pos.posMaint || 0),
          timestamp: pos.updatedAt || Date.now(),
          raw: pos
        }));

      return {
        exchange: 'kucoin',
        positions,
        count: positions.length
      };
    } catch (error) {
      console.error('Error fetching KuCoin positions:', error);
      throw error;
    }
  }

  /**
   * Get trade history (Futures)
   */
  async getTradeHistory(limit = 100) {
    try {
      const response = await this.makeRequest('GET', '/api/v1/fills', { pageSize: limit });

      const trades = (response.data?.items || []).map(trade => ({
        id: trade.tradeId,
        symbol: trade.symbol,
        side: trade.side, // 'buy' or 'sell'
        type: trade.orderType,
        price: parseFloat(trade.price || 0),
        quantity: parseFloat(trade.size || 0),
        commission: parseFloat(trade.fee || 0),
        realizedPnl: parseFloat(trade.settleCurrency === 'USDT' ? trade.fee : 0),
        timestamp: trade.createdAt,
        raw: trade
      }));

      return {
        exchange: 'kucoin',
        trades,
        count: trades.length
      };
    } catch (error) {
      console.error('Error fetching KuCoin trade history:', error);
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
        exchange: 'kucoin',
        balance,
        positions,
        trades,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching KuCoin account info:', error);
      throw error;
    }
  }

  /**
   * Test API credentials
   */
  async testConnection() {
    try {
      await this.getBalance();
      return { success: true, message: 'Connected successfully to KuCoin Futures' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to connect to KuCoin Futures'
      };
    }
  }
}

export default KuCoinAPI;

/**
 * OKX Exchange API Wrapper
 * Documentation: https://www.okx.com/docs-v5/en/
 */

import CryptoJS from 'crypto-js';

const OKX_BASE_URL = 'https://www.okx.com';

class OKXAPI {
  constructor(apiKey, apiSecret, passphrase) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase; // OKX requires passphrase
    this.baseUrl = OKX_BASE_URL;
  }

  /**
   * Generate signature for authenticated requests
   */
  generateSignature(timestamp, method, endpoint, body = '') {
    const message = timestamp + method + endpoint + body;
    return CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(message, this.apiSecret));
  }

  /**
   * Make authenticated request to OKX API
   */
  async makeRequest(method, endpoint, params = {}, isPublic = false) {
    const timestamp = new Date().toISOString();
    const url = new URL(this.baseUrl + endpoint);

    let body = '';
    if (method === 'GET' && Object.keys(params).length > 0) {
      url.search = new URLSearchParams(params).toString();
      endpoint = endpoint + '?' + url.search;
    } else if (method === 'POST' && Object.keys(params).length > 0) {
      body = JSON.stringify(params);
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    if (!isPublic) {
      const signature = this.generateSignature(timestamp, method, endpoint, body);
      headers['OK-ACCESS-KEY'] = this.apiKey;
      headers['OK-ACCESS-SIGN'] = signature;
      headers['OK-ACCESS-TIMESTAMP'] = timestamp;
      headers['OK-ACCESS-PASSPHRASE'] = this.passphrase;
    }

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: method === 'POST' ? body : undefined,
      });

      const data = await response.json();

      if (data.code !== '0') {
        throw new Error(data.msg || 'OKX API Error');
      }

      return data;
    } catch (error) {
      console.error('OKX API Error:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getBalance() {
    try {
      const response = await this.makeRequest('GET', '/api/v5/account/balance');

      const accountData = response.data?.[0] || {};
      const totalEquity = parseFloat(accountData.totalEq || 0);
      const availableBalance = parseFloat(accountData.availBal || 0);

      // Calculate unrealized PnL from details
      const details = accountData.details || [];
      const unrealizedPnl = details.reduce((sum, asset) => {
        return sum + parseFloat(asset.upl || 0);
      }, 0);

      return {
        exchange: 'okx',
        totalBalance: totalEquity - unrealizedPnl,
        totalEquity,
        availableBalance,
        unrealizedPnl,
        assets: details,
        raw: response
      };
    } catch (error) {
      console.error('Error fetching OKX balance:', error);
      throw error;
    }
  }

  /**
   * Get open positions
   */
  async getOpenPositions() {
    try {
      const response = await this.makeRequest('GET', '/api/v5/account/positions');

      const positions = (response.data || [])
        .filter(pos => parseFloat(pos.pos) !== 0)
        .map(pos => ({
          symbol: pos.instId,
          side: parseFloat(pos.pos) > 0 ? 'LONG' : 'SHORT',
          size: Math.abs(parseFloat(pos.pos || 0)),
          entryPrice: parseFloat(pos.avgPx || 0),
          currentPrice: parseFloat(pos.markPx || 0),
          leverage: parseFloat(pos.lever || 1),
          unrealizedPnl: parseFloat(pos.upl || 0),
          liquidationPrice: parseFloat(pos.liqPx || 0),
          margin: parseFloat(pos.margin || 0),
          timestamp: parseInt(pos.uTime || Date.now()),
          raw: pos
        }));

      return {
        exchange: 'okx',
        positions,
        count: positions.length
      };
    } catch (error) {
      console.error('Error fetching OKX positions:', error);
      throw error;
    }
  }

  /**
   * Get trade history
   */
  async getTradeHistory(limit = 100) {
    try {
      const response = await this.makeRequest('GET', '/api/v5/trade/fills', {
        instType: 'SWAP',
        limit
      });

      const trades = (response.data || []).map(trade => ({
        id: trade.tradeId,
        symbol: trade.instId,
        side: trade.side, // 'buy' or 'sell'
        type: trade.ordType,
        price: parseFloat(trade.fillPx || 0),
        quantity: parseFloat(trade.fillSz || 0),
        commission: parseFloat(trade.fee || 0),
        realizedPnl: parseFloat(trade.pnl || 0),
        timestamp: parseInt(trade.ts),
        raw: trade
      }));

      return {
        exchange: 'okx',
        trades,
        count: trades.length
      };
    } catch (error) {
      console.error('Error fetching OKX trade history:', error);
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
        exchange: 'okx',
        balance,
        positions,
        trades,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching OKX account info:', error);
      throw error;
    }
  }

  /**
   * Test API credentials
   */
  async testConnection() {
    try {
      await this.getBalance();
      return { success: true, message: 'Connected successfully to OKX' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to connect to OKX'
      };
    }
  }
}

export default OKXAPI;

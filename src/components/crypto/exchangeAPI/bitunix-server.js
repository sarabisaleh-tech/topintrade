/**
 * BitUnix Exchange API Wrapper (via Python Server)
 * دور زدن مشکل CORS با استفاده از Python Backend
 */

const PYTHON_SERVER_URL = 'http://localhost:5001';

class BitUnixServerAPI {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.exchange = 'bitunix';
  }

  /**
   * Make request through Python server
   */
  async makeServerRequest(endpoint, data = {}) {
    const url = `${PYTHON_SERVER_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exchange: this.exchange,
          apiKey: this.apiKey,
          apiSecret: this.apiSecret,
          ...data
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Server request failed');
      }

      return result.data;
    } catch (error) {
      console.error('Server API Error:', error);
      throw error;
    }
  }

  /**
   * Get account balance
   */
  async getBalance() {
    try {
      const data = await this.makeServerRequest('/api/crypto/balance');

      // Normalize response format
      return {
        exchange: 'bitunix',
        totalBalance: parseFloat(data?.totalBalance || 0),
        totalEquity: parseFloat(data?.totalEquity || 0),
        availableBalance: parseFloat(data?.availableBalance || 0),
        unrealizedPnl: parseFloat(data?.unrealizedPnl || 0),
        assets: data?.assets || [],
        raw: data
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
      const data = await this.makeServerRequest('/api/crypto/positions');

      const positions = (data || []).map(pos => ({
        symbol: pos.symbol,
        side: pos.side,
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
      const data = await this.makeServerRequest('/api/crypto/trades', { limit });

      const trades = (data || []).map(trade => ({
        id: trade.id || trade.tradeId,
        symbol: trade.symbol,
        side: trade.side,
        type: trade.type,
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
      const data = await this.makeServerRequest('/api/crypto/account');

      return {
        exchange: 'bitunix',
        balance: {
          totalBalance: parseFloat(data.balance?.totalBalance || 0),
          totalEquity: parseFloat(data.balance?.totalEquity || 0),
          availableBalance: parseFloat(data.balance?.availableBalance || 0),
          unrealizedPnl: parseFloat(data.balance?.unrealizedPnl || 0),
        },
        positions: {
          positions: data.positions || [],
          count: data.positions?.length || 0
        },
        trades: {
          trades: data.trades || [],
          count: data.trades?.length || 0
        },
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
      await this.makeServerRequest('/api/crypto/test');
      return { success: true, message: 'Connected successfully to BitUnix via Python server' };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to connect to BitUnix'
      };
    }
  }
}

export default BitUnixServerAPI;

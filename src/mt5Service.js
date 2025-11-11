import MetaApi from 'metaapi.cloud-sdk';

// MT5 Service for connecting and syncing data
class MT5Service {
  constructor() {
    this.api = null;
    this.account = null;
    this.connection = null;
    this.isConnected = false;
    this.syncListeners = [];
    this.positionListeners = [];
    this.historyListeners = [];
  }

  /**
   * Connect to MT5 account
   * @param {string} token - MetaApi token (user needs to get this from metaapi.cloud)
   * @param {string} accountId - MT5 account number
   * @param {string} password - Investor password
   * @param {string} server - Broker server name
   * @param {string} platform - 'mt5' or 'mt4'
   */
  async connect(token, accountId, password, server, platform = 'mt5') {
    try {
      // Initialize MetaApi
      this.api = new MetaApi(token);

      // Check if account already exists
      let accounts = await this.api.metatraderAccountApi.getAccounts();
      this.account = accounts.find(a => a.login === accountId && a.type === 'cloud');

      // If account doesn't exist, create it
      if (!this.account) {
        this.account = await this.api.metatraderAccountApi.createAccount({
          name: `MT5-${accountId}`,
          type: 'cloud',
          login: accountId,
          password: password,
          server: server,
          platform: platform,
          magic: 0,
          application: 'MetaApi',
          tags: ['trading-journal']
        });
      }

      // Wait for account to be deployed
      await this.account.deploy();
      await this.account.waitConnected();

      // Create connection
      this.connection = this.account.getRPCConnection();
      await this.connection.connect();
      await this.connection.waitSynchronized();

      this.isConnected = true;

      // Notify listeners
      this.syncListeners.forEach(listener => listener({ status: 'connected' }));

      return {
        success: true,
        message: 'Successfully connected to MT5',
        accountInfo: await this.getAccountInfo()
      };

    } catch (error) {
      console.error('MT5 Connection Error:', error);
      this.isConnected = false;

      return {
        success: false,
        message: error.message || 'Failed to connect to MT5',
        error: error
      };
    }
  }

  /**
   * Disconnect from MT5
   */
  async disconnect() {
    try {
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      this.syncListeners.forEach(listener => listener({ status: 'disconnected' }));

      return { success: true };
    } catch (error) {
      console.error('Disconnect Error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo() {
    if (!this.connection) {
      throw new Error('Not connected to MT5');
    }

    const accountInfo = await this.connection.getAccountInformation();
    return {
      balance: accountInfo.balance,
      equity: accountInfo.equity,
      margin: accountInfo.margin,
      freeMargin: accountInfo.freeMargin,
      profit: accountInfo.profit,
      leverage: accountInfo.leverage,
      name: accountInfo.name,
      server: accountInfo.server,
      currency: accountInfo.currency
    };
  }

  /**
   * Get open positions
   */
  async getOpenPositions() {
    if (!this.connection) {
      throw new Error('Not connected to MT5');
    }

    const positions = await this.connection.getPositions();
    return positions.map(pos => ({
      id: pos.id,
      symbol: pos.symbol,
      type: pos.type, // BUY or SELL
      volume: pos.volume,
      openPrice: pos.openPrice,
      currentPrice: pos.currentPrice,
      profit: pos.profit,
      swap: pos.swap,
      commission: pos.commission,
      openTime: new Date(pos.time),
      stopLoss: pos.stopLoss,
      takeProfit: pos.takeProfit,
      comment: pos.comment
    }));
  }

  /**
   * Get trading history (closed positions)
   * @param {Date} startTime - Start date
   * @param {Date} endTime - End date
   */
  async getHistory(startTime, endTime) {
    if (!this.connection) {
      throw new Error('Not connected to MT5');
    }

    const deals = await this.connection.getDealsByTimeRange(startTime, endTime);

    // Group deals by position ID to reconstruct trades
    const positions = {};

    deals.forEach(deal => {
      if (deal.positionId) {
        if (!positions[deal.positionId]) {
          positions[deal.positionId] = {
            id: deal.positionId,
            symbol: deal.symbol,
            deals: []
          };
        }
        positions[deal.positionId].deals.push(deal);
      }
    });

    // Convert to trade format
    const trades = Object.values(positions).map(pos => {
      const sortedDeals = pos.deals.sort((a, b) => new Date(a.time) - new Date(b.time));
      const openDeal = sortedDeals[0];
      const closeDeal = sortedDeals[sortedDeals.length - 1];

      const volume = sortedDeals.reduce((sum, d) => sum + (d.volume || 0), 0);
      const profit = sortedDeals.reduce((sum, d) => sum + (d.profit || 0), 0);
      const commission = sortedDeals.reduce((sum, d) => sum + (d.commission || 0), 0);
      const swap = sortedDeals.reduce((sum, d) => sum + (d.swap || 0), 0);

      return {
        id: pos.id,
        symbol: pos.symbol,
        type: openDeal.type, // BUY or SELL
        volume: Math.abs(volume),
        openPrice: openDeal.price,
        closePrice: closeDeal.price,
        openTime: new Date(openDeal.time),
        closeTime: new Date(closeDeal.time),
        profit: profit,
        commission: commission,
        swap: swap,
        totalPnL: profit + commission + swap,
        comment: openDeal.comment || '',
        ticket: pos.id
      };
    });

    return trades;
  }

  /**
   * Subscribe to real-time updates
   */
  subscribeSyncEvents(callback) {
    this.syncListeners.push(callback);

    if (this.connection) {
      // Listen to position updates
      this.connection.addSynchronizationListener({
        onPositionUpdated: async (instanceIndex, position) => {
          callback({
            type: 'position_updated',
            data: position
          });
        },
        onPositionRemoved: async (instanceIndex, positionId) => {
          callback({
            type: 'position_closed',
            data: { id: positionId }
          });
        },
        onDealAdded: async (instanceIndex, deal) => {
          callback({
            type: 'deal_added',
            data: deal
          });
        }
      });
    }
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribeSyncEvents(callback) {
    this.syncListeners = this.syncListeners.filter(listener => listener !== callback);
  }

  /**
   * Check connection status
   */
  isAccountConnected() {
    return this.isConnected;
  }

  /**
   * Get connection instance
   */
  getConnection() {
    return this.connection;
  }
}

// Export singleton instance
export const mt5Service = new MT5Service();
export default mt5Service;

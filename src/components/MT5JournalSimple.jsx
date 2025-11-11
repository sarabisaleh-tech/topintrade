import React, { useMemo } from 'react';
import { useMT5Data } from './MT5DataProvider';
import MT5ConnectionStatus from './MT5ConnectionStatus';
import MT5TradeLog from './MT5TradeLog';

export default function MT5JournalSimple({ onBack }) {
  const mt5Data = useMT5Data();

  const {
    accountInfo,
    openPositions,
    tradeHistory,
    lastUpdate,
    connected,
    loading,
    balance,
    equity,
    profit
  } = mt5Data;

  // Calculate statistics from trade history
  const stats = useMemo(() => {
    if (!tradeHistory || tradeHistory.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalProfit: 0,
        totalLoss: 0,
        netProfit: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0
      };
    }

    const closedDeals = tradeHistory.filter(trade => {
      // Only count OUT trades (closed positions)
      return trade.entry === 1; // 1 = OUT
    });

    const winningTrades = closedDeals.filter(trade => trade.profit > 0);
    const losingTrades = closedDeals.filter(trade => trade.profit < 0);

    const totalProfit = winningTrades.reduce((sum, trade) => sum + trade.profit, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.profit, 0));
    const netProfit = totalProfit - totalLoss;

    const avgWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;

    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;

    return {
      totalTrades: closedDeals.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: closedDeals.length > 0 ? (winningTrades.length / closedDeals.length) * 100 : 0,
      totalProfit,
      totalLoss,
      netProfit,
      avgWin,
      avgLoss,
      profitFactor
    };
  }, [tradeHistory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading MT5 data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MT5 Trading Journal</h1>
          <p className="text-gray-400 mt-1">Real-time trading monitor</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
        >
          ← Back to Home
        </button>
      </div>

      {/* Connection Status */}
      <div className="mb-6">
        <MT5ConnectionStatus
          connected={connected}
          lastUpdate={lastUpdate}
          accountInfo={accountInfo}
        />
      </div>

      {/* Account Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Balance</div>
          <div className="text-2xl font-bold text-white">
            ${balance.toFixed(2)}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Equity</div>
          <div className="text-2xl font-bold text-white">
            ${equity.toFixed(2)}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Floating P/L</div>
          <div className={`text-2xl font-bold ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Win Rate</div>
          <div className={`text-2xl font-bold ${stats.winRate >= 50 ? 'text-green-500' : 'text-yellow-500'}`}>
            {stats.winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {stats.winningTrades}W / {stats.losingTrades}L
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Total Trades</div>
          <div className="text-xl font-bold">{stats.totalTrades}</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Net Profit</div>
          <div className={`text-xl font-bold ${stats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toFixed(2)}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Profit Factor</div>
          <div className={`text-xl font-bold ${stats.profitFactor >= 1.5 ? 'text-green-500' : stats.profitFactor >= 1 ? 'text-yellow-500' : 'text-red-500'}`}>
            {stats.profitFactor.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Open Positions */}
      {openPositions && openPositions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-3">Open Positions ({openPositions.length})</h2>
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Ticket</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Symbol</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Volume</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Open Price</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Current Price</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {openPositions.map((pos, idx) => (
                    <tr key={idx} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-sm">{pos.ticket}</td>
                      <td className="px-4 py-3 text-sm font-medium">{pos.symbol}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          pos.type === 0 ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {pos.type === 0 ? 'BUY' : 'SELL'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">{pos.volume?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right">{pos.price_open?.toFixed(5)}</td>
                      <td className="px-4 py-3 text-sm text-right">{pos.price_current?.toFixed(5)}</td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${
                        pos.profit >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {pos.profit >= 0 ? '+' : ''}{pos.profit?.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Trade History */}
      <div>
        <h2 className="text-xl font-bold mb-3">Trade History ({stats.totalTrades})</h2>
        <MT5TradeLog trades={tradeHistory} />
      </div>
    </div>
  );
}

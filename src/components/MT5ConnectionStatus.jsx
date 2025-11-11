import React from 'react';

export default function MT5ConnectionStatus({ connected, lastUpdate, accountInfo, compact = false }) {
  const getConnectionStatus = () => {
    if (!lastUpdate) {
      return { status: 'disconnected', text: 'Not Connected', color: 'text-gray-400' };
    }

    const now = new Date();
    const updateTime = lastUpdate instanceof Date ? lastUpdate : lastUpdate.toDate?.() || new Date(lastUpdate);
    const diffMs = now - updateTime;
    const diffSeconds = Math.floor(diffMs / 1000);

    // If updated within last 30 seconds, consider connected
    if (diffSeconds < 30) {
      return {
        status: 'connected',
        text: `Connected to ${accountInfo?.server || 'Broker'}`,
        color: 'text-green-500',
        lastUpdateText: 'Live'
      };
    } else if (diffSeconds < 120) {
      return {
        status: 'syncing',
        text: 'Syncing...',
        color: 'text-yellow-500',
        lastUpdateText: `${diffSeconds}s ago`
      };
    } else {
      return {
        status: 'disconnected',
        text: 'Disconnected',
        color: 'text-red-500',
        lastUpdateText: formatTimeSince(diffSeconds)
      };
    }
  };

  const formatTimeSince = (seconds) => {
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const { status, text, color, lastUpdateText } = getConnectionStatus();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          status === 'connected' ? 'bg-green-500 animate-pulse' :
          status === 'syncing' ? 'bg-yellow-500 animate-pulse' :
          'bg-red-500'
        }`}></div>
        <span className={`text-sm ${color}`}>{text}</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            status === 'connected' ? 'bg-green-500 animate-pulse' :
            status === 'syncing' ? 'bg-yellow-500 animate-pulse' :
            'bg-red-500'
          }`}></div>
          <div>
            <div className={`font-medium ${color}`}>{text}</div>
            {accountInfo && status === 'connected' && (
              <div className="text-sm text-gray-400 mt-1">
                Account: {accountInfo.login} | Server: {accountInfo.server}
              </div>
            )}
          </div>
        </div>
        {lastUpdate && (
          <div className="text-sm text-gray-400">
            {lastUpdateText}
          </div>
        )}
      </div>

      {status === 'disconnected' && (
        <div className="mt-3 text-sm text-gray-400">
          <p>Make sure your MT5 terminal is running with the TradingMonitor EA active.</p>
        </div>
      )}
    </div>
  );
}

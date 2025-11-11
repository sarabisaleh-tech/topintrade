import React, { useState } from 'react';
import CryptoJournalApp from './CryptoJournalApp';
import CryptoModeSelection from './components/crypto/CryptoModeSelection';
import CryptoExchangeSetup from './components/crypto/CryptoExchangeSetup';
import CryptoLiveDataProvider from './components/crypto/CryptoLiveDataProvider';

export default function CryptoJournalAppWrapper({ onBack }) {
  const [mode, setMode] = useState('selection'); // 'selection', 'journal', 'live-setup', 'live-journal'
  const [credentials, setCredentials] = useState(null);

  const handleModeSelect = (selectedMode) => {
    if (selectedMode === 'journal') {
      setMode('journal');
    } else if (selectedMode === 'live') {
      setMode('live-setup');
    }
  };

  const handleLiveConnect = (creds) => {
    setCredentials(creds);
    setMode('live-journal');
  };

  const handleDisconnect = () => {
    setCredentials(null);
    setMode('selection');
  };

  const handleBackToSelection = () => {
    setMode('selection');
  };

  // Mode Selection
  if (mode === 'selection') {
    return (
      <CryptoModeSelection
        onSelectMode={handleModeSelect}
        onBack={onBack}
      />
    );
  }

  // Journal Mode (existing CryptoJournalApp without live)
  if (mode === 'journal') {
    return (
      <CryptoJournalApp onBack={handleBackToSelection} liveMode={false} />
    );
  }

  // Live Trading Setup
  if (mode === 'live-setup') {
    return (
      <CryptoExchangeSetup
        onConnect={handleLiveConnect}
        onCancel={handleBackToSelection}
      />
    );
  }

  // Live Trading Journal (CryptoJournalApp with live data)
  if (mode === 'live-journal') {
    return (
      <CryptoLiveDataProvider credentials={credentials}>
        <CryptoJournalApp
          onBack={handleDisconnect}
          liveMode={true}
          exchangeInfo={credentials}
        />
      </CryptoLiveDataProvider>
    );
  }

  return null;
}

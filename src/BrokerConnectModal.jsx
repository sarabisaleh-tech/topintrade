import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Copy, Download, CheckCircle, AlertCircle, Key, RefreshCw, ExternalLink } from 'lucide-react';
import { useAuth } from './AuthContext';
import { getUserApiKey, generateApiKey } from './api/mt5-receiver';

const BrokerConnectModal = ({ isOpen, onClose, themeColors }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState('mt5-setup'); // Direct to setup
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  // Load API Key when modal opens
  useEffect(() => {
    if (isOpen && currentUser) {
      loadApiKey();
    }
  }, [isOpen, currentUser]);

  const loadApiKey = async () => {
    setLoading(true);
    try {
      let key = await getUserApiKey(currentUser.uid);

      // If no API key exists, generate one
      if (!key) {
        key = await generateApiKey(currentUser.uid);
      }

      setApiKey(key);
    } catch (error) {
      console.error('Error loading API key:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNewKey = async () => {
    if (!confirm('Are you sure you want to generate a new API Key? Your old key will stop working.')) {
      return;
    }

    setLoading(true);
    try {
      const newKey = await generateApiKey(currentUser.uid);
      setApiKey(newKey);
    } catch (error) {
      console.error('Error generating API key:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, setCopiedState) => {
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const downloadEA = () => {
    // Link to EA file (you'll need to upload the compiled .ex5 file)
    window.open('https://topintrade.surge.sh/EA/TopInTrade-Sync.ex5', '_blank');
  };

  const downloadGuide = () => {
    // Link to installation guide
    window.open('https://topintrade.surge.sh/EA/INSTALLATION-GUIDE.pdf', '_blank');
  };

  const handleClose = () => {
    setCopied(false);
    setEmailCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          background: themeColors.surface,
          border: `1px solid ${themeColors.border}`
        }}
      >
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: themeColors.border }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: `${themeColors.primary}20` }}
              >
                <TrendingUp className="w-6 h-6" style={{ color: themeColors.primary }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: themeColors.text }}>
                  Connect MT5 Account
                </h2>
                <p className="text-sm" style={{ color: themeColors.textSecondary }}>
                  Real-time sync with Expert Advisor
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg transition-colors hover:opacity-80"
              style={{
                background: themeColors.surfaceLight,
                color: themeColors.textSecondary
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Your Credentials */}
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: themeColors.text }}>
              <Key className="w-5 h-5" style={{ color: themeColors.primary }} />
              Step 1: Copy Your Credentials
            </h3>

            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: themeColors.textSecondary }}>
                  Your Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentUser?.email || currentUser?.uid}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-lg border font-mono text-sm"
                    style={{
                      background: themeColors.surfaceLight,
                      borderColor: themeColors.border,
                      color: themeColors.text
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(currentUser?.email || currentUser?.uid, setEmailCopied)}
                    className="px-4 py-3 rounded-lg font-medium transition-all hover:scale-105 flex items-center gap-2"
                    style={{
                      background: emailCopied ? themeColors.success : themeColors.primary,
                      color: themeColors.text
                    }}
                  >
                    {emailCopied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    {emailCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center justify-between" style={{ color: themeColors.textSecondary }}>
                  <span>Your API Key</span>
                  <button
                    onClick={handleGenerateNewKey}
                    disabled={loading}
                    className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                    style={{ color: themeColors.primary }}
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    Generate New
                  </button>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={apiKey || 'Loading...'}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-lg border font-mono text-sm"
                    style={{
                      background: themeColors.surfaceLight,
                      borderColor: themeColors.border,
                      color: themeColors.text
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(apiKey, setCopied)}
                    disabled={!apiKey}
                    className="px-4 py-3 rounded-lg font-medium transition-all hover:scale-105 flex items-center gap-2"
                    style={{
                      background: copied ? themeColors.success : themeColors.primary,
                      color: themeColors.text,
                      opacity: !apiKey ? 0.5 : 1
                    }}
                  >
                    {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: themeColors.textSecondary }}>
                  Keep this key safe! You'll need it to configure the EA.
                </p>
              </div>
            </div>
          </div>

          {/* Download EA */}
          <div
            className="p-4 rounded-lg border"
            style={{
              background: `${themeColors.info}10`,
              borderColor: `${themeColors.info}40`
            }}
          >
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: themeColors.info }}>
              <Download className="w-5 h-5" />
              Step 2: Download Expert Advisor
            </h3>

            <div className="flex gap-3">
              <button
                onClick={downloadEA}
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-all hover:scale-105 flex items-center justify-center gap-2"
                style={{
                  background: themeColors.primary,
                  color: themeColors.text
                }}
              >
                <Download className="w-5 h-5" />
                Download EA (.ex5)
              </button>

              <button
                onClick={downloadGuide}
                className="flex-1 px-4 py-3 rounded-lg font-medium transition-all hover:scale-105 flex items-center justify-center gap-2"
                style={{
                  background: themeColors.surfaceLight,
                  color: themeColors.text,
                  border: `1px solid ${themeColors.border}`
                }}
              >
                <ExternalLink className="w-5 h-5" />
                Installation Guide
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-lg font-bold mb-3" style={{ color: themeColors.text }}>
              Step 3: Install & Configure
            </h3>

            <div className="space-y-3">
              {[
                {
                  num: '1',
                  title: 'Open MT5 Data Folder',
                  desc: 'In MT5: File → Open Data Folder → MQL5 → Experts'
                },
                {
                  num: '2',
                  title: 'Copy EA File',
                  desc: 'Paste the downloaded TopInTrade-Sync.ex5 file into the Experts folder'
                },
                {
                  num: '3',
                  title: 'Restart MT5',
                  desc: 'Close and reopen MetaTrader 5'
                },
                {
                  num: '4',
                  title: 'Enable WebRequest',
                  desc: 'Tools → Options → Expert Advisors → Allow WebRequest for: https://topintrade.surge.sh'
                },
                {
                  num: '5',
                  title: 'Drag EA to Chart',
                  desc: 'From Navigator → Experts, drag TopInTrade-Sync to any chart'
                },
                {
                  num: '6',
                  title: 'Enter Your Credentials',
                  desc: 'Paste your Email and API Key (from above) into the EA settings'
                },
                {
                  num: '7',
                  title: 'Enable AutoTrading',
                  desc: 'Click the AutoTrading button (must be green ✅)'
                }
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border flex gap-4"
                  style={{
                    background: themeColors.surfaceLight,
                    borderColor: themeColors.border
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0"
                    style={{
                      background: themeColors.primary,
                      color: themeColors.text
                    }}
                  >
                    {step.num}
                  </div>
                  <div>
                    <h4 className="font-bold mb-1" style={{ color: themeColors.text }}>
                      {step.title}
                    </h4>
                    <p className="text-sm" style={{ color: themeColors.textSecondary }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Notice */}
          <div
            className="p-4 rounded-lg border"
            style={{
              background: `${themeColors.success}10`,
              borderColor: `${themeColors.success}40`
            }}
          >
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: themeColors.success }} />
              <div>
                <h4 className="font-bold mb-1" style={{ color: themeColors.success }}>
                  100% Safe for Prop Firms
                </h4>
                <p className="text-sm" style={{ color: themeColors.textSecondary }}>
                  This EA is <strong>Read-Only</strong> and does NOT open any trades. It only reads your positions and sends data to your TopInTrade dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t" style={{ borderColor: themeColors.border }}>
            <button
              onClick={handleClose}
              className="px-6 py-3 rounded-lg font-medium transition-all hover:scale-105"
              style={{
                background: themeColors.surfaceLight,
                color: themeColors.text,
                border: `1px solid ${themeColors.border}`
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrokerConnectModal;

import React, { useState } from 'react';
import { Eye, EyeOff, ExternalLink, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { getAllExchanges, requiresPassphrase, createExchangeAPI } from './exchangeAPI/exchangeFactory';

// استایل‌های Theme مطابق با CryptoJournalApp
const themeColors = {
  primary: '#ea580c',
  primaryLight: '#f97316',
  primaryDark: '#c2410c',
  success: '#ea580c',
  danger: '#8e1616ff',
  background: '#000000',
  surface: '#151516ff',
  surfaceLight: '#131414ff',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  border: '#18191bff',
};

export default function CryptoExchangeSetup({ onConnect, onCancel }) {
  const [selectedExchange, setSelectedExchange] = useState('bitunix');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const exchanges = getAllExchanges();
  const needsPassphrase = requiresPassphrase(selectedExchange);

  const handleConnect = async () => {
    const selectedExchangeInfo = exchanges.find(ex => ex.id === selectedExchange);
    const isDisabled = selectedExchangeInfo?.disabled || false;

    // Check if exchange is disabled
    if (isDisabled) {
      setError(selectedExchangeInfo?.disabledMessage || 'این صرافی هنوز پشتیبانی نمی‌شود');
      return;
    }

    // Validation
    if (!apiKey.trim()) {
      setError('لطفاً API Key را وارد کنید');
      return;
    }

    if (!apiSecret.trim()) {
      setError('لطفاً API Secret را وارد کنید');
      return;
    }

    if (needsPassphrase && !passphrase.trim()) {
      setError('لطفاً Passphrase را وارد کنید');
      return;
    }

    setError('');
    setIsConnecting(true);

    try {
      // ایجاد API instance و تست اتصال
      const api = createExchangeAPI(
        selectedExchange,
        apiKey.trim(),
        apiSecret.trim(),
        needsPassphrase ? passphrase.trim() : null
      );

      // تست اتصال
      const testResult = await api.testConnection();

      if (!testResult.success) {
        throw new Error(testResult.message);
      }

      setSuccess(true);

      // ارسال اطلاعات به parent component
      setTimeout(() => {
        onConnect({
          exchange: selectedExchange,
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
          passphrase: needsPassphrase ? passphrase.trim() : null,
          api
        });
      }, 1000);

    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message || 'خطا در اتصال به صرافی. لطفاً API Keys را بررسی کنید.');
      setIsConnecting(false);
      setSuccess(false);
    }
  };

  const selectedExchangeInfo = exchanges.find(ex => ex.id === selectedExchange);
  const isDisabledExchange = selectedExchangeInfo?.disabled || false;

  return (
    <div style={{
      minHeight: '100vh',
      background: themeColors.background,
      color: themeColors.text,
      padding: '2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        background: themeColors.surface,
        border: `1px solid ${themeColors.border}`,
        borderRadius: '12px',
        padding: '2rem'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.75rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            color: themeColors.primary
          }}>
            🔗 اتصال به صرافی
          </h2>
          <p style={{ color: themeColors.textSecondary, fontSize: '0.875rem' }}>
            برای نمایش داده‌های لایو، API Keys خود را وارد کنید
          </p>
        </div>

        {/* Exchange Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: themeColors.textSecondary
          }}>
            انتخاب صرافی
          </label>
          <select
            value={selectedExchange}
            onChange={(e) => {
              setSelectedExchange(e.target.value);
              setError('');
              setSuccess(false);
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: themeColors.surfaceLight,
              border: `1px solid ${themeColors.border}`,
              borderRadius: '8px',
              color: themeColors.text,
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            {exchanges.map(exchange => (
              <option key={exchange.id} value={exchange.id}>
                {exchange.logo} {exchange.name}
              </option>
            ))}
          </select>
        </div>

        {/* Disabled Exchange Warning */}
        {isDisabledExchange && (
          <div style={{
            padding: '0.75rem',
            background: '#f59e0b20',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: '#f59e0b'
          }}>
            ⚠️ {selectedExchangeInfo?.disabledMessage}
          </div>
        )}

        {/* API Key Input */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: themeColors.textSecondary
          }}>
            API Key
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key خود را وارد کنید"
              style={{
                width: '100%',
                padding: '0.75rem',
                paddingRight: '2.5rem',
                background: themeColors.surfaceLight,
                border: `1px solid ${themeColors.border}`,
                borderRadius: '8px',
                color: themeColors.text,
                fontSize: '0.875rem'
              }}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: themeColors.textSecondary,
                cursor: 'pointer',
                padding: '0.25rem'
              }}
            >
              {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* API Secret Input */}
        <div style={{ marginBottom: needsPassphrase ? '1.5rem' : '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: themeColors.textSecondary
          }}>
            API Secret
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showApiSecret ? 'text' : 'password'}
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder="API Secret خود را وارد کنید"
              style={{
                width: '100%',
                padding: '0.75rem',
                paddingRight: '2.5rem',
                background: themeColors.surfaceLight,
                border: `1px solid ${themeColors.border}`,
                borderRadius: '8px',
                color: themeColors.text,
                fontSize: '0.875rem'
              }}
            />
            <button
              type="button"
              onClick={() => setShowApiSecret(!showApiSecret)}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: themeColors.textSecondary,
                cursor: 'pointer',
                padding: '0.25rem'
              }}
            >
              {showApiSecret ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Passphrase Input (conditional) */}
        {needsPassphrase && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: themeColors.textSecondary
            }}>
              Passphrase
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Passphrase خود را وارد کنید"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  paddingRight: '2.5rem',
                  background: themeColors.surfaceLight,
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: '8px',
                  color: themeColors.text,
                  fontSize: '0.875rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: themeColors.textSecondary,
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                {showPassphrase ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        )}

        {/* Help Link */}
        <a
          href={selectedExchangeInfo?.howToGetApiKeys}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: themeColors.primary,
            fontSize: '0.875rem',
            textDecoration: 'none',
            marginBottom: '1.5rem'
          }}
        >
          📚 چطور API Key بگیرم؟
          <ExternalLink size={14} />
        </a>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '0.75rem',
            background: `${themeColors.danger}20`,
            border: `1px solid ${themeColors.danger}`,
            borderRadius: '8px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: themeColors.danger
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div style={{
            padding: '0.75rem',
            background: `${themeColors.success}20`,
            border: `1px solid ${themeColors.success}`,
            borderRadius: '8px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: themeColors.success
          }}>
            <CheckCircle size={18} />
            اتصال موفقیت‌آمیز بود! در حال بارگذاری...
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleConnect}
            disabled={isConnecting || success}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: (isConnecting || success) ? themeColors.textSecondary : themeColors.primary,
              color: themeColors.text,
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: (isConnecting || success) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: (isConnecting || success) ? 0.7 : 1
            }}
          >
            {isConnecting && <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />}
            {success ? '✅ متصل شد' : isConnecting ? 'در حال اتصال...' : '✅ اتصال'}
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isConnecting}
              style={{
                flex: 1,
                padding: '0.875rem',
                background: 'transparent',
                color: themeColors.textSecondary,
                border: `1px solid ${themeColors.border}`,
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                opacity: isConnecting ? 0.5 : 1
              }}
            >
              ❌ لغو
            </button>
          )}
        </div>

        {/* Security Notice */}
        <div style={{
          marginTop: '1.5rem',
          padding: '0.75rem',
          background: `${themeColors.surfaceLight}`,
          border: `1px solid ${themeColors.border}`,
          borderRadius: '8px',
          fontSize: '0.75rem',
          color: themeColors.textSecondary,
          textAlign: 'center'
        }}>
          🔒 API Keys به صورت امن در مرورگر شما ذخیره می‌شوند
          <br />
          توصیه می‌شود از Read-Only API Keys استفاده کنید
        </div>
      </div>

      {/* CSS for animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, ArrowRight, Server, Key, BookOpen, AlertCircle } from 'lucide-react';
import { useAuth } from '../src/AuthContext';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../src/firebase';

const themeColors = {
  primary: '#331a6bff',
  primaryLight: '#350b96',
  success: '#063022ff',
  danger: '#8e1616ff',
  background: '#000000',
  surface: '#151516ff',
  surfaceLight: '#131414ff',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  border: '#18191bff',
};

export default function MT5LiveSetup({ onComplete }) {
  const { currentUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (currentUser?.email) {
      // استفاده از email به عنوان API Key
      setApiKey(currentUser.email);

      // ذخیره API Key در Firestore
      const saveApiKey = async () => {
        try {
          const userRef = doc(db, 'liveTrading', currentUser.uid);
          await setDoc(userRef, {
            apiKey: currentUser.email,
            email: currentUser.email,
            createdAt: new Date(),
            status: 'pending'
          }, { merge: true });
        } catch (error) {
          console.error('Error saving API key:', error);
        }
      };
      saveApiKey();
    }
  }, [currentUser]);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadEA = () => {
    // دانلود فایل EA
    const link = document.createElement('a');
    link.href = '/TradingMonitor.mq5';
    link.download = 'TradingMonitor.mq5';
    link.click();
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: themeColors.background,
      color: themeColors.text,
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.primaryLight})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            راه‌اندازی اتصال به MetaTrader 5
          </h1>
          <p style={{ color: themeColors.textSecondary, fontSize: '1.1rem' }}>
            برای مشاهده معاملات لایو خود، مراحل زیر را دنبال کنید
          </p>
        </div>

        {/* Steps Progress */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          marginBottom: '3rem'
        }}>
          {[1, 2, 3, 4].map((step) => (
            <div key={step} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: currentStep >= step ? themeColors.primary : themeColors.surface,
                border: `2px solid ${currentStep >= step ? themeColors.primaryLight : themeColors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                transition: 'all 0.3s'
              }}>
                {step}
              </div>
              {step < 4 && (
                <div style={{
                  width: '60px',
                  height: '2px',
                  backgroundColor: currentStep > step ? themeColors.primary : themeColors.border
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div style={{
          backgroundColor: themeColors.surface,
          borderRadius: '16px',
          border: `1px solid ${themeColors.border}`,
          padding: '2rem'
        }}>
          {/* Step 1: دانلود Expert Advisor */}
          <div style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            backgroundColor: currentStep === 1 ? themeColors.surfaceLight : themeColors.surface,
            borderRadius: '12px',
            border: `1px solid ${currentStep === 1 ? themeColors.primary : themeColors.border}`,
            transition: 'all 0.3s'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: themeColors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Download size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  مرحله ۱: دانلود Expert Advisor
                </h2>
                <p style={{ color: themeColors.textSecondary }}>
                  فایل EA را دانلود و در MetaTrader خود نصب کنید
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                handleDownloadEA();
                setCurrentStep(2);
              }}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: themeColors.primary,
                color: themeColors.text,
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = themeColors.primaryLight}
              onMouseOut={(e) => e.target.style.backgroundColor = themeColors.primary}
            >
              <Download size={20} />
              دانلود TradingMonitor.mq5
            </button>
          </div>

          {/* Step 2: نصب در MetaTrader */}
          <div style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            backgroundColor: currentStep === 2 ? themeColors.surfaceLight : themeColors.surface,
            borderRadius: '12px',
            border: `1px solid ${currentStep === 2 ? themeColors.primary : themeColors.border}`,
            transition: 'all 0.3s',
            opacity: currentStep < 2 ? 0.5 : 1
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: themeColors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Server size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  مرحله ۲: نصب در MetaTrader 5
                </h2>
                <p style={{ color: themeColors.textSecondary }}>
                  فایل دانلود شده را در پوشه MQL5 قرار دهید
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: themeColors.background,
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <p style={{ color: themeColors.textSecondary, marginBottom: '0.5rem', fontWeight: 'bold' }}>
                راهنمای نصب:
              </p>
              <ol style={{ color: themeColors.textSecondary, paddingRight: '1.5rem', lineHeight: '1.8' }}>
                <li>MetaTrader 5 را باز کنید</li>
                <li>از منو File → Open Data Folder را انتخاب کنید</li>
                <li>وارد پوشه MQL5 → Experts شوید</li>
                <li>فایل TradingMonitor.mq5 را در این پوشه کپی کنید</li>
                <li>MetaTrader را ری‌استارت کنید یا روی Compile بزنید</li>
              </ol>
            </div>

            <button
              onClick={() => setCurrentStep(3)}
              disabled={currentStep < 2}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: currentStep >= 2 ? themeColors.primary : themeColors.border,
                color: themeColors.text,
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: currentStep >= 2 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => {
                if (currentStep >= 2) e.target.style.backgroundColor = themeColors.primaryLight;
              }}
              onMouseOut={(e) => {
                if (currentStep >= 2) e.target.style.backgroundColor = themeColors.primary;
              }}
            >
              نصب انجام شد - مرحله بعد
              <ArrowRight size={20} />
            </button>
          </div>

          {/* Step 3: کپی API Key */}
          <div style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            backgroundColor: currentStep === 3 ? themeColors.surfaceLight : themeColors.surface,
            borderRadius: '12px',
            border: `1px solid ${currentStep === 3 ? themeColors.primary : themeColors.border}`,
            transition: 'all 0.3s',
            opacity: currentStep < 3 ? 0.5 : 1
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: themeColors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Key size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  مرحله ۳: API Key شما
                </h2>
                <p style={{ color: themeColors.textSecondary }}>
                  این کلید منحصر به فرد شما است - آن را کپی کنید
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: themeColors.background,
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <input
                type="text"
                value={apiKey}
                readOnly
                style={{
                  flex: 1,
                  backgroundColor: themeColors.surface,
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: '6px',
                  padding: '0.75rem',
                  color: themeColors.text,
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleCopy}
                disabled={currentStep < 3}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: copied ? themeColors.success : themeColors.primary,
                  color: themeColors.text,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: currentStep >= 3 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s',
                  minWidth: '120px',
                  justifyContent: 'center'
                }}
              >
                {copied ? (
                  <>
                    <Check size={20} />
                    کپی شد
                  </>
                ) : (
                  <>
                    <Copy size={20} />
                    کپی
                  </>
                )}
              </button>
            </div>

            <button
              onClick={() => setCurrentStep(4)}
              disabled={currentStep < 3}
              style={{
                width: '100%',
                padding: '1rem',
                backgroundColor: currentStep >= 3 ? themeColors.primary : themeColors.border,
                color: themeColors.text,
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: currentStep >= 3 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => {
                if (currentStep >= 3) e.target.style.backgroundColor = themeColors.primaryLight;
              }}
              onMouseOut={(e) => {
                if (currentStep >= 3) e.target.style.backgroundColor = themeColors.primary;
              }}
            >
              کپی کردم - مرحله بعد
              <ArrowRight size={20} />
            </button>
          </div>

          {/* Step 4: اجرای EA در MetaTrader */}
          <div style={{
            padding: '1.5rem',
            backgroundColor: currentStep === 4 ? themeColors.surfaceLight : themeColors.surface,
            borderRadius: '12px',
            border: `1px solid ${currentStep === 4 ? themeColors.primary : themeColors.border}`,
            transition: 'all 0.3s',
            opacity: currentStep < 4 ? 0.5 : 1
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: themeColors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <BookOpen size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                  مرحله ۴: اجرای Expert Advisor
                </h2>
                <p style={{ color: themeColors.textSecondary }}>
                  EA را روی چارت اجرا کرده و API Key را وارد کنید
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: themeColors.background,
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <p style={{ color: themeColors.textSecondary, marginBottom: '0.5rem', fontWeight: 'bold' }}>
                راهنمای اجرا:
              </p>
              <ol style={{ color: themeColors.textSecondary, paddingRight: '1.5rem', lineHeight: '1.8' }}>
                <li>در MetaTrader 5، از Navigator → Expert Advisors فایل TradingMonitor را پیدا کنید</li>
                <li>آن را روی یک چارت (مثلا EURUSD) Drag & Drop کنید</li>
                <li>در پنجره تنظیمات که باز می‌شود، تب Inputs را باز کنید</li>
                <li>در فیلد "API_KEY" کلیدی که کپی کردید را Paste کنید</li>
                <li>در فیلد "SERVER_URL" آدرس سرور پایتون را وارد کنید: <code style={{backgroundColor: themeColors.surface, padding: '0.25rem 0.5rem', borderRadius: '4px'}}>http://localhost:5000/receive</code></li>
                <li>گزینه "Allow DLL imports" و "Allow WebRequest" را فعال کنید</li>
                <li>روی OK کلیک کنید</li>
                <li>اگر EA با موفقیت اجرا شود، یک لبخند 😊 در گوشه چارت نمایش داده می‌شود</li>
              </ol>
            </div>

            <div style={{
              backgroundColor: 'rgba(248, 113, 113, 0.1)',
              border: `1px solid ${themeColors.danger}`,
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              display: 'flex',
              gap: '1rem'
            }}>
              <AlertCircle size={24} color={themeColors.danger} style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>نکته مهم:</p>
                <p style={{ color: themeColors.textSecondary, fontSize: '0.9rem' }}>
                  قبل از اجرای EA، حتماً سرور پایتون را روی VPS خود راه‌اندازی کنید.
                  فایل سرور در مرحله بعد در اختیار شما قرار می‌گیرد.
                </p>
              </div>
            </div>

            <button
              onClick={handleComplete}
              disabled={currentStep < 4}
              style={{
                width: '100%',
                padding: '1.25rem',
                backgroundColor: currentStep >= 4 ? themeColors.success : themeColors.border,
                color: themeColors.text,
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: currentStep >= 4 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => {
                if (currentStep >= 4) e.target.style.transform = 'scale(1.02)';
              }}
              onMouseOut={(e) => {
                if (currentStep >= 4) e.target.style.transform = 'scale(1)';
              }}
            >
              ورود به داشبورد معاملات لایو
              <ArrowRight size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

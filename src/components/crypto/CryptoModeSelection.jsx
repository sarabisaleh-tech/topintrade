import React from 'react';
import { BookOpen, Activity } from 'lucide-react';

// استایل‌های Theme مطابق با CryptoJournalApp
const themeColors = {
  primary: '#ea580c',
  primaryLight: '#f97316',
  primaryDark: '#c2410c',
  background: '#000000',
  surface: '#151516ff',
  surfaceLight: '#131414ff',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  border: '#18191bff',
};

export default function CryptoModeSelection({ onSelectMode, onBack }) {
  const modes = [
    {
      id: 'journal',
      title: 'Journal Mode',
      description: 'ثبت و تحلیل دستی معاملات کریپتو',
      icon: BookOpen,
      color: themeColors.primary
    },
    {
      id: 'live',
      title: 'Live Trading',
      description: 'اتصال به صرافی و نمایش داده‌های لایو',
      icon: Activity,
      color: themeColors.primaryLight
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: themeColors.background,
      color: themeColors.text,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '900px', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
            background: `linear-gradient(to right, ${themeColors.primary}, ${themeColors.primaryLight})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            انتخاب حالت کریپتو
          </h1>
          <p style={{ fontSize: '1.125rem', color: themeColors.textSecondary }}>
            نحوه استفاده از ژورنال کریپتو را انتخاب کنید
          </p>
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          {modes.map(mode => {
            const Icon = mode.icon;
            return (
              <div
                key={mode.id}
                onClick={() => onSelectMode(mode.id)}
                style={{
                  background: themeColors.surface,
                  border: `1px solid ${themeColors.border}`,
                  borderRadius: '16px',
                  padding: '2rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.borderColor = mode.color;
                  e.currentTarget.style.boxShadow = `0 20px 40px ${mode.color}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = themeColors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Icon Container */}
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '16px',
                  background: `${mode.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.5rem'
                }}>
                  <Icon size={40} color={mode.color} />
                </div>

                {/* Title */}
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginBottom: '0.75rem',
                  color: themeColors.text
                }}>
                  {mode.title}
                </h2>

                {/* Description */}
                <p style={{
                  fontSize: '1rem',
                  color: themeColors.textSecondary,
                  lineHeight: '1.6',
                  marginBottom: '1.5rem'
                }}>
                  {mode.description}
                </p>

                {/* Arrow */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: mode.color,
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  <span style={{ marginLeft: '0.5rem' }}>ورود</span>
                  <span style={{ fontSize: '1.25rem' }}>←</span>
                </div>

                {/* Glow effect on hover */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `radial-gradient(circle at center, ${mode.color}10, transparent)`,
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                  pointerEvents: 'none',
                  borderRadius: '16px'
                }}></div>
              </div>
            );
          })}
        </div>

        {/* Back Button */}
        {onBack && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={onBack}
              style={{
                padding: '0.875rem 2rem',
                background: 'transparent',
                border: `1px solid ${themeColors.border}`,
                borderRadius: '8px',
                color: themeColors.textSecondary,
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = themeColors.primary;
                e.currentTarget.style.color = themeColors.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = themeColors.border;
                e.currentTarget.style.color = themeColors.textSecondary;
              }}
            >
              بازگشت
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

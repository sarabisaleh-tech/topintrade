import React from 'react';
import { TrendingUp, Bitcoin } from 'lucide-react';

const JournalTypeSelection = ({ onSelectType, onBack }) => {
  const journalTypes = [
    {
      id: 'journal',
      title: 'Forex Trading',
      description: 'Manually track your Forex trades with detailed journal entries',
      icon: TrendingUp,
      gradient: 'from-blue-500 via-purple-500 to-pink-500',
      mode: 'journal'
    },
    {
      id: 'crypto',
      title: 'Crypto Trading',
      description: 'Monitor your cryptocurrency trading activity',
      icon: Bitcoin,
      gradient: 'from-orange-500 via-yellow-500 to-green-500',
      mode: 'journal-crypto'
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Galaxy Background - شبیه‌سازی تصویر کهکشان */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Base gradient - رنگ‌های کهکشان */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-blue-950"></div>

        {/* Nebula clouds - ابرهای کهکشانی */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-pink-600/20 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-600/20 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-orange-600/15 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-yellow-600/10 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '2.5s'}}></div>
        </div>

        {/* Stars - ستاره‌ها */}
        <div className="absolute inset-0">
          {[...Array(200)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full animate-twinkle"
              style={{
                width: Math.random() * 2 + 1 + 'px',
                height: Math.random() * 2 + 1 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                animationDelay: Math.random() * 3 + 's',
                animationDuration: Math.random() * 2 + 2 + 's',
                opacity: Math.random() * 0.7 + 0.3
              }}
            />
          ))}
        </div>

        {/* Brighter stars */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={`bright-${i}`}
              className="absolute rounded-full animate-twinkle"
              style={{
                width: Math.random() * 3 + 2 + 'px',
                height: Math.random() * 3 + 2 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                background: `radial-gradient(circle, ${
                  ['#fff', '#ffd700', '#87ceeb', '#ff69b4'][Math.floor(Math.random() * 4)]
                } 0%, transparent 70%)`,
                animationDelay: Math.random() * 3 + 's',
                animationDuration: Math.random() * 2 + 1 + 's',
                boxShadow: `0 0 ${Math.random() * 10 + 5}px ${
                  ['#fff', '#ffd700', '#87ceeb', '#ff69b4'][Math.floor(Math.random() * 4)]
                }`
              }}
            />
          ))}
        </div>

        {/* Dark overlay for text contrast */}
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
            Choose Your Market
          </h1>
          <p className="text-xl text-gray-300">
            Select the trading journal you want to access
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl w-full">
          {journalTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div
                key={type.id}
                onClick={() => onSelectType && onSelectType(type.mode)}
                className="group relative bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 cursor-pointer
                         transform transition-all duration-500 hover:scale-105 hover:border-gray-600
                         hover:shadow-2xl hover:shadow-purple-500/20"
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${type.gradient} opacity-0 group-hover:opacity-10
                              rounded-2xl transition-opacity duration-500`}></div>

                {/* Card content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${type.gradient} p-0.5 mb-6
                                transform transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110`}>
                    <div className="w-full h-full bg-gray-900 rounded-xl flex items-center justify-center">
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-3xl font-bold text-white mb-3 group-hover:text-transparent
                               group-hover:bg-gradient-to-r group-hover:bg-clip-text transition-all duration-300"
                      style={{backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))`}}>
                    {type.title}
                  </h2>

                  {/* Description */}
                  <p className="text-gray-400 text-lg group-hover:text-gray-300 transition-colors duration-300">
                    {type.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className="mt-6 flex items-center text-gray-500 group-hover:text-white transition-colors duration-300">
                    <span className="mr-2">Enter Journal</span>
                    <svg
                      className="w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>

                {/* Glow effect */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${type.gradient} opacity-0
                              group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-10`}></div>
              </div>
            );
          })}
        </div>

        {/* Back button */}
        <button
          onClick={() => onBack && onBack()}
          className="mt-16 px-8 py-3 bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl
                   text-gray-300 hover:text-white hover:border-gray-600 transition-all duration-300
                   hover:shadow-lg hover:shadow-purple-500/20"
        >
          Back to Home
        </button>
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        .animate-twinkle {
          animation: twinkle linear infinite;
        }
      `}</style>
    </div>
  );
};

export default JournalTypeSelection;

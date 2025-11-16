import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function LandingPage({ onSelectMode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2000&auto=format&fit=crop')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-6xl font-bold text-center mb-4 text-white drop-shadow-2xl">
          Top In Trade
        </h1>
        <p className="text-xl text-center mb-16 text-gray-200 drop-shadow-lg">
          ابزار تحلیل و بررسی معاملات گذشته
        </p>

        <div className="flex justify-center max-w-2xl mx-auto">
          {/* فقط Backtest */}
          <button
            onClick={() => onSelectMode('backtest')}
            className="group relative bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 cursor-pointer
                     transform transition-all duration-500 hover:scale-105 hover:border-gray-600
                     hover:shadow-2xl hover:shadow-purple-500/20 w-full"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 opacity-0 group-hover:opacity-10
                          rounded-2xl transition-opacity duration-500"></div>

            <div className="relative z-10">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 p-0.5 mb-6 mx-auto
                            transform transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                <div className="w-full h-full bg-gray-900 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-10 h-10 text-white" />
                </div>
              </div>

              <h2 className="text-3xl font-bold text-white mb-3 text-center group-hover:text-transparent
                           group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:via-blue-400 group-hover:to-pink-400
                           group-hover:bg-clip-text transition-all duration-300">
                بک تست
              </h2>

              <p className="text-gray-400 text-lg text-center group-hover:text-gray-300 transition-colors duration-300">
                تحلیل و بررسی معاملات گذشته، آمارگیری و بهبود استراتژی معاملاتی
              </p>

              <div className="mt-6 flex items-center justify-center text-gray-500 group-hover:text-white transition-colors duration-300">
                <span className="mr-2">کلیک کنید برای ورود</span>
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

            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 opacity-0
                          group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-10"></div>
          </button>
        </div>
      </div>
    </div>
  );
}

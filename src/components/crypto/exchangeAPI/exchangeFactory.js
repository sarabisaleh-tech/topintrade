/**
 * Exchange Factory
 * مدیریت و ایجاد instance های API برای صرافی‌های مختلف
 */

import BitUnixServerAPI from './bitunix-server';
import MEXCAPI from './mexc';
import BinanceAPI from './binance';
import BybitAPI from './bybit';
import OKXAPI from './okx';
import KuCoinAPI from './kucoin';
import XTAPI from './xt';
import BingXAPI from './bingx';

/**
 * لیست صرافی‌های پشتیبانی شده
 */
export const SUPPORTED_EXCHANGES = {
  BITUNIX: {
    id: 'bitunix',
    name: 'BitUnix 🇮🇷',
    logo: '🔶',
    requiresPassphrase: false,
    apiDocsUrl: 'https://bitunix-docs.github.io/apidocs/',
    howToGetApiKeys: 'https://www.bitunix.com/account/api-management',
    disabled: false,
    supportedInIran: true,
    description: 'صرافی BitUnix - پشتیبانی از کاربران ایرانی'
  },
  MEXC: {
    id: 'mexc',
    name: 'MEXC 🇮🇷',
    logo: '🔷',
    requiresPassphrase: false,
    apiDocsUrl: 'https://mexcdevelop.github.io/apidocs/',
    howToGetApiKeys: 'https://www.mexc.com/user/openapi',
    supportedInIran: true,
    description: 'صرافی MEXC - پشتیبانی از کاربران ایرانی، بدون نیاز به KYC برای معاملات فیوچرز'
  },
  BINANCE: {
    id: 'binance',
    name: 'Binance Futures',
    logo: '🟡',
    requiresPassphrase: false,
    apiDocsUrl: 'https://binance-docs.github.io/apidocs/futures/en/',
    howToGetApiKeys: 'https://www.binance.com/en/my/settings/api-management'
  },
  BYBIT: {
    id: 'bybit',
    name: 'Bybit',
    logo: '🟠',
    requiresPassphrase: false,
    apiDocsUrl: 'https://bybit-exchange.github.io/docs/v5/intro',
    howToGetApiKeys: 'https://www.bybit.com/app/user/api-management'
  },
  OKX: {
    id: 'okx',
    name: 'OKX',
    logo: '⚫',
    requiresPassphrase: true,
    apiDocsUrl: 'https://www.okx.com/docs-v5/en/',
    howToGetApiKeys: 'https://www.okx.com/account/my-api'
  },
  KUCOIN: {
    id: 'kucoin',
    name: 'KuCoin Futures',
    logo: '🟢',
    requiresPassphrase: true,
    apiDocsUrl: 'https://docs.kucoin.com/futures/',
    howToGetApiKeys: 'https://www.kucoin.com/account/api'
  },
  XT: {
    id: 'xt',
    name: 'XT.com 🇮🇷',
    logo: '🟣',
    requiresPassphrase: false,
    apiDocsUrl: 'https://doc.xt.com/',
    howToGetApiKeys: 'https://www.xt.com/account/api',
    supportedInIran: true,
    description: 'صرافی XT.com - پشتیبانی از کاربران ایرانی، بدون نیاز به احراز هویت پیشرفته'
  },
  BINGX: {
    id: 'bingx',
    name: 'BingX 🇮🇷',
    logo: '🔵',
    requiresPassphrase: false,
    apiDocsUrl: 'https://bingx-api.github.io/docs/',
    howToGetApiKeys: 'https://bingx.com/en-us/account/api/',
    supportedInIran: true,
    description: 'صرافی BingX - پشتیبانی از کاربران ایرانی، معاملات فیوچرز بدون محدودیت'
  }
};

/**
 * ایجاد instance API بر اساس صرافی انتخاب شده
 * @param {string} exchangeId - شناسه صرافی
 * @param {string} apiKey - API Key
 * @param {string} apiSecret - API Secret
 * @param {string} passphrase - Passphrase (فقط برای OKX و KuCoin)
 * @returns {Object} - Instance API صرافی
 */
export function createExchangeAPI(exchangeId, apiKey, apiSecret, passphrase = null) {
  if (!apiKey || !apiSecret) {
    throw new Error('API Key and Secret are required');
  }

  switch (exchangeId.toLowerCase()) {
    case 'bitunix':
      return new BitUnixServerAPI(apiKey, apiSecret);

    case 'mexc':
      return new MEXCAPI(apiKey, apiSecret);

    case 'binance':
      return new BinanceAPI(apiKey, apiSecret);

    case 'bybit':
      return new BybitAPI(apiKey, apiSecret);

    case 'okx':
      if (!passphrase) {
        throw new Error('Passphrase is required for OKX');
      }
      return new OKXAPI(apiKey, apiSecret, passphrase);

    case 'kucoin':
      if (!passphrase) {
        throw new Error('Passphrase is required for KuCoin');
      }
      return new KuCoinAPI(apiKey, apiSecret, passphrase);

    case 'xt':
      return new XTAPI(apiKey, apiSecret);

    case 'bingx':
      return new BingXAPI(apiKey, apiSecret);

    default:
      throw new Error(`Unsupported exchange: ${exchangeId}`);
  }
}

/**
 * دریافت اطلاعات صرافی
 * @param {string} exchangeId - شناسه صرافی
 * @returns {Object} - اطلاعات صرافی
 */
export function getExchangeInfo(exchangeId) {
  const exchange = Object.values(SUPPORTED_EXCHANGES).find(
    ex => ex.id === exchangeId.toLowerCase()
  );

  if (!exchange) {
    throw new Error(`Exchange not found: ${exchangeId}`);
  }

  return exchange;
}

/**
 * لیست تمام صرافی‌های پشتیبانی شده
 * @returns {Array} - آرایه صرافی‌ها
 */
export function getAllExchanges() {
  return Object.values(SUPPORTED_EXCHANGES);
}

/**
 * بررسی اینکه آیا صرافی نیاز به passphrase دارد
 * @param {string} exchangeId - شناسه صرافی
 * @returns {boolean}
 */
export function requiresPassphrase(exchangeId) {
  const exchange = getExchangeInfo(exchangeId);
  return exchange.requiresPassphrase;
}

export default {
  createExchangeAPI,
  getExchangeInfo,
  getAllExchanges,
  requiresPassphrase,
  SUPPORTED_EXCHANGES
};

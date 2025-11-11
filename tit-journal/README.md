# Live Trading Journal - راهنمای سریع

## نمای کلی

این سیستم به شما امکان می‌دهد معاملات لایو MetaTrader 5 را به صورت Real-time مشاهده کنید.

## شروع سریع (5 دقیقه)

### 1️⃣ راه‌اندازی Python Server

```bash
cd python-server
pip install -r requirements.txt
python mt5_live_server.py
```

### 2️⃣ نصب Expert Advisor

1. از داشبورد فایل `TradingMonitor.mq5` را دانلود کنید
2. در MT5: File → Open Data Folder → MQL5 → Experts
3. فایل را کپی کنید
4. MT5 را ری‌استارت کنید

### 3️⃣ اجرای EA

1. EA را روی چارت بکشید
2. API Key خود را وارد کنید
3. OK کنید

### 4️⃣ مشاهده داشبورد

- وارد وب‌اپ شوید
- روی "معاملات لایو" کلیک کنید
- داشبورد را مشاهده کنید

## ساختار فایل‌ها

```
tit-journal/
├── LiveJournalApp.jsx           # Component اصلی
├── MT5LiveSetup.jsx             # صفحه راه‌اندازی
├── LiveTradingDashboard.jsx     # داشبورد معاملات
└── README.md                    # این فایل
```

## ویژگی‌ها

✅ اتصال Real-time به MT5
✅ نمایش موجودی و Equity
✅ لیست معاملات (History)
✅ پوزیشن‌های باز
✅ نمودار Equity
✅ آمار و تحلیل

## جدا از Backtest

این سیستم کاملاً مستقل از بخش Backtest است:
- فولدر جدا: `tit-journal/`
- Routing جدا در App.jsx
- Collection جدا در Firebase: `liveTrading/`
- هیچ تداخلی با کد Backtest ندارد

## مستندات کامل

برای راهنمای کامل، فایل `LIVE-TRADING-GUIDE.md` در root پروژه را مطالعه کنید.

## پشتیبانی

ایمیل: titteam.1404@gmail.com

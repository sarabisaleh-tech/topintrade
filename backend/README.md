# 🚀 Backtest Trading App - Backend API

Backend ساده و قدرتمند برای ذخیره دیتای کاربران با PostgreSQL

## 📋 پیش‌نیازها

- VPS ایرانی با Ubuntu 22.04
- Docker و Docker Compose
- یه دامنه (اختیاری)

---

## 🛠️ راه‌اندازی روی VPS ایرانی

### مرحله 1: اتصال به VPS

```bash
ssh root@your-vps-ip
```

### مرحله 2: نصب Docker

```bash
# آپدیت سیستم
apt update && apt upgrade -y

# نصب Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# نصب Docker Compose
apt install docker-compose -y

# چک کردن نصب
docker --version
docker-compose --version
```

### مرحله 3: آپلود کدها

**روش 1: با Git (توصیه می‌شه)**
```bash
# نصب Git
apt install git -y

# Clone کردن پروژه
cd /opt
git clone https://github.com/your-username/your-repo.git
cd your-repo/backend
```

**روش 2: با FTP/SFTP**
- از FileZilla یا WinSCP استفاده کن
- فایل‌های backend رو به `/opt/backend` آپلود کن

### مرحله 4: تنظیم Environment Variables

```bash
# کپی کردن فایل نمونه
cp .env.example .env

# ویرایش فایل .env
nano .env
```

**تنظیمات رو به این شکل تغییر بده:**
```env
PORT=3001
DB_USER=postgres
DB_PASSWORD=یه_پسورد_قوی_بساز
DB_NAME=backtest_db
DB_HOST=postgres
DB_PORT=5432
```

همچنین `docker-compose.yml` رو باز کن و پسورد رو تغییر بده:
```bash
nano docker-compose.yml
```

### مرحله 5: اجرای Backend

```bash
# ساخت و اجرا
docker-compose up -d

# چک کردن لاگ‌ها
docker-compose logs -f

# باید این پیام‌ها رو ببینی:
# ✅ Database connected
# ✅ Database tables initialized
# 🚀 Server running on port 3001
```

### مرحله 6: تست Backend

```bash
# تست Health Check
curl http://localhost:3001/health

# باید جواب بده:
# {"status":"ok","timestamp":"2025-..."}
```

---

## 🔧 دستورات مفید

```bash
# نمایش لاگ‌ها
docker-compose logs -f backend

# ریستارت کردن
docker-compose restart

# خاموش کردن
docker-compose down

# خاموش کردن + پاک کردن دیتابیس
docker-compose down -v
```

---

## 🌐 تنظیم Nginx (برای Domain و HTTPS)

اگه می‌خوای با دامنه و HTTPS کار کنی:

### نصب Nginx

```bash
apt install nginx certbot python3-certbot-nginx -y
```

### ساخت فایل تنظیمات

```bash
nano /etc/nginx/sites-available/backtest-api
```

محتوا:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### فعال‌سازی و راه‌اندازی

```bash
# لینک ساختن
ln -s /etc/nginx/sites-available/backtest-api /etc/nginx/sites-enabled/

# تست تنظیمات
nginx -t

# ریستارت Nginx
systemctl restart nginx

# نصب SSL Certificate (رایگان)
certbot --nginx -d api.yourdomain.com
```

---

## 📊 بک‌آپ دیتابیس

### بک‌آپ گرفتن

```bash
docker exec backtest-db pg_dump -U postgres backtest_db > backup_$(date +%Y%m%d).sql
```

### بازیابی از بک‌آپ

```bash
docker exec -i backtest-db psql -U postgres backtest_db < backup_20250113.sql
```

---

## 🔍 مانیتورینگ

### چک کردن وضعیت سرویس‌ها

```bash
docker-compose ps
```

### مشاهده استفاده از منابع

```bash
docker stats
```

---

## 🛡️ امنیت

### تنظیم Firewall

```bash
# اجازه به پورت‌های مورد نیاز
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

### تغییر پورت SSH (پیشنهادی)

```bash
nano /etc/ssh/sshd_config
# Port 22 رو به یه عدد دیگه تغییر بده (مثلاً 2222)

systemctl restart sshd
ufw allow 2222/tcp
```

---

## 📈 API Endpoints

### GET /health
چک کردن وضعیت سرور
```bash
curl https://api.yourdomain.com/health
```

### GET /api/user/:userId/data
دریافت دیتای کاربر
```bash
curl https://api.yourdomain.com/api/user/guest-user/data
```

### POST /api/user/:userId/data
ذخیره دیتای کاربر
```bash
curl -X POST https://api.yourdomain.com/api/user/guest-user/data \
  -H "Content-Type: application/json" \
  -d '{"backtests": [], "journals": []}'
```

---

## ❓ مشکلات رایج

### مشکل: Backend اجرا نمیشه
```bash
# لاگ‌ها رو چک کن
docker-compose logs backend

# از آخر شروع کن
docker-compose down
docker-compose up -d
```

### مشکل: دیتابیس وصل نمیشه
```bash
# چک کن دیتابیس آماده هست؟
docker-compose logs postgres

# دوباره بساز
docker-compose down -v
docker-compose up -d
```

---

## 💰 هزینه‌ها

- VPS ایرانی: 50-100 هزار تومان/ماه
- دامنه .ir: 50-80 هزار تومان/سال
- SSL Certificate: رایگان (Let's Encrypt)

**جمع: حدود 60-110 هزار تومان/ماه**

---

## 📞 پشتیبانی

اگه مشکلی داشتی یا سوالی بود، بپرس!

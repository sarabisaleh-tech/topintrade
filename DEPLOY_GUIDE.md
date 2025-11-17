# 🚀 راهنمای Deploy روی topintrade.com

## روش 1: Vercel (سریع و آسان - توصیه میشه)

### قسمت Frontend:

1. **برو به https://vercel.com و Sign up کن**

2. **پوشه پروژه رو ZIP کن:**
   - فقط این فایل‌ها رو ZIP کن (backend نباید توش باشه):
     - src/
     - public/
     - index.html
     - package.json
     - package-lock.json
     - vite.config.js
     - vercel.json

3. **Deploy:**
   - در Vercel Dashboard → Add New → Project
   - Browse رو بزن و فایل ZIP رو آپلود کن
   - یا از Drag & Drop استفاده کن
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **تنظیم Environment Variable:**
   - بعد از deploy backend، برو Settings → Environment Variables
   - اضافه کن: `VITE_API_URL` = `https://your-backend-url.railway.app`

5. **وصل کردن دامنه:**
   - Settings → Domains → Add `topintrade.com`
   - DNS Records رو توی دامنه خودت تنظیم کن

---

### قسمت Backend:

1. **برو به https://railway.app**

2. **Deploy Backend:**
   - New Project → Empty Project
   - فقط پوشه `backend` رو ZIP کن
   - آپلود کن یا از GitHub استفاده کن

3. **Environment Variables:**
   ```
   PORT=3001
   JWT_SECRET=change-this-to-very-secure-random-string
   ```

4. **دیتابیس:**
   - فایل `database.db` رو حتماً آپلود کن (توش کاربرا هست!)

---

## روش 2: cPanel (اگه Shared Hosting داری)

### Frontend:
1. Build کن: `npm run build`
2. فایل‌های پوشه `dist` رو آپلود کن در `public_html`
3. یه فایل `.htaccess` اضافه کن برای React routing

### Backend:
1. پوشه `backend` رو کامل آپلود کن
2. Node.js رو فعال کن در cPanel
3. دستور start: `node server.js`

---

## روش 3: VPS (Linux Server)

اگه VPS داری، این کامل‌ترین راهه:

### نصب:
```bash
# نصب Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# نصب Nginx
sudo apt install nginx

# نصب PM2 (برای اجرای Backend)
sudo npm install -g pm2

# آپلود پروژه
scp -r D:\last-version-top-analyze user@your-server:/var/www/topintrade

# Backend
cd /var/www/topintrade/backend
npm install
pm2 start server.js --name topintrade-backend

# Frontend
cd /var/www/topintrade
npm install
npm run build

# تنظیم Nginx
sudo nano /etc/nginx/sites-available/topintrade
```

Nginx Config:
```nginx
server {
    listen 80;
    server_name topintrade.com www.topintrade.com;

    # Frontend
    location / {
        root /var/www/topintrade/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/topintrade /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL رایگان
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d topintrade.com -d www.topintrade.com
```

---

## چک‌لیست نهایی:

- [ ] Frontend Build موفق
- [ ] Backend Test شده (localhost:3001)
- [ ] Environment Variables تنظیم شده
- [ ] Database.db موجوده
- [ ] Domain DNS تنظیم شده
- [ ] SSL نصب شده

---

## لینک‌های مفید:

- Vercel: https://vercel.com
- Railway: https://railway.app
- Let's Encrypt (SSL): https://letsencrypt.org

---

**نکته مهم:** حتماً از `database.db` بک‌آپ بگیر قبل از deploy!

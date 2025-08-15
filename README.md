# 🎬 Telegram Movie & Series Bot (Cloudflare Workers)
A Telegram bot for movies & series powered by **Cloudflare Workers** — lets users browse genres, view random picks, and search titles using the **TMDB API**.  
Includes Persian translations, cast info, ratings, genres, runtime, country, and release date.  
Fully **serverless**, fast, and easy to deploy with secure token management via **Cloudflare Secrets**.

### ✨ Features
- Browse movies & series by genre  
- Get random recommendations  
- Search for a specific title  
- Persian translation of descriptions (Google Translate API)  
- Cast, rating, runtime, genres, and more  
- Serverless deployment on Cloudflare Workers  

### 🛠 Tech Stack
- **Cloudflare Workers** (JavaScript)
- **Telegram Bot API**
- **TMDB API**
- **Google Translate (unofficial endpoint)**

### 🚀 Deployment
1. **Clone the repository**
   ```bash
   git clone https://github.com/<USERNAME>/telegram-movie-bot.git
   cd telegram-movie-bot
2. **Install Wrangler (Cloudflare CLI)**
   ```bash
   npm install -g wrangler
3. **Set Secrets in Cloudflare**
   ```bash
   wrangler secret put TELEGRAM_BOT_TOKEN
   wrangler secret put TMDB_BEARER_TOKEN
   wrangler secret put WEBHOOK_URL
4. **wrangler publish**
   ```bash
   wrangler publish
5. **Set Telegram Webhook**
   ```bash
   https://<your-worker-url>/setWebhook
---

یک ربات تلگرام برای پیشنهاد فیلم و سریال که بر بستر **Cloudflare Workers** ساخته شده است.  
کاربران می‌توانند ژانرها را مرور کنند، پیشنهادهای تصادفی دریافت کنند و با استفاده از **API سایت TMDB** فیلم یا سریال مورد نظر خود را جستجو کنند.  
این ربات دارای ترجمه فارسی توضیحات، نمایش بازیگران، امتیاز، ژانر، مدت زمان و اطلاعات انتشار است.  
به‌صورت کاملاً **بدون سرور (Serverless)** اجرا می‌شود و از **Secrets** در Cloudflare برای مدیریت امن توکن‌ها استفاده می‌کند.

### ✨ امکانات
- مرور فیلم و سریال بر اساس ژانر  
- دریافت پیشنهاد تصادفی  
- جستجوی عنوان خاص  
- ترجمه فارسی توضیحات (Google Translate API)  
- نمایش بازیگران، امتیاز، مدت زمان، ژانر و ...  
- استقرار بدون سرور روی Cloudflare Workers  

### 🛠 تکنولوژی‌ها
- **Cloudflare Workers** (JavaScript)
- **Telegram Bot API**
- **TMDB API**
- **Google Translate (unofficial endpoint)**


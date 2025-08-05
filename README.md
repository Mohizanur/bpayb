# BirrPay-Clone Telegram Bot

## Features

- English/Amharic, all content matches birrpay.org
- Manual admin approval, no payment API
- Real-time Firestore triggers for status updates
- Admin panel for approving subscriptions

## Setup

1. **Clone the repo**
2. **Create Firebase project**
   - Enable Firestore (test mode)
   - Download service account JSON
3. **Set environment variables:**
   - `TELEGRAM_BOT_TOKEN` (from @BotFather)
   - `FIREBASE_CONFIG` (stringified service account JSON)
   - `ADMIN_TELEGRAM_ID` (your Telegram user ID)
4. **Install dependencies:**
   ```
   npm install
   ```
5. **Add service logos:**
   - Place logo images in `public/logos/` (e.g., `netflix.png`, `prime.png`)
6. **Deploy to Render:**
   - Create a new Web Service (Node.js)
   - Set build/run: `npm install`, `npm run build && node src/index.js`
   - Set environment variables as above
   - Expose port 3000 for bot, 3001 for admin panel
7. **Set Telegram webhook:**
   ```
   npx telegraf setWebhook https://<your-app>.onrender.com/telegram
   ```
8. **Admin Panel:**
   - Visit `/panel` and log in with your Telegram user ID
   - Approve subscriptions and set next billing date

## Usage

- `/start` to begin
- Inline buttons for managing plans and support
- `/lang en` or `/lang am` to switch language
- `/faq` for frequently asked questions
- All text messages are sent to admin for support

## Notes

- No payment API: all payment validation is manual
- All content and flows match birrpay.org

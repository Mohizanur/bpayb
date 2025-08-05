# 🚀 BirrPay Clone Bot - Complete Subscription Management System

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Telegram Bot API](https://img.shields.io/badge/Telegram%20Bot%20API-6.0+-blue.svg)](https://core.telegram.org/bots/api)
[![Firebase](https://img.shields.io/badge/Firebase-Admin%20SDK-orange.svg)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A comprehensive Telegram bot system that clones the functionality of BirrPay.org - Ethiopia's premier subscription management platform. This bot provides a complete solution for managing digital subscriptions with multi-language support, admin panel, and modern UI.

## ✨ Features

### 🎯 Core Features
- **Multi-language Support**: Full English and Amharic (አማርኛ) localization
- **Subscription Management**: Complete lifecycle management of subscriptions
- **Modern Admin Panel**: Beautiful, responsive web interface for administrators
- **Real-time Notifications**: Instant admin notifications for new requests
- **Support System**: Built-in customer support with message tracking
- **Firebase Integration**: Scalable cloud database with real-time updates
- **Service Catalog**: 10+ popular streaming and digital services

### 📱 User Features
- Interactive service browsing with detailed information
- One-click subscription requests
- Real-time subscription status tracking
- Easy cancellation process
- Multi-language FAQ system
- Direct support messaging

### 🔧 Admin Features
- **Dashboard**: Real-time statistics and overview
- **Subscription Management**: Approve, reject, or cancel subscriptions
- **Support Center**: Handle customer inquiries efficiently
- **User Management**: Track user activities and preferences
- **Automated Workflows**: Streamlined approval processes

## 🏗️ Architecture

```
BirrPay Bot System
├── Telegram Bot (Main Interface)
│   ├── Multi-language handlers
│   ├── Interactive keyboards
│   └── Real-time messaging
├── Admin Panel (Web Interface)
│   ├── Modern responsive UI
│   ├── Real-time dashboard
│   └── Management tools
├── Firebase Backend
│   ├── User data
│   ├── Subscriptions
│   └── Support messages
└── Service Catalog
    ├── Netflix, Amazon Prime
    ├── Spotify, Disney+
    └── YouTube Premium, etc.
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Firebase project set up
- Telegram Bot Token from [@BotFather](https://t.me/botfather)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd bpayb
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   FIREBASE_CONFIG={"type":"service_account","project_id":"your-project",...}
   ADMIN_TELEGRAM_ID=your_telegram_user_id
   ADMIN_PORT=3001
   ```

4. **Start the bot**
   ```bash
   npm start
   ```

5. **Start the admin panel** (in a new terminal)
   ```bash
   npm run admin
   ```

6. **Access the admin panel**
   Open `http://localhost:3001/panel` in your browser

## 📖 Available Services

The bot supports the following subscription services:

| Service | Price (ETB) | Description |
|---------|-------------|-------------|
| Netflix | 350/month | Stream movies, TV shows and more |
| Amazon Prime | 300/month | Prime Video, Music and Shopping benefits |
| Spotify Premium | 250/month | Music streaming without ads |
| Disney+ | 280/month | Disney, Marvel, Star Wars content |
| Hulu | 320/month | TV shows and movies streaming |
| YouTube Premium | 200/month | Ad-free YouTube with offline downloads |
| Apple TV+ | 180/month | Original shows and movies |
| HBO Max | 400/month | Premium movies and series |
| Paramount+ | 220/month | CBS, Paramount movies and shows |
| Peacock Premium | 190/month | NBC content and originals |

## 🤖 Bot Commands

### User Commands
- `/start` - 🏠 Main menu and service catalog
- `/help` - ❓ Comprehensive help and instructions
- `/faq` - 📚 Frequently asked questions
- `/lang en` - 🇺🇸 Switch to English
- `/lang am` - 🇪🇹 Switch to Amharic
- `/mysubs` - 📊 View your active subscriptions
- `/support` - 💬 Contact customer support

### Admin Commands
- `/admin_pending` - 📋 View pending subscription requests
- `/admin_support` - 💬 View unhandled support messages
- `/admin_active` - ✅ View all active subscriptions
- `/admin_help` - 🔧 Admin command reference

## 🌐 Admin Panel Features

### Dashboard Overview
- **Real-time Statistics**: Pending, active, cancelled subscriptions
- **Support Queue**: Unhandled customer messages
- **Quick Actions**: One-click approvals and rejections
- **Auto-refresh**: Updates every 30 seconds

### Subscription Management
- **Pending Requests**: Review and approve new subscriptions
- **Active Subscriptions**: Monitor and manage ongoing services
- **Billing Management**: Set next billing dates
- **Cancellation Handling**: Process user cancellations

### Support Center
- **Message Queue**: View all customer inquiries
- **User Information**: Complete user profiles and history
- **Response Tracking**: Mark messages as handled
- **Language Support**: Handle both English and Amharic messages

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token from BotFather | ✅ |
| `FIREBASE_CONFIG` | Firebase service account JSON (as string) | ✅ |
| `ADMIN_TELEGRAM_ID` | Admin's Telegram user ID for notifications | ✅ |
| `ADMIN_PORT` | Port for admin panel (default: 3001) | ❌ |

### Firebase Setup

1. Create a Firebase project
2. Enable Firestore database
3. Create a service account
4. Download the service account key
5. Convert the JSON to a string and set as `FIREBASE_CONFIG`

### Collections Structure

```javascript
// subscriptions collection
{
  telegramUserID: number,
  serviceID: string,
  serviceName: string,
  price: number,
  status: 'pending' | 'active' | 'cancelled' | 'rejected',
  requestedAt: timestamp,
  approvedAt?: timestamp,
  nextBillingDate?: string,
  userLanguage: 'en' | 'am'
}

// supportMessages collection
{
  telegramUserID: number,
  userInfo: object,
  messageText: string,
  timestamp: timestamp,
  handled: boolean,
  language: 'en' | 'am'
}

// users collection
{
  telegramUserID: number,
  language: 'en' | 'am',
  firstName: string,
  lastName?: string,
  username?: string
}
```

## 🌍 Internationalization

The bot supports full bilingual functionality:

- **English**: Complete interface and messages
- **Amharic (አማርኛ)**: Full localization for Ethiopian users
- **Dynamic Language Switching**: Users can change language anytime
- **Admin Language Detection**: Support messages show user's preferred language

## 🎨 UI/UX Features

### Modern Design
- **Glassmorphism**: Beautiful translucent design elements
- **Responsive Layout**: Works perfectly on all devices
- **Smooth Animations**: Engaging hover effects and transitions
- **Intuitive Navigation**: Easy-to-use interface for all user levels

### Interactive Elements
- **Inline Keyboards**: Rich interactive buttons
- **Service Cards**: Detailed service information display
- **Real-time Updates**: Live data refresh without page reload
- **Status Indicators**: Clear visual feedback for all actions

## 📊 Analytics & Monitoring

### Built-in Metrics
- Subscription conversion rates
- User language preferences
- Support response times
- Service popularity tracking

### Logging
- Comprehensive error logging
- User interaction tracking
- Admin action audit trail
- Performance monitoring

## 🔒 Security Features

- **Admin Authentication**: Secure admin panel access
- **Input Validation**: Comprehensive data validation
- **Error Handling**: Graceful error management
- **Rate Limiting**: Protection against spam

## 🚀 Deployment

### Render Deployment

1. **Connect your repository** to Render
2. **Set environment variables** in Render dashboard
3. **Deploy the main bot**:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. **Deploy the admin panel** (separate service):
   - Build Command: `npm install`
   - Start Command: `npm run admin`

### Manual Deployment

```bash
# Production build
npm install --production

# Start with PM2
npm install -g pm2
pm2 start src/index.js --name "birrpay-bot"
pm2 start panel/ExpressServer.js --name "birrpay-admin"

# Monitor
pm2 monit
```

## 🛠️ Development

### Project Structure

```
bpayb/
├── src/
│   ├── handlers/          # Bot command handlers
│   │   ├── start.js       # Main menu and navigation
│   │   ├── subscribe.js   # Subscription management
│   │   ├── support.js     # Customer support
│   │   ├── admin.js       # Admin commands
│   │   └── ...
│   ├── utils/             # Utility functions
│   │   ├── i18n.js        # Internationalization
│   │   ├── firestore.js   # Database connection
│   │   └── loadServices.js # Service loader
│   ├── i18n.json          # Translation strings
│   ├── services.json      # Service catalog
│   └── index.js           # Main bot entry point
├── panel/
│   ├── ExpressServer.js   # Admin panel server
│   └── admin.html         # Admin panel UI
├── public/                # Static assets
├── package.json
└── README.md
```

### Adding New Services

1. **Edit `src/services.json`**:
   ```json
   {
     "serviceID": "newservice",
     "name": "New Service",
     "price": 250,
     "billingCycle": "Monthly",
     "logoUrl": "/public/logos/newservice.png",
     "approvalRequiredFlag": true,
     "description": "Service description"
   }
   ```

2. **Add service logo** to `public/logos/`

3. **Update translations** in `src/i18n.json` if needed

### Adding New Languages

1. **Extend `src/i18n.json`** with new language codes
2. **Update language handlers** in `src/handlers/lang.js`
3. **Add language detection** in middleware

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by BirrPay.org
- Built with Telegraf.js
- Powered by Firebase
- UI inspired by modern design principles

## 📞 Support

For support and questions:
- 📧 Email: support@admin.birr‑pay
- 💬 Telegram: Contact through the bot
- 🐛 Issues: GitHub Issues page

---

**Made with ❤️ for the Ethiopian digital community**

*BirrPay Clone Bot - Bringing digital subscriptions to everyone, everywhere.*

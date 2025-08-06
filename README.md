# BirrPay - Ethiopia's Premier Subscription Hub

A comprehensive subscription management platform that allows Ethiopian users to subscribe to popular digital services like Netflix, Amazon Prime, Spotify, and more using local payment methods.

## 🌟 Features

### For Users
- **Multiple Services**: Netflix, Amazon Prime, Spotify, Disney+, Hulu, YouTube Premium, and more
- **Flexible Plans**: 1-month, 3-month, 6-month, and 12-month subscription options
- **Local Payment Methods**: CBE Bank Transfer, Telebirr, and Amole
- **Screenshot Upload**: Easy payment verification through screenshot uploads
- **Real-time Status**: Track subscription and payment status
- **Bilingual Support**: Available in English and Amharic
- **Telegram Bot**: Complete subscription management through Telegram

### For Administrators
- **Admin Dashboard**: Comprehensive statistics and user management
- **Payment Verification**: Review and approve payment screenshots
- **Subscription Management**: Activate, cancel, and manage user subscriptions
- **Support System**: Handle user support requests
- **Real-time Monitoring**: Track all system activities

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Firebase project with Firestore enabled
- Telegram Bot Token

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd birrpay-clone-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   ADMIN_TELEGRAM_ID=your_admin_telegram_id
   FIREBASE_PROJECT_ID=your_firebase_project_id
   # ... other Firebase credentials
   ```

4. **Set up Firebase**
   - Create a Firebase project
   - Enable Firestore
   - Download service account key
   - Add Firebase credentials to `.env`

5. **Start the application**
   ```bash
   npm start
   ```

## 📱 Telegram Bot Usage

### User Commands
- `/start` - Main menu and services
- `/help` - Help and support information
- `/faq` - Frequently asked questions
- `/lang` - Change language settings
- `/mysubs` - View your subscriptions
- `/support` - Contact customer support

### Admin Commands
- `/admin` - Access admin panel (admin only)

### Bot Features
1. **Service Selection**: Choose from available services
2. **Plan Selection**: Select subscription duration
3. **Payment Method**: Choose payment method (CBE, Telebirr, Amole)
4. **Payment Instructions**: Get detailed payment instructions
5. **Screenshot Upload**: Upload payment confirmation
6. **Status Tracking**: Monitor payment and subscription status

## 🌐 Web Interface

### Features
- **Responsive Design**: Works on desktop and mobile
- **Service Catalog**: Browse available services
- **Interactive Selection**: Select services, durations, and payment methods
- **Payment Processing**: Complete payment flow with instructions
- **Screenshot Upload**: Upload payment confirmations
- **Real-time Updates**: Live status updates

### Access
- Main Website: `http://localhost:8000`
- Admin Panel: `http://localhost:8000/admin`

## 🏗️ Architecture

### Backend Structure
```
src/
├── handlers/          # Bot command handlers
│   ├── start.js      # Main menu and navigation
│   ├── subscribe.js  # Subscription management
│   ├── admin.js      # Admin functionality
│   ├── screenshot.js # Screenshot upload handling
│   └── ...
├── utils/            # Utility functions
│   ├── database.js   # Database operations
│   ├── payment.js    # Payment processing
│   ├── firestore.js  # Firebase configuration
│   └── ...
└── index.js          # Main bot file
```

### Database Collections
- `users` - User information and preferences
- `subscriptions` - Subscription records
- `payments` - Payment transactions
- `screenshots` - Payment verification screenshots
- `support_messages` - User support requests

## 💳 Payment Flow

1. **Service Selection**: User selects a service (Netflix, Prime, etc.)
2. **Plan Selection**: User chooses subscription duration
3. **Payment Method**: User selects payment method
4. **Payment Instructions**: System provides payment details
5. **Payment**: User makes payment via selected method
6. **Screenshot Upload**: User uploads payment confirmation
7. **Verification**: Admin reviews and verifies payment
8. **Activation**: Subscription is activated and credentials sent

## 🔧 Configuration

### Environment Variables
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `ADMIN_TELEGRAM_ID`: Admin user's Telegram ID
- `FIREBASE_*`: Firebase configuration
- `PORT`: Server port (default: 8000)

### Payment Configuration
- `CBE_ACCOUNT_NUMBER`: Commercial Bank of Ethiopia account
- `TELEBIRR_PHONE`: Telebirr phone number
- `AMOLE_PHONE`: Amole phone number

## 🛠️ Development

### Running in Development
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

### Testing
```bash
npm test
```

## 📊 Admin Panel

### Features
- **Statistics Dashboard**: User, subscription, and payment statistics
- **Pending Subscriptions**: Review and approve new subscriptions
- **Active Subscriptions**: Monitor active subscriptions
- **Support Messages**: Handle user support requests
- **Payment Management**: Verify and manage payments

### Access
Only users with `ADMIN_TELEGRAM_ID` can access admin features.

## 🔒 Security

- **Admin Authentication**: Telegram ID-based admin access
- **Payment Verification**: Screenshot-based payment verification
- **Data Encryption**: Firebase Firestore security rules
- **Input Validation**: Comprehensive input validation
- **Rate Limiting**: Built-in rate limiting for API calls

## 🌍 Localization

The application supports multiple languages:
- **English**: Default language
- **Amharic**: Ethiopian language support

Language can be changed via `/lang` command in the bot.

## 📈 Monitoring

### Logs
- Application logs are written to console
- Error tracking and debugging information
- Payment and subscription activity logs

### Metrics
- User registration and activity
- Subscription creation and management
- Payment success rates
- Support request handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact via Telegram bot: `/support`
- Email: support@birrpay.com

## 🔄 Updates

### Recent Updates
- ✅ Real payment processing implementation
- ✅ Screenshot upload functionality
- ✅ Admin panel with statistics
- ✅ Database integration with Firestore
- ✅ Bilingual support (English/Amharic)
- ✅ Responsive web interface
- ✅ Complete subscription management

### Roadmap
- [ ] Mobile app development
- [ ] Additional payment methods
- [ ] Advanced analytics dashboard
- [ ] API for third-party integrations
- [ ] Automated payment verification
- [ ] Multi-currency support

---

**BirrPay** - Making digital subscriptions accessible to Ethiopia! 🇪🇹

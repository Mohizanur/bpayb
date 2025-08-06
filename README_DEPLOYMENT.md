# 🚀 BirrPay Production Deployment Guide

This guide provides comprehensive instructions for deploying BirrPay to production with full Firebase integration, SSL certificates, and testing suite.

## 📋 Prerequisites

- Node.js 18.0+ installed
- Docker and Docker Compose installed
- Firebase project with Firestore enabled
- Telegram Bot Token from @BotFather
- Domain name with DNS configured
- SSL certificates (Let's Encrypt recommended)

## 🔧 Environment Setup

### 1. Clone and Setup
```bash
git clone <repository-url>
cd birrpay-clone-bot
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Firebase Setup
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore Database
3. Create a service account:
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Download the JSON file
4. Add the JSON content to your `.env` file as `FIREBASE_CONFIG`

### 4. Telegram Bot Setup
1. Create a bot with @BotFather on Telegram
2. Get the bot token
3. Add token to `.env` file as `TELEGRAM_BOT_TOKEN`

## 🏗️ Production Deployment

### Option 1: Docker Deployment (Recommended)

#### 1. Build and Run
```bash
# Build the application
docker-compose -f docker-compose.prod.yml build

# Start all services
docker-compose -f docker-compose.prod.yml up -d
```

#### 2. SSL Certificate Setup
```bash
# Create SSL directory
mkdir -p ssl

# Using Let's Encrypt (recommended)
certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Copy certificates
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/birrpay.crt
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/birrpay.key
```

#### 3. Update Nginx Configuration
Edit `nginx.conf` and update the server_name:
```nginx
server_name your-domain.com www.your-domain.com;
```

#### 4. Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Option 2: Manual Deployment

#### 1. Install Dependencies
```bash
npm install --production
```

#### 2. Install PM2 Process Manager
```bash
npm install -g pm2
```

#### 3. Create PM2 Configuration
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'birrpay-bot',
    script: 'src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

#### 4. Start Application
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 5. Setup Nginx
```bash
sudo apt update
sudo apt install nginx

# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/nginx.conf

# Test configuration
sudo nginx -t

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 🧪 Testing Suite

### Running Tests
```bash
# Install test dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Categories
- **Database Tests**: Firebase operations, CRUD functionality
- **API Tests**: REST endpoints, authentication, error handling
- **Bot Tests**: Telegram bot functionality, message formatting
- **Integration Tests**: End-to-end workflows

### Continuous Integration
Create `.github/workflows/ci.yml`:
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm install
    - run: npm test
    - run: npm run test:coverage
```

## 🔒 Security Configuration

### 1. Firewall Setup
```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. SSL Certificate Auto-Renewal
```bash
# Add to crontab
0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Environment Security
- Never commit `.env` files
- Use strong passwords and keys
- Regularly rotate API keys
- Enable Firebase security rules

## 📊 Monitoring & Logging

### 1. Log Management
```bash
# Create log directories
mkdir -p logs

# Setup log rotation
sudo nano /etc/logrotate.d/birrpay
```

Add to logrotate config:
```
/path/to/birrpay/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        pm2 reload birrpay-bot
    endscript
}
```

### 2. Health Monitoring
The application includes health check endpoints:
- `GET /api/health` - Application health status
- `GET /health` - Nginx health check

### 3. Performance Monitoring
```bash
# Install monitoring tools
npm install -g clinic
npm install -g autocannon

# Performance testing
autocannon -c 10 -d 30 http://localhost:8080/api/health
```

## 🔄 Backup & Recovery

### 1. Database Backup
Firebase Firestore provides automatic backups, but you can also:
```bash
# Export Firestore data
gcloud firestore export gs://your-backup-bucket
```

### 2. Application Backup
```bash
# Backup configuration and logs
tar -czf birrpay-backup-$(date +%Y%m%d).tar.gz \
  .env logs/ ssl/ nginx.conf docker-compose.prod.yml
```

### 3. Recovery Procedures
1. Restore from backup
2. Update environment variables
3. Restart services
4. Verify functionality

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Firebase project setup and tested
- [ ] Telegram bot token obtained
- [ ] SSL certificates generated
- [ ] Domain DNS configured
- [ ] All tests passing

### Deployment
- [ ] Code deployed to server
- [ ] Dependencies installed
- [ ] Services started
- [ ] SSL certificates installed
- [ ] Nginx configured and running
- [ ] Health checks passing

### Post-Deployment
- [ ] Bot responding to commands
- [ ] Website accessible via HTTPS
- [ ] Admin panel functional
- [ ] Database operations working
- [ ] Logs being generated
- [ ] Monitoring active

## 🔧 Troubleshooting

### Common Issues

#### Firebase Connection Failed
```bash
# Check environment variables
echo $FIREBASE_CONFIG

# Test Firebase connection
node -e "console.log(JSON.parse(process.env.FIREBASE_CONFIG))"
```

#### Bot Not Responding
```bash
# Check bot token
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"

# Check logs
tail -f logs/combined.log
```

#### SSL Certificate Issues
```bash
# Test SSL certificate
openssl x509 -in ssl/birrpay.crt -text -noout

# Check certificate expiration
openssl x509 -in ssl/birrpay.crt -enddate -noout
```

#### Performance Issues
```bash
# Check system resources
htop
df -h
free -m

# Check application performance
pm2 monit
```

## 📞 Support

For deployment support:
1. Check the logs first
2. Review this documentation
3. Run the test suite
4. Check Firebase and Telegram API status
5. Contact the development team

## 🔄 Updates & Maintenance

### Regular Maintenance
- Weekly: Check logs and performance
- Monthly: Update dependencies and certificates
- Quarterly: Security audit and backup testing

### Update Procedure
1. Test updates in staging environment
2. Backup current production
3. Deploy updates
4. Run health checks
5. Monitor for issues

---

**Note**: This deployment guide assumes a Linux-based production environment. Adjust commands and paths as needed for your specific setup.
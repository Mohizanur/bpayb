# Render Environment Variables Setup for BirrPay Admin Panel

## Required Environment Variables for https://bpayb.onrender.com

Set these environment variables in your Render dashboard (Settings > Environment):

### 🔐 **Admin Authentication (Required)**
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=BirrPay2024Admin!SecurePass
JWT_SECRET=BirrPay_Super_Secure_JWT_Secret_Key_2024_Authentication_System_32chars_minimum
```

### 🤖 **Telegram Bot Configuration**
```
TELEGRAM_BOT_TOKEN=your_actual_telegram_bot_token
ADMIN_TELEGRAM_ID=your_admin_telegram_user_id
```

### 🔧 **Server Configuration**
```
NODE_ENV=production
PORT=8080
```

### 🔥 **Firebase Configuration (if using Firebase)**
```
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
```

## 🚀 **How to Set Environment Variables on Render**

1. Go to your Render dashboard: https://dashboard.render.com
2. Select your `bpayb` service
3. Go to **Settings** → **Environment**
4. Add each variable listed above
5. Click **Save Changes**
6. Your service will automatically redeploy

## 🔑 **Admin Panel Access**

After setting the environment variables:

- **URL**: https://bpayb.onrender.com/panel
- **Username**: `admin`
- **Password**: `BirrPay2024Admin!SecurePass`

## 🧪 **Testing the Authentication**

You can test the authentication API directly:

```bash
# Test login endpoint
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"BirrPay2024Admin!SecurePass"}' \
  https://bpayb.onrender.com/api/admin/login

# Should return a JWT token if successful
```

## 🔒 **Security Notes**

- The JWT secret is production-grade (64+ characters)
- The admin password is secure with special characters
- Tokens expire after 24 hours
- All admin endpoints are protected with JWT middleware

## 🐛 **Troubleshooting**

If authentication fails:
1. Verify all environment variables are set correctly in Render
2. Check the service logs in Render dashboard
3. Ensure the service has redeployed after setting env vars
4. Test the health endpoint: https://bpayb.onrender.com/health

## 📱 **Admin Panel Features**

Once logged in, you'll have access to:
- User management dashboard
- Subscription analytics 
- Payment tracking
- Service configuration
- Real-time statistics
- Export functionality
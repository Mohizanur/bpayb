import http from 'http';
import { URL } from 'url';
import jwt from 'jsonwebtoken';

const PORT = 8080;
const JWT_SECRET = 'birrpay_default_secret_change_in_production';

// Mock admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Mock data
const mockStats = {
    totalUsers: 150,
    activeUsers: 120,
    paidUsers: 85,
    totalSubscriptions: 200,
    activeSubscriptions: 180,
    pendingSubscriptions: 20,
    totalPayments: 500,
    completedPayments: 480,
    totalRevenue: 25000,
    conversionRate: 0.75,
    avgRevenuePerUser: 166.67
};

// Helper function to validate admin token
const validateAdminToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('No Authorization header or invalid format');
        return false;
    }
    
    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Token decoded successfully:', { username: decoded.username, role: decoded.role });
        
        if (decoded.role !== 'admin') {
            console.log('Token does not have admin role');
            return false;
        }
        
        console.log('Token validation successful');
        return true;
    } catch (error) {
        console.log('Token validation failed:', error.message);
        return false;
    }
};

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    console.log(`${req.method} ${pathname}`);
    
    // Admin login endpoint
    if (pathname === '/api/admin/login' && req.method === 'POST') {
        console.log('Admin login attempt received');
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const { username, password } = JSON.parse(body);
                console.log('Login attempt for username:', username);
                console.log('Expected username:', ADMIN_USERNAME);
                console.log('Password match:', password === ADMIN_PASSWORD);
                
                if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
                    const payload = {
                        username,
                        role: 'admin',
                        iat: Math.floor(Date.now() / 1000),
                        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
                    };
                    
                    const token = jwt.sign(payload, JWT_SECRET);
                    console.log('Login successful, token generated');
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        token,
                        message: 'Login successful',
                        expiresIn: '24h'
                    }));
                } else {
                    console.log('Login failed: invalid credentials');
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        message: 'Invalid credentials' 
                    }));
                }
            } catch (error) {
                console.error('Login error:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: 'Invalid request body' 
                }));
            }
        });
        return;
    }
    
    // Admin stats endpoint
    if (pathname === '/api/admin/stats' && req.method === 'GET') {
        console.log('Admin stats request received');
        if (!validateAdminToken(req)) {
            console.log('Admin stats: unauthorized access');
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
            return;
        }
        console.log('Admin stats: authorized access, returning stats');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, stats: mockStats }));
        return;
    }
    
    // Serve test HTML page
    if (pathname === '/' || pathname === '/test') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        button {
            background: #007bff;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background: #0056b3;
        }
        button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .error {
            color: #dc3545;
            margin-top: 10px;
            display: none;
        }
        .success {
            color: #28a745;
            margin-top: 10px;
            display: none;
        }
        .token-display {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
            word-break: break-all;
            display: none;
        }
        .stats-display {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Admin Login Test</h1>
        
        <form id="loginForm">
            <div class="form-group">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" value="admin" required>
            </div>
            
            <div class="form-group">
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" value="admin123" required>
            </div>
            
            <button type="submit" id="loginBtn">Login</button>
        </form>
        
        <div id="error" class="error"></div>
        <div id="success" class="success"></div>
        
        <div id="tokenDisplay" class="token-display">
            <h3>Token:</h3>
            <div id="tokenText"></div>
        </div>
        
        <div id="statsDisplay" class="stats-display">
            <h3>Stats:</h3>
            <div id="statsText"></div>
        </div>
        
        <div style="margin-top: 20px;">
            <button id="testStatsBtn" style="display: none;">Test Stats API</button>
            <button id="logoutBtn" style="display: none;">Logout</button>
        </div>
    </div>

    <script>
        let currentToken = null;
        
        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('loginBtn');
            const errorDiv = document.getElementById('error');
            const successDiv = document.getElementById('success');
            
            // Clear previous messages
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';
            
            // Disable button during request
            loginBtn.disabled = true;
            loginBtn.textContent = 'Logging in...';
            
            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const result = await response.json();
                
                if (result.success && result.token) {
                    currentToken = result.token;
                    
                    // Show success message
                    successDiv.textContent = 'Login successful!';
                    successDiv.style.display = 'block';
                    
                    // Display token
                    document.getElementById('tokenText').textContent = result.token;
                    document.getElementById('tokenDisplay').style.display = 'block';
                    
                    // Show additional buttons
                    document.getElementById('testStatsBtn').style.display = 'inline-block';
                    document.getElementById('logoutBtn').style.display = 'inline-block';
                    
                    console.log('Login successful, token:', result.token);
                } else {
                    errorDiv.textContent = result.message || 'Login failed';
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                console.error('Login error:', error);
                errorDiv.textContent = 'Network error. Please try again.';
                errorDiv.style.display = 'block';
            } finally {
                // Re-enable button
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login';
            }
        });
        
        document.getElementById('testStatsBtn').addEventListener('click', async function() {
            if (!currentToken) {
                alert('Please login first');
                return;
            }
            
            try {
                const response = await fetch('/api/admin/stats', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + currentToken,
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('statsText').textContent = JSON.stringify(result.stats, null, 2);
                    document.getElementById('statsDisplay').style.display = 'block';
                    console.log('Stats retrieved successfully:', result.stats);
                } else {
                    alert('Failed to get stats: ' + result.error);
                }
            } catch (error) {
                console.error('Stats error:', error);
                alert('Error getting stats: ' + error.message);
            }
        });
        
        document.getElementById('logoutBtn').addEventListener('click', function() {
            currentToken = null;
            document.getElementById('tokenDisplay').style.display = 'none';
            document.getElementById('statsDisplay').style.display = 'none';
            document.getElementById('testStatsBtn').style.display = 'none';
            document.getElementById('logoutBtn').style.display = 'none';
            document.getElementById('success').style.display = 'none';
            document.getElementById('error').style.display = 'none';
            console.log('Logged out');
        });
    </script>
</body>
</html>
        `);
        return;
    }
    
    // Default response
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Not found' }));
});

server.listen(PORT, () => {
    console.log(`🚀 Test server running on port ${PORT}`);
    console.log(`📝 Admin credentials: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`);
    console.log(`🔗 Test login: http://localhost:${PORT}/api/admin/login`);
    console.log(`📊 Test stats: http://localhost:${PORT}/api/admin/stats`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down test server...');
    server.close(() => {
        console.log('✅ Test server stopped');
        process.exit(0);
    });
});
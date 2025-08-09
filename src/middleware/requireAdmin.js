// Admin panel authentication middleware
import jwt from 'jsonwebtoken';

export const requireAdmin = (req, reply, done) => {
  try {
    // Check for JWT token in Authorization header
    const authHeader = req.headers?.authorization || '';
    let token;
    
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.headers?.['x-admin-token']) {
      token = req.headers['x-admin-token'];
    } else if (req.cookies?.admin_token) {
      token = req.cookies.admin_token;
    } else if ((req.query && req.query.token) || (req.body && req.body.token)) {
      token = (req.query && req.query.token) || (req.body && req.body.token);
    }
    
    // If no token found, check for legacy ADMIN_TOKEN
    const configuredToken = process.env.ADMIN_TOKEN;
    const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;
    
    let authorized = false;
    
    if (token) {
      // Try JWT authentication first
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'birrpay_default_secret');
        if (decoded.role === 'admin') {
          authorized = true;
          // Add admin info to request for use in handlers
          req.admin = decoded;
        }
      } catch (jwtError) {
        // If JWT fails, fall back to legacy token check
        if (configuredToken && token === configuredToken) {
          authorized = true;
        }
      }
    } else if (configuredToken) {
      // Legacy token authentication
      const queryOrBodyAdmin = (req.query && req.query.admin) || (req.body && req.body.admin);
      authorized = queryOrBodyAdmin === configuredToken;
    } else if (adminTelegramId) {
      // Legacy Telegram ID authentication
      const queryOrBodyAdmin = (req.query && req.query.admin) || (req.body && req.body.admin);
      authorized = Boolean(queryOrBodyAdmin) && String(queryOrBodyAdmin) === String(adminTelegramId);
    }
    
    if (!authorized) {
      reply.status(403).send({ error: 'Forbidden: Invalid admin credentials' });
      return;
    }
    
    done();
  } catch (error) {
    console.error('Admin auth error:', error);
    reply.status(403).send({ error: 'Forbidden: Invalid admin credentials' });
  }
};

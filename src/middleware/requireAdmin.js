// Admin panel authentication middleware
export const requireAdmin = (req, reply, done) => {
  try {
    // Prefer secure header/bearer token if ADMIN_TOKEN is configured
    const headerAuth = req.headers?.authorization || '';
    const bearerToken = headerAuth.startsWith('Bearer ')
      ? headerAuth.slice(7).trim()
      : undefined;
    const headerToken = req.headers?.['x-admin-token'] || bearerToken;

    const queryOrBodyAdmin = (req.query && req.query.admin) || (req.body && req.body.admin);

    const configuredToken = process.env.ADMIN_TOKEN;
    const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;

    let authorized = false;
    if (configuredToken) {
      // Validate against ADMIN_TOKEN
      authorized = headerToken === configuredToken || queryOrBodyAdmin === configuredToken;
    } else {
      // Fallback: validate Telegram ID via query/body param
      authorized = Boolean(queryOrBodyAdmin) && String(queryOrBodyAdmin) === String(adminTelegramId || '');
    }

    if (!authorized) {
      reply.status(403).send({ error: 'Forbidden: Invalid admin credentials' });
      return;
    }
    done();
  } catch (_) {
    reply.status(403).send({ error: 'Forbidden: Invalid admin credentials' });
  }
};

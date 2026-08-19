const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const env = require('./config/env');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');
const logger = require('./utils/logger');
const { connectMongo, closeMongo } = require('./config/mongoClient');

function isAllowedOrigin(origin, allowed) {
  if (!origin) return true;
  const cleanOrigin = origin.replace(/\/$/, '');
  for (const item of allowed) {
    const cleanItem = item.trim().replace(/\/$/, '');
    if (cleanItem === '*' || cleanItem === cleanOrigin) return true;
    if (cleanItem.includes('*')) {
      const pattern = cleanItem.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
      const regex = new RegExp('^' + pattern + '$');
      if (regex.test(cleanOrigin)) return true;
    }
  }
  return false;
}

function getCorsOptions() {
  const raw = env.CORS_ORIGIN || '*';
  if (raw === '*') {
    return { origin: true, credentials: true };
  }
  const allowed = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return {
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin, allowed)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked for origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true
  };
}

const app = express();

// helmet's default Content-Security-Policy only allows same-origin
// scripts/styles/fonts, which blocks the Bootstrap + Chart.js CDN the
// frontend depends on. Explicitly allow that CDN rather than disabling
// CSP entirely.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://*.onrender.com', 'https://*.vercel.app']
      }
    }
  })
);
app.use(cors(getCorsOptions()));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Method Override middleware for shared hosting (LiteSpeed/Apache) that blocks PUT/DELETE
app.use((req, res, next) => {
  const override = req.headers['x-http-method-override'] || req.headers['x-method-override'] || req.query._method;
  if (override && ['PUT', 'DELETE', 'PATCH'].includes(String(override).toUpperCase())) {
    req.method = String(override).toUpperCase();
  }
  next();
});

app.use(morgan(env.isProduction() ? 'combined' : 'dev'));

const tenantResolverMiddleware = require('./middleware/tenant.middleware');

// API
app.use('/api', tenantResolverMiddleware, apiRoutes);

// Serve the static frontend (Bootstrap + vanilla JS) so the whole app
// can run from a single Node process during development.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use(notFound);
app.use(errorHandler);

async function startServer() {
  await connectMongo();

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  async function shutdown(signal) {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await closeMongo();
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  logger.error('Failed to start server:', err.message);
  process.exit(1);
});

module.exports = app;

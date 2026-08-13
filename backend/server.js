const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const env = require('./config/env');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');
const logger = require('./utils/logger');
const { startBackupScheduler } = require('./jobs/backupScheduler');

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
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", 'https://cdn.jsdelivr.net']
      }
    }
  })
);
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.isProduction() ? 'combined' : 'dev'));

// API
app.use('/api', apiRoutes);

// Serve the static frontend (Bootstrap + vanilla JS) so the whole app
// can run from a single Node process during development.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`DB driver: ${env.DB_DRIVER}`);
  startBackupScheduler();
});

module.exports = app;

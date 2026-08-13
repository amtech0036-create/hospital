/**
 * API URL for split deployment (Vercel frontend + Render backend).
 * Overwritten on Vercel build from ERP_API_URL env var.
 * Local dev: uses same-origin /api when running npm start.
 */
(function () {
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';

  window.ERP_CONFIG = {
    API_BASE_URL: isLocal ? '/api' : 'https://a-m-tech-erp.onrender.com/api'
  };
})();

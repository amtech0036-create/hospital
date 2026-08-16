/**
 * API URL configuration.
 * - Self-hosted (Webuzo, VPS, localhost, cPanel): uses same-origin '/api'.
 * - Split deployment on Vercel: uses configured remote backend.
 */
(function () {
  const host = window.location.hostname;
  const isVercel = host.endsWith('.vercel.app');

  window.ERP_CONFIG = {
    API_BASE_URL: isVercel ? 'https://a-m-tech-erp.onrender.com/api' : '/api'
  };
})();

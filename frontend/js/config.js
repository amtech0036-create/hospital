/**
 * API URL & Company Profile configuration.
 * - Self-hosted (Webuzo, VPS, localhost, cPanel): uses same-origin '/api'.
 * - Split deployment on Vercel: uses configured remote backend.
 * 
 * Note: Company details below are CHANGEABLE FROM THE IDE ONLY.
 */
(function () {
  const host = window.location.hostname;
  const isVercel = host.endsWith('.vercel.app');

  window.ERP_CONFIG = {
    API_BASE_URL: isVercel ? 'https://a-m-tech-erp.onrender.com/api' : '/api',

    // Company profile details (Editable ONLY in the IDE codebase)
    COMPANY: {
      name: 'AM Tech Solutions BD',
      logo: 'assets/amtechlogo.png',
      address: 'Baraipara Bazar Ashulia Savar Dhaka',
      phone: '+880 1736002401',
      website: 'https://amtechsolutionsbd.vercel.app/',
      websiteDisplay: 'www.amtechsolutionsbd.com'
    }
  };
})();


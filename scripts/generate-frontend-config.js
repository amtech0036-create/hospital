/**
 * Writes frontend/js/config.js for Vercel (or other static hosts).
 * Set ERP_API_URL in Vercel → Environment Variables.
 *
 * Example: https://a-m-tech-erp.onrender.com/api
 */
const fs = require('fs');
const path = require('path');

const apiUrl = (process.env.ERP_API_URL || 'https://a-m-tech-erp.onrender.com/api').replace(/\/$/, '');
const outPath = path.join(__dirname, '..', 'frontend', 'js', 'config.js');

const content = `/**
 * Generated at build time — do not edit on Vercel.
 * API backend: ${apiUrl}
 */
window.ERP_CONFIG = {
  API_BASE_URL: '${apiUrl.replace(/'/g, "\\'")}',
  COMPANY: {
    name: 'AM Tech Solutions BD',
    logo: 'assets/amtechlogo.png',
    address: 'Baraipara Bazar Ashulia Savar Dhaka',
    phone: '+880 1736002401',
    website: 'https://amtechsolutionsbd.vercel.app/',
    websiteDisplay: 'www.amtechsolutionsbd.com'
  }
};
`;

fs.writeFileSync(outPath, content, 'utf8');
console.log('Wrote', outPath, '→', apiUrl);

document.addEventListener('DOMContentLoaded', () => {
  // Hydrate company info from IDE config (window.ERP_CONFIG.COMPANY)
  renderCompanyInfo();

  // If already logged in, skip straight to the dashboard.
  if (getToken()) {
    window.location.href = '/dashboard.html';
    return;
  }

  const form = document.getElementById('loginForm');
  const alertBox = document.getElementById('loginAlert');
  const loginBtn = document.getElementById('loginBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    alertBox.classList.add('d-none');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false
      });

      setSession(res.data.token, res.data.user);
      window.location.href = '/dashboard.html';
    } catch (err) {
      alertBox.textContent = err.message || 'Login failed.';
      alertBox.classList.remove('d-none');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  });
});

/**
 * Hydrates company branding & contact details from ERP_CONFIG (defined in config.js in IDE).
 */
function renderCompanyInfo() {
  const company = window.ERP_CONFIG && window.ERP_CONFIG.COMPANY;
  if (!company) return;

  const nameEl = document.getElementById('companyNameDisplay');
  const addressEl = document.getElementById('companyAddressDisplay');
  const phoneEl = document.getElementById('companyPhoneDisplay');
  const websiteLinkEl = document.getElementById('companyWebsiteLink');
  const websiteDisplayEl = document.getElementById('companyWebsiteDisplay');
  const logoImgEl = document.getElementById('companyLogoImg');

  if (nameEl && company.name) nameEl.textContent = company.name;
  if (addressEl && company.address) addressEl.textContent = company.address;
  if (phoneEl && company.phone) phoneEl.textContent = company.phone;
  if (websiteDisplayEl && (company.websiteDisplay || company.website)) {
    websiteDisplayEl.textContent = company.websiteDisplay || company.website.replace(/^https?:\/\//, '');
  }
  if (websiteLinkEl && company.website) {
    websiteLinkEl.href = company.website;
  }
  if (logoImgEl && company.logo) {
    logoImgEl.src = company.logo;
  }
}


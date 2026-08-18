/**
 * Tiny fetch wrapper shared by every page.
 * Keeps the base URL, auth header, and error handling in one place
 * so page-specific scripts stay small.
 */
const API_BASE_URL = (window.ERP_CONFIG && window.ERP_CONFIG.API_BASE_URL) || '/api';

function getToken() {
  return localStorage.getItem('erp_token');
}

function setSession(token, user) {
  localStorage.setItem('erp_token', token);
  localStorage.setItem('erp_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('erp_token');
  localStorage.removeItem('erp_user');
}

function getCurrentUser() {
  const raw = localStorage.getItem('erp_user');
  return raw ? JSON.parse(raw) : null;
}

async function apiRequest(path, { method = 'GET', body = null, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const tenantSubdomain = localStorage.getItem('erp_tenant_subdomain') || 'default';
  headers['X-Tenant-Subdomain'] = tenantSubdomain;

  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (netErr) {
    // Retrying once if GET request fails (e.g. backend waking up from cold start on Render)
    if (method === 'GET') {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        response = await fetch(`${API_BASE_URL}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined
        });
      } catch (retryErr) {
        const error = new Error('Unable to connect to the backend server. The server may be waking up or offline. Please retry in a few seconds.');
        error.status = 0;
        throw error;
      }
    } else {
      const error = new Error('Network error. Unable to reach backend server.');
      error.status = 0;
      throw error;
    }
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = json.message || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.errors = json.errors;
    throw error;
  }

  return json;
}

async function downloadBackupFile(format = 'zip') {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/settings/backup/download?format=${encodeURIComponent(format)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    const message = json.message || `Download failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/i);
  const filename = match ? match[1] : `erp-backup.${format === 'json' ? 'json' : 'zip'}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isDemoUser() {
  const user = getCurrentUser();
  return Boolean(user && (user.role || '').trim().toLowerCase() === 'demo');
}

function hasWritePermission() {
  return !isDemoUser();
}

function applyUiPermissions() {
  if (isDemoUser()) {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.classList.add('demo-mode');
      const styleEl = document.createElement('style');
      styleEl.innerHTML = `
        body.demo-mode .btn-primary:not(#logoutBtn),
        body.demo-mode .btn-success,
        body.demo-mode .btn-danger,
        body.demo-mode [data-require-write],
        body.demo-mode .demo-hide {
          display: none !important;
        }
        body.demo-mode input, body.demo-mode select, body.demo-mode textarea {
          pointer-events: auto;
        }
      `;
      document.head.appendChild(styleEl);
    });
  }
}

function requireAuthOrRedirect() {
  const user = getCurrentUser();
  if (!getToken() || !user) {
    window.location.href = '/login.html';
    return;
  }

  const role = (user.role || '').trim().toLowerCase();
  const path = window.location.pathname.toLowerCase();

  // Route-level permission checks
  const restrictedForDemoAndSales = [
    'settings.html',
    'employees.html',
    'payroll.html',
    'expenses.html',
    'payments.html',
    'purchases.html',
    'suppliers.html',
    'challans.html'
  ];

  if (role === 'demo') {
    if (restrictedForDemoAndSales.some((p) => path.includes(p))) {
      window.location.href = '/dashboard.html';
      return;
    }
  } else if (role === 'sales' || role === 'sales user') {
    if (restrictedForDemoAndSales.some((p) => path.includes(p))) {
      window.location.href = '/dashboard.html';
      return;
    }
  } else if (role === 'hr') {
    const restrictedForHR = ['settings.html', 'expenses.html', 'payments.html', 'purchases.html', 'suppliers.html', 'challans.html', 'sales.html', 'invoices.html'];
    if (restrictedForHR.some((p) => path.includes(p))) {
      window.location.href = '/dashboard.html';
      return;
    }
  }

  const activeSubdomain = (localStorage.getItem('erp_tenant_subdomain') || 'default').toLowerCase().trim();
  const isDefaultTenant = activeSubdomain === 'default' || activeSubdomain === '';

  if (path.includes('super-admin.html')) {
    if (!isDefaultTenant || (role !== 'admin' && role !== 'superadmin')) {
      window.location.href = '/dashboard.html';
      return;
    }
  }

  applyUiPermissions();
}

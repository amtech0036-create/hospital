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
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

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

function requireAuthOrRedirect() {
  if (!getToken()) {
    window.location.href = '/login.html';
  }
}

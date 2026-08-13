let cachedSettings = null;

async function getCompanySettings(forceRefresh = false) {
  if (!forceRefresh && cachedSettings) return cachedSettings;
  const res = await apiRequest('/settings');
  cachedSettings = res.data;
  return cachedSettings;
}

function clearCompanySettingsCache() {
  cachedSettings = null;
}

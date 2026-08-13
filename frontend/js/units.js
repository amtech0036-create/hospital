document.addEventListener('DOMContentLoaded', () => {
  requireAuthOrRedirect();
  renderSidebar('/units.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Units';
  initLookupPage({
    apiPath: '/units',
    entityLabel: 'Unit',
    extraField: { key: 'shortName', inputId: 'lookupShortName' }
  });
});

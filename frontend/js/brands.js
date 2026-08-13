document.addEventListener('DOMContentLoaded', () => {
  requireAuthOrRedirect();
  renderSidebar('/brands.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Brands';
  initLookupPage({ apiPath: '/brands', entityLabel: 'Brand' });
});

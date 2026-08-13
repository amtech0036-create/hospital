document.addEventListener('DOMContentLoaded', () => {
  requireAuthOrRedirect();
  renderSidebar('/categories.html');
  renderTopbar();
  document.getElementById('pageTitle').textContent = 'Categories';
  initLookupPage({ apiPath: '/categories', entityLabel: 'Category' });
});

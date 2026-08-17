/**
 * Renders the shared sidebar + topbar into any page that includes this
 * script and has <div id="erpSidebar"></div> and <div id="erpTopbar"></div>.
 * Keeping this in one file means the nav only needs to be edited once
 * as new modules (Phase 2+) are added.
 */
const SIDEBAR_SECTIONS = [
  { title: null, links: [{ label: 'Dashboard', href: '/dashboard.html', icon: 'bi-speedometer2' }] },
  {
    title: 'Inventory',
    links: [
      { label: 'Products', href: '/products.html' },
      { label: 'Categories', href: '/categories.html' },
      { label: 'Brands', href: '/brands.html' },
      { label: 'Stock', href: '/stock.html' }
    ]
  },
  {
    title: 'Sales',
    links: [
      { label: 'New Sale', href: '/sales.html' },
      { label: 'Invoices', href: '/invoices.html' }
    ]
  },
  { title: 'Purchases', links: [{ label: 'Purchases', href: '/purchases.html' }] },
  { title: 'Customers', links: [{ label: 'Customers', href: '/customers.html' }] },
  { title: 'Suppliers', links: [{ label: 'Suppliers', href: '/suppliers.html' }] },
  { title: 'Challan', links: [{ label: 'Challans', href: '/challans.html' }] },
  {
    title: 'Accounts',
    links: [
      { label: 'Expenses', href: '/expenses.html' },
      { label: 'Payments', href: '/payments.html' }
    ]
  },
  { title: 'HR & Payroll', links: [{ label: 'Employees', href: '/employees.html' }, { label: 'Payroll', href: '/payroll.html' }] },
  { title: 'Reports', links: [{ label: 'Reports', href: '/reports.html' }] },
  { title: 'Settings', links: [{ label: 'Settings', href: '/settings.html' }] }
];

function getPermittedSections() {
  const user = getCurrentUser();
  const role = (user && user.role ? user.role : '').trim();
  const lowerRole = role.toLowerCase();

  // Admin & Manager have access to all sections
  if (lowerRole === 'admin' || lowerRole === 'manager') {
    return SIDEBAR_SECTIONS;
  }

  return SIDEBAR_SECTIONS.map((section) => {
    if (lowerRole === 'demo') {
      // Demo: Dashboard, Inventory (Products, Categories, Brands, Stock), Reports
      if (section.title && ['Accounts', 'HR & Payroll', 'Settings', 'Purchases', 'Suppliers', 'Challan', 'Sales', 'Customers'].includes(section.title)) {
        return null;
      }
    } else if (lowerRole === 'sales' || lowerRole === 'sales user') {
      // Sales: Dashboard, Sales, Customers, Inventory
      if (section.title && ['Accounts', 'HR & Payroll', 'Settings', 'Purchases', 'Suppliers', 'Challan'].includes(section.title)) {
        return null;
      }
    } else if (lowerRole === 'hr') {
      // HR: Dashboard, HR & Payroll, Reports
      if (section.title && ['Accounts', 'Purchases', 'Suppliers', 'Sales', 'Challan', 'Settings', 'Customers'].includes(section.title)) {
        return null;
      }
    } else if (lowerRole === 'accountant') {
      // Accountant: Dashboard, Accounts, Sales, Purchases, Reports, Customers, Suppliers
      if (section.title && ['HR & Payroll', 'Settings'].includes(section.title)) {
        return null;
      }
    }

    return section;
  }).filter(Boolean);
}

function renderSidebar(activeHref) {
  const container = document.getElementById('erpSidebar');
  if (!container) return;

  const permittedSections = getPermittedSections();

  const sectionsHtml = permittedSections.map((section) => {
    const linksHtml = section.links
      .map((link) => {
        const isActive = link.href === activeHref;
        return `<a class="nav-link${isActive ? ' active' : ''}" href="${link.href}">${link.label}</a>`;
      })
      .join('');
    const titleHtml = section.title ? `<div class="nav-section-title">${section.title}</div>` : '';
    return `${titleHtml}<nav class="nav flex-column">${linksHtml}</nav>`;
  }).join('');

  container.innerHTML = `
    <div class="brand">
      <span class="brand-text">A&M Tech Solutions-ERP</span>
      <button type="button" class="erp-sidebar-close" id="sidebarCloseBtn" aria-label="Close menu">&times;</button>
    </div>
    <div class="erp-sidebar-scroll-wrap">
      <div class="erp-sidebar-scroll-fade erp-sidebar-scroll-fade-top" id="sidebarFadeTop" aria-hidden="true"></div>
      <div class="erp-sidebar-scroll" id="erpSidebarScroll">
        ${sectionsHtml}
      </div>
      <div class="erp-sidebar-scroll-fade erp-sidebar-scroll-fade-bottom" id="sidebarFadeBottom" aria-hidden="true"></div>
    </div>
  `;

  initSidebarScroll();
}

function initSidebarScroll() {
  const scrollEl = document.getElementById('erpSidebarScroll');
  const fadeTop = document.getElementById('sidebarFadeTop');
  const fadeBottom = document.getElementById('sidebarFadeBottom');
  if (!scrollEl) return;

  function updateScrollHints() {
    const { scrollTop, scrollHeight, clientHeight } = scrollEl;
    const canScroll = scrollHeight > clientHeight + 2;
    const atTop = scrollTop <= 4;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 4;

    scrollEl.classList.toggle('is-scrollable', canScroll);
    fadeTop?.classList.toggle('visible', canScroll && !atTop);
    fadeBottom?.classList.toggle('visible', canScroll && !atBottom);
  }

  scrollEl.addEventListener('scroll', updateScrollHints, { passive: true });
  window.addEventListener('resize', updateScrollHints);
  updateScrollHints();
}

function initMobileNav() {
  const sidebar = document.getElementById('erpSidebar');
  if (!sidebar) return;

  let backdrop = document.getElementById('erpSidebarBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'erpSidebarBackdrop';
    backdrop.className = 'erp-sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
    document.body.classList.remove('sidebar-open');
  }

  function openSidebar() {
    sidebar.classList.add('open');
    backdrop.classList.add('show');
    document.body.classList.add('sidebar-open');
  }

  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    if (sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
  });

  document.getElementById('sidebarCloseBtn')?.addEventListener('click', closeSidebar);
  backdrop.addEventListener('click', closeSidebar);
  sidebar.querySelectorAll('.erp-sidebar-scroll .nav-link').forEach((link) => link.addEventListener('click', closeSidebar));

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 992) closeSidebar();
  });
}

function renderTopbar() {
  const container = document.getElementById('erpTopbar');
  if (!container) return;

  const user = getCurrentUser();
  const isDemo = user && (user.role || '').toLowerCase() === 'demo';

  const activeSubdomain = localStorage.getItem('erp_tenant_subdomain') || 'default';

  container.innerHTML = `
    <div class="erp-topbar">
      <div class="erp-topbar-inner">
        <div class="erp-topbar-left">
          <button type="button" class="btn btn-outline-secondary erp-menu-btn d-lg-none" id="sidebarToggle" aria-label="Open menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="4" y1="7" x2="20" y2="7"></line>
              <line x1="4" y1="12" x2="20" y2="12"></line>
              <line x1="4" y1="17" x2="20" y2="17"></line>
            </svg>
          </button>
          <h5 id="pageTitle"></h5>
          ${isDemo ? '<span class="badge bg-warning text-dark ms-3"><i class="bi bi-eye-fill me-1"></i> Demo Mode (Read Only)</span>' : ''}
        </div>
        <div class="erp-topbar-right">
          <span class="badge bg-info text-dark me-2" style="font-size: 0.82rem;"><i class="bi bi-building me-1"></i>${activeSubdomain}</span>
          <span class="erp-user-badge">${user ? user.name + ' · ' + user.role : ''}</span>
          <button class="btn btn-sm btn-outline-secondary" id="logoutBtn">Logout</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearSession();
    window.location.href = '/login.html';
  });

  initMobileNav();
}

// ============================================================
// admin-nav.js — Navigation et sidebar commune admin
// ============================================================

const ADMIN_SESSION = 'admin_logged';

function checkAdminAuth() {
  if (sessionStorage.getItem(ADMIN_SESSION) !== '1') {
    window.location.href = getBase() + 'index.html';
  }
}

function getBase() {
  const path = location.pathname;
  if (path.includes('/pages/')) return '../';
  return '';
}

function adminLogout() {
  sessionStorage.removeItem(ADMIN_SESSION);
  window.location.href = getBase() + 'index.html';
}

function buildSidebar(activePage) {
  const base = getBase();
  const pages = [
    { id: 'overview',     label: 'Vue globale',    href: base + 'index.html',              icon: 'M4 6h16M4 10h16M4 14h10' },
    { id: 'affiliates',   label: 'Affiliés',        href: base + 'pages/affiliates.html',   icon: 'M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4.13a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'links',        label: 'Liens',           href: base + 'pages/links.html',        icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101' },
    { id: 'withdrawals',  label: 'Retraits',        href: base + 'pages/withdrawals.html',  icon: 'M12 8c-2.21 0-4 1.343-4 3s1.79 3 4 3 4 1.343 4 3-1.79 3-4 3m0-18v2m0 16v2', badge: true },
    { id: 'create',       label: 'Créer un lien',   href: base + 'pages/create.html',       icon: 'M12 4v16m8-8H4', section: 'Actions' },
  ];

  const pending = DB.getWithdrawals().filter(w => w.status === 'pending').length;

  const navHTML = pages.map((p, i) => {
    const sectionHTML = p.section ? `<span class="nav-section">${p.section}</span>` : (i === 0 ? '<span class="nav-section">Principal</span>' : '');
    const badgeHTML = p.badge && pending > 0 ? `<span class="badge">${pending}</span>` : '';
    return `${sectionHTML}
    <a href="${p.href}" class="nav-item ${activePage === p.id ? 'active' : ''}">
      <svg class="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${p.icon}"/>
      </svg>
      ${p.label}${badgeHTML}
    </a>`;
  }).join('');

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-top">
        <div class="logo">AffiliTrack <span>Dashboard Admin</span></div>
      </div>
      <nav>${navHTML}</nav>
      <div class="sidebar-bottom">
        <button class="logout-btn" onclick="adminLogout()">Déconnexion</button>
      </div>
    </aside>`;
}

function buildMobileHeader() {
  return `
    <header class="mobile-header" id="mobile-header">
      <span class="mobile-logo">AffiliTrack</span>
      <button class="hamburger" id="hamburger" onclick="toggleMenu()">
        <span></span><span></span><span></span>
      </button>
    </header>
    <div class="overlay" id="overlay" onclick="closeMenu()"></div>`;
}

function toggleMenu() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('hamburger').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}
function closeMenu() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

function renderAdminShell(activePage, contentHTML) {
  document.body.innerHTML = buildMobileHeader() + `
    <div class="app-layout">
      ${buildSidebar(activePage)}
      <main class="content">${contentHTML}</main>
    </div>`;
}

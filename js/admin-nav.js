// ============================================================
// admin-nav.js — Shell commun admin
// ============================================================
const ADMIN_SESSION = 'admin_logged';

function base() {
  return location.pathname.includes('/pages/') ? '../' : '';
}

function checkAdminAuth() {
  if (sessionStorage.getItem(ADMIN_SESSION) !== '1') {
    location.href = base() + 'index.html';
  }
}

function adminLogout() {
  sessionStorage.removeItem(ADMIN_SESSION);
  location.href = base() + 'index.html';
}

function toggleMenu() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('burger').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}
function closeMenu() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('burger').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

function pendingCount() {
  return DB.getWithdrawals().filter(w => w.status === 'pending').length;
}

function renderShell(activePage, contentHTML) {
  const b = base();
  const pending = pendingCount();

  const links = [
    { id: 'overview',    label: 'Vue globale',   href: b + 'index.html',             group: 'Suivi' },
    { id: 'affiliates',  label: 'Affiliés',       href: b + 'pages/affiliates.html',  group: 'Suivi' },
    { id: 'links',       label: 'Liens',          href: b + 'pages/links.html',       group: 'Suivi' },
    { id: 'withdrawals', label: 'Retraits',       href: b + 'pages/withdrawals.html', group: 'Suivi',
      badge: pending > 0 ? pending : 0 },
    { id: 'create',      label: 'Créer un affilié', href: b + 'pages/create.html',   group: 'Actions' },
  ];

  let lastGroup = '';
  const navHTML = links.map(l => {
    let out = '';
    if (l.group !== lastGroup) {
      out += `<div class="nav-group">${l.group}</div>`;
      lastGroup = l.group;
    }
    out += `<a href="${l.href}" class="nav-link ${activePage === l.id ? 'active' : ''}">${l.label}${l.badge ? `<span class="nav-badge">${l.badge}</span>` : ''}</a>`;
    return out;
  }).join('');

  document.body.innerHTML = `
    <header class="mob-header" id="mob-header">
      <span class="mob-brand">Crushet</span>
      <button class="mob-burger" id="burger" onclick="toggleMenu()">
        <span></span><span></span><span></span>
      </button>
    </header>
    <div class="overlay" id="overlay" onclick="closeMenu()"></div>
    <div class="app">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">Crushet <small>Admin</small></div>
        <nav>${navHTML}</nav>
        <div class="sidebar-footer">
          <button class="btn-logout" onclick="adminLogout()">Déconnexion</button>
        </div>
      </aside>
      <main class="main" id="main-content">${contentHTML}</main>
    </div>`;
}

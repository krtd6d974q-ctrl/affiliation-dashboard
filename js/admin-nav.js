// ============================================================
// admin-nav.js — Shell commun admin
// ============================================================
const ADMIN_SESSION = 'admin_logged';

// Loader visible immédiatement sur toutes les pages admin
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('admin-loader')) {
    const l = document.createElement('div');
    l.id = 'admin-loader';
    l.style.cssText = 'position:fixed;inset:0;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:9999;font-family:Inter,system-ui,sans-serif';
    l.innerHTML = `
      <div style="font-size:1.1rem;font-weight:900;color:#0a0a0a;letter-spacing:-.5px">Crush Affi</div>
      <div style="width:28px;height:28px;border:3px solid #e8e8e8;border-top-color:#8afd3a;border-radius:50%;animation:_sp .7s linear infinite"></div>
      <style>@keyframes _sp{to{transform:rotate(360deg)}}</style>`;
    document.body.appendChild(l);
  }
});

function base() {
  return location.pathname.includes('/pages/') ? '' : 'pages/';
}

function checkAdminAuth() {
  const ok = localStorage.getItem(ADMIN_SESSION) === '1' ||
             sessionStorage.getItem(ADMIN_SESSION) === '1';
  if (!ok) location.href = (location.pathname.includes('/pages/') ? '' : 'pages/') + 'affiliate.html';
}

function adminLogout() {
  localStorage.removeItem(ADMIN_SESSION);
  sessionStorage.removeItem(ADMIN_SESSION);
  location.href = 'affiliate.html';
}

function toggleMenu() {
  document.getElementById('mob-menu').classList.toggle('open');
  document.getElementById('burger').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}
function closeMenu() {
  document.getElementById('mob-menu').classList.remove('open');
  document.getElementById('burger').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

function renderShell(activePage, contentHTML, pendingBadge) {
  const l = document.getElementById('admin-loader');
  if (l) l.remove();
  const pending = pendingBadge || 0;

  const links = [
    { id: 'affiliates',  label: 'Affiliés',       href: 'affiliates.html',  group: 'Suivi' },
    { id: 'links',       label: 'Liens',           href: 'links.html',       group: 'Suivi' },
    { id: 'withdrawals', label: 'Retraits',        href: 'withdrawals.html', group: 'Suivi',
      badge: pending > 0 ? pending : 0 },
    { id: 'create',      label: 'Nouvel affilié',  href: 'create.html',      group: 'Actions' },
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

  const mobLinksHTML = links.map(l =>
    `<a href="${l.href}" class="mob-menu-link ${activePage === l.id ? 'active' : ''}">${l.label}${l.badge ? ` <span class="nav-badge">${l.badge}</span>` : ''}</a>`
  ).join('');

  document.body.innerHTML = `
    <div class="mob-nav-wrap" id="mob-nav-wrap">
      <header class="mob-header">
        <span class="mob-brand">Crush Affi</span>
        <button class="mob-burger" id="burger" onclick="toggleMenu()"><span></span><span></span><span></span></button>
      </header>
      <div class="mob-menu" id="mob-menu">
        ${mobLinksHTML}
        <div class="mob-menu-sep"></div>
        <button class="mob-menu-logout" onclick="adminLogout()">Déconnexion</button>
      </div>
    </div>
    <div class="overlay" id="overlay" onclick="closeMenu()"></div>
    <div class="app">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">Crush Affi <small>Admin</small></div>
        <nav>${navHTML}</nav>
        <div class="sidebar-footer">
          <button class="btn-logout" onclick="adminLogout()">Déconnexion</button>
        </div>
      </aside>
      <main class="main" id="main-content">${contentHTML}</main>
    </div>`;
}

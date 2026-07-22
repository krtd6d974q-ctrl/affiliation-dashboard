// ============================================================
// admin.js — Logique du dashboard admin
// ============================================================

const ADMIN_SESSION = 'admin_logged';

// ---------- Auth ----------
function adminLogin() {
  const pass = document.getElementById('admin-password').value;
  if (pass === DB.getAdminPassword()) {
    sessionStorage.setItem(ADMIN_SESSION, '1');
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    initDashboard();
  } else {
    document.getElementById('login-error').classList.remove('hidden');
  }
}

function adminLogout() {
  sessionStorage.removeItem(ADMIN_SESSION);
  location.reload();
}

// ---------- Init ----------
function initDashboard() {
  if (sessionStorage.getItem(ADMIN_SESSION) !== '1') return;
  renderOverview();
  renderAffiliates();
  renderLinks();
  renderWithdrawals();
  startRealtime();
}

function startRealtime() {
  setInterval(() => {
    renderOverview();
    renderAffiliates();
    renderLinks();
    renderWithdrawals();
  }, 3000);
}

// ---------- Tabs ----------
function showTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + name).classList.remove('hidden');
  if (el) el.classList.add('active');
  closeMenu();
}

// ---------- Overview ----------
function renderOverview() {
  const clicks = DB.getClicks();
  const affiliates = DB.getAffiliates();
  const links = DB.getLinks();

  const totalClicks = clicks.length;
  const totalAff = Object.keys(affiliates).length;
  const totalLinks = Object.keys(links).length;
  const totalRevenue = Object.values(affiliates).reduce((s, a) => s + (a.earned || 0), 0);

  document.getElementById('total-clicks').textContent = totalClicks.toLocaleString('fr-FR');
  document.getElementById('total-revenue').textContent = totalRevenue.toFixed(2) + ' €';
  document.getElementById('total-affiliates').textContent = totalAff;
  document.getElementById('total-links').textContent = totalLinks;

  // Platform breakdown
  const platforms = { iOS: 0, Android: 0, PC: 0 };
  clicks.forEach(c => { if (platforms[c.platform] !== undefined) platforms[c.platform]++; });
  renderPlatformBars('global-platforms', platforms, totalClicks);

  // Recent activity
  const recent = clicks.slice(0, 10);
  const el = document.getElementById('recent-activity');
  if (recent.length === 0) { el.innerHTML = '<p class="empty">Aucune activité récente</p>'; return; }
  el.innerHTML = recent.map(c => {
    const aff = DB.getAffiliate(c.affId);
    const name = aff ? aff.name : 'Inconnu';
    return `<div class="activity-item">
      <span class="platform-tag platform-${c.platform.toLowerCase()}">${c.platform}</span>
      <span>${name}</span>
      <span class="activity-time">${DB.formatDate(c.ts)}</span>
    </div>`;
  }).join('');
}

function renderPlatformBars(containerId, platforms, total) {
  const el = document.getElementById(containerId);
  if (total === 0) { el.innerHTML = '<p class="empty">Aucun clic enregistré</p>'; return; }
  const colors = { iOS: '#6366f1', Android: '#10b981', PC: '#f59e0b' };
  el.innerHTML = Object.entries(platforms).map(([name, count]) => {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return `<div class="platform-row">
      <span class="platform-label">${name}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${pct}%;background:${colors[name]}"></div>
      </div>
      <span class="platform-count">${count} (${pct}%)</span>
    </div>`;
  }).join('');
}

// ---------- Affiliates ----------
function renderAffiliates() {
  const affiliates = DB.getAffiliates();
  const tbody = document.getElementById('affiliates-tbody');
  const entries = Object.entries(affiliates);
  if (entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty">Aucun affilié</td></tr>';
    return;
  }
  tbody.innerHTML = entries.map(([id, aff]) => `
    <tr>
      <td>${aff.name}</td>
      <td>${aff.email}</td>
      <td>${(aff.clicks || 0).toLocaleString('fr-FR')}</td>
      <td>${(aff.earned || 0).toFixed(2)} €</td>
      <td><strong>${(aff.balance || 0).toFixed(2)} €</strong></td>
      <td><button class="btn-sm" onclick="deleteAffiliate('${id}')">Supprimer</button></td>
    </tr>
  `).join('');
}

function deleteAffiliate(id) {
  if (!confirm('Supprimer cet affilié ?')) return;
  const all = DB.getAffiliates();
  delete all[id];
  DB.saveAffiliates(all);
  renderAffiliates();
}

// ---------- Links ----------
function renderLinks() {
  const links = DB.getLinks();
  const affiliates = DB.getAffiliates();
  const tbody = document.getElementById('links-tbody');
  const entries = Object.entries(links);
  if (entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">Aucun lien</td></tr>';
    return;
  }
  tbody.innerHTML = entries.map(([id, link]) => {
    const aff = affiliates[link.affId];
    const name = aff ? aff.name : 'Inconnu';
    const trackUrl = `${location.origin}${location.pathname.replace('index.html', '')}pages/track.html?lid=${id}`;
    return `<tr>
      <td><code>${id}</code></td>
      <td>${name}</td>
      <td><a href="${link.target}" target="_blank" class="link-url">${link.target.substring(0, 30)}…</a></td>
      <td>${(link.clicks || 0).toLocaleString('fr-FR')}</td>
      <td>${DB.computeEarned(link.clicks || 0, link.rate).toFixed(2)} €</td>
      <td>${DB.formatDate(link.createdAt)}</td>
      <td><button class="btn-sm" onclick="copyTrackLink('${id}')">Copier</button></td>
    </tr>`;
  }).join('');
}

function copyTrackLink(id) {
  const url = `${location.origin}${location.pathname.replace('index.html', '')}pages/track.html?lid=${id}`;
  navigator.clipboard.writeText(url).then(() => alert('Lien copié !'));
}

// ---------- Withdrawals ----------
function renderWithdrawals() {
  const withdrawals = DB.getWithdrawals();
  const affiliates = DB.getAffiliates();
  const tbody = document.getElementById('withdrawals-tbody');
  const pending = withdrawals.filter(w => w.status === 'pending');

  // Badge
  const badge = document.getElementById('withdrawal-badge');
  if (pending.length > 0) {
    badge.textContent = pending.length;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  document.getElementById('no-withdrawals').style.display = withdrawals.length === 0 ? 'block' : 'none';

  tbody.innerHTML = withdrawals.map(w => {
    const aff = affiliates[w.affId];
    const name = aff ? aff.name : 'Inconnu';
    const methodLabel = { paypal: 'PayPal', virement: 'Virement', crypto: 'Crypto' }[w.method] || w.method;
    const statusClass = { pending: 'status-pending', done: 'status-done', rejected: 'status-rejected' }[w.status];
    const statusLabel = { pending: '⏳ En attente', done: '✅ Traité', rejected: '❌ Refusé' }[w.status];

    let details = '';
    if (w.method === 'paypal') details = w.paypal || '-';
    else if (w.method === 'virement') details = `${w.firstname} ${w.lastname} — ${w.iban || '-'}`;
    else if (w.method === 'crypto') details = `${w.wallet || '-'} (${w.network || '-'})`;

    return `<tr>
      <td>${name}</td>
      <td><strong>${w.amount.toFixed(2)} €</strong></td>
      <td>${methodLabel}</td>
      <td class="details-cell">${details}</td>
      <td>${DB.formatDate(w.ts)}</td>
      <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
      <td>
        ${w.status === 'pending' ? `
          <button class="btn-sm btn-green" onclick="processWithdrawal('${w.id}','done')">✅ Traiter</button>
          <button class="btn-sm" onclick="processWithdrawal('${w.id}','rejected')">❌ Refuser</button>
        ` : '—'}
      </td>
    </tr>`;
  }).join('');
}

function processWithdrawal(id, status) {
  DB.updateWithdrawal(id, { status, processedAt: Date.now() });
  // Si refusé, remettre le solde à l'affilié
  const w = DB.getWithdrawals().find(x => x.id === id);
  if (w && status === 'rejected') {
    const aff = DB.getAffiliate(w.affId);
    if (aff) { aff.balance = (aff.balance || 0) + w.amount; DB.saveAffiliate(w.affId, aff); }
  }
  renderWithdrawals();
  renderAffiliates();
}

// ---------- Create Link ----------
function createLink() {
  const name = document.getElementById('aff-name').value.trim();
  const email = document.getElementById('aff-email').value.trim();
  const target = document.getElementById('aff-target').value.trim();
  const rate = parseFloat(document.getElementById('aff-rate').value) || 5;
  const password = document.getElementById('aff-password').value.trim();

  if (!name || !email || !target || !password) {
    alert('Veuillez remplir tous les champs obligatoires.');
    return;
  }

  const affId = DB.generateId();
  const linkId = DB.generateId();
  const base = location.href.replace('index.html', '');

  // Créer affilié
  DB.saveAffiliate(affId, {
    id: affId, name, email, password,
    clicks: 0, earned: 0, balance: 0,
    createdAt: Date.now()
  });

  // Créer lien
  DB.saveLink(linkId, {
    id: linkId, affId, target, rate,
    clicks: 0, createdAt: Date.now()
  });

  const trackUrl = `${base}pages/track.html?lid=${linkId}`;
  const affUrl = `${base}pages/affiliate.html?id=${affId}`;

  document.getElementById('generated-link').value = trackUrl;
  document.getElementById('affiliate-dashboard-link').value = affUrl;
  document.getElementById('created-link-box').classList.remove('hidden');

  renderOverview(); renderAffiliates(); renderLinks();
}

function copyLink() {
  const val = document.getElementById('generated-link').value;
  navigator.clipboard.writeText(val).then(() => alert('Lien de tracking copié !'));
}
function copyAffLink() {
  const val = document.getElementById('affiliate-dashboard-link').value;
  navigator.clipboard.writeText(val).then(() => alert('Lien dashboard affilié copié !'));
}

// ---------- Notifications ----------
function showNotif(text) {
  document.getElementById('notif-text').innerHTML = text;
  document.getElementById('notif-popup').classList.remove('hidden');
}
function closeNotif() {
  document.getElementById('notif-popup').classList.add('hidden');
}

// Écoute les nouvelles demandes de retrait
let lastWithdrawalCount = 0;
function checkNewWithdrawals() {
  const pending = DB.getWithdrawals().filter(w => w.status === 'pending');
  if (pending.length > lastWithdrawalCount) {
    const latest = pending[0];
    const aff = DB.getAffiliate(latest.affId);
    showNotif(`💸 <strong>${aff ? aff.name : 'Un affilié'}</strong> demande un retrait de <strong>${latest.amount.toFixed(2)} €</strong> via ${latest.method}`);
  }
  lastWithdrawalCount = pending.length;
}

// ---------- Mobile menu ----------
function toggleMenu() {
  const sidebar = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburger');
  const overlay = document.getElementById('overlay');
  sidebar.classList.toggle('open');
  hamburger.classList.toggle('open');
  overlay.classList.toggle('show');
}
function closeMenu() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

// ---------- Boot ----------
window.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem(ADMIN_SESSION) === '1') {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('mobile-header').classList.remove('hidden');
    initDashboard();
  }
  document.getElementById('admin-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') adminLogin();
  });
  setInterval(checkNewWithdrawals, 4000);
});

// ============================================================
// affiliate.js — Logique du dashboard affilié
// ============================================================

let currentAffId = null;
const AFF_SESSION = 'aff_session';

// ---------- Auth ----------
function affLogin() {
  const inputId = document.getElementById('aff-login-id').value.trim();
  const inputPass = document.getElementById('aff-login-pass').value;

  // Recherche par ID exact ou par email
  let foundId = null;
  const affiliates = DB.getAffiliates();

  if (affiliates[inputId]) {
    foundId = inputId;
  } else {
    for (const [id, aff] of Object.entries(affiliates)) {
      if (aff.email === inputId) { foundId = id; break; }
    }
  }

  if (!foundId) {
    document.getElementById('aff-login-error').classList.remove('hidden');
    return;
  }

  const aff = affiliates[foundId];
  if (aff.password !== inputPass) {
    document.getElementById('aff-login-error').classList.remove('hidden');
    return;
  }

  sessionStorage.setItem(AFF_SESSION, foundId);
  currentAffId = foundId;
  showAffiliateDashboard();
}

function affLogout() {
  sessionStorage.removeItem(AFF_SESSION);
  location.reload();
}

function showAffiliateDashboard() {
  document.getElementById('aff-login-screen').classList.add('hidden');
  document.getElementById('aff-dashboard').classList.remove('hidden');
  document.getElementById('mobile-header').classList.remove('hidden');

  const aff = DB.getAffiliate(currentAffId);
  document.getElementById('aff-display-name').textContent = aff.name;
  document.getElementById('aff-display-id').textContent = 'ID : ' + currentAffId;

  loadPaymentInfo();
  renderAffStats();
  startAffRealtime();
}

function startAffRealtime() {
  setInterval(() => {
    renderAffStats();
    renderAffEarnings();
  }, 3000);
}

// ---------- Tabs ----------
function affShowTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + name).classList.remove('hidden');
  if (el) el.classList.add('active');
  closeMenu();

  if (name === 'aff-earnings') renderAffEarnings();
  if (name === 'aff-withdraw') renderMyWithdrawals();
  if (name === 'aff-payment') loadPaymentInfo();}

// ---------- Stats ----------
function renderAffStats() {
  const aff = DB.getAffiliate(currentAffId);
  if (!aff) return;

  const clicks = aff.clicks || 0;
  const earned = aff.earned || 0;
  const balance = aff.balance || 0;
  const rate = getAffRate();
  const nextMilestone = (Math.floor(clicks / 1000) + 1) * 1000;
  const progressInCycle = clicks % 1000;

  document.getElementById('aff-total-clicks').textContent = clicks.toLocaleString('fr-FR');
  document.getElementById('aff-total-earned').textContent = earned.toFixed(2) + ' €';
  document.getElementById('aff-balance').textContent = balance.toFixed(2) + ' €';
  document.getElementById('aff-next-milestone').textContent = nextMilestone.toLocaleString('fr-FR') + ' clics';

  // Barre de progression
  const pct = (progressInCycle / 1000) * 100;
  document.getElementById('aff-progress-bar').style.width = pct + '%';
  document.getElementById('aff-progress-text').textContent =
    `${progressInCycle} / 1000 clics — prochain gain : ${rate.toFixed(2)} €`;

  // Mon lien
  const links = DB.getLinks();
  const myLink = Object.entries(links).find(([, l]) => l.affId === currentAffId);
  if (myLink) {
    const base = location.href.replace('pages/affiliate.html', '');
    document.getElementById('aff-my-link').value = `${base}pages/track.html?lid=${myLink[0]}`;
  }

  // Plateformes
  const allClicks = DB.getClicksForAffiliate(currentAffId);
  const platforms = { iOS: 0, Android: 0, PC: 0 };
  allClicks.forEach(c => { if (platforms[c.platform] !== undefined) platforms[c.platform]++; });
  renderAffPlatforms(platforms, allClicks.length);

  // Historique récent
  const recentClicks = allClicks.slice(0, 20);
  const el = document.getElementById('aff-click-history');
  if (recentClicks.length === 0) { el.innerHTML = '<p class="empty">Aucun clic pour l\'instant</p>'; return; }
  el.innerHTML = recentClicks.map(c => `
    <div class="activity-item">
      <span class="platform-tag platform-${c.platform.toLowerCase()}">${c.platform}</span>
      <span>${DB.formatDate(c.ts)}</span>
    </div>
  `).join('');
}

function renderAffPlatforms(platforms, total) {
  const el = document.getElementById('aff-platforms');
  if (total === 0) { el.innerHTML = '<p class="empty">Aucun clic</p>'; return; }
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

function getAffRate() {
  const links = DB.getLinks();
  const myLink = Object.values(links).find(l => l.affId === currentAffId);
  return myLink ? (myLink.rate || DB.DEFAULT_RATE) : DB.DEFAULT_RATE;
}

// ---------- Earnings ----------
function renderAffEarnings() {
  const aff = DB.getAffiliate(currentAffId);
  if (!aff) return;
  const earned = aff.earned || 0;
  const balance = aff.balance || 0;
  const withdrawn = earned - balance;

  document.getElementById('earn-total').textContent = earned.toFixed(2) + ' €';
  document.getElementById('earn-withdrawn').textContent = Math.max(0, withdrawn).toFixed(2) + ' €';
  document.getElementById('earn-balance').textContent = balance.toFixed(2) + ' €';
  document.getElementById('earn-rate').textContent = getAffRate() + ' €';

  const earnings = DB.getEarningsForAffiliate(currentAffId);
  const earningsEl = document.getElementById('earnings-history');
  if (earnings.length === 0) {
    earningsEl.innerHTML = '<p class="empty">Aucun gain encore — continuez à partager votre lien !</p>';
  } else {
    earningsEl.innerHTML = earnings.map(e => `
      <div class="activity-item">
        <span class="earn-badge">+${e.amount.toFixed(2)} €</span>
        <span>Palier atteint : ${e.clicks.toLocaleString('fr-FR')} clics</span>
        <span class="activity-time">${DB.formatDate(e.ts)}</span>
      </div>
    `).join('');
  }

  renderMyWithdrawals();
}

function renderMyWithdrawals() {
  const withdrawals = DB.getWithdrawalsForAffiliate(currentAffId);
  const el = document.getElementById('withdrawals-history') || document.getElementById('my-withdrawals');
  if (!el) return;
  if (withdrawals.length === 0) {
    el.innerHTML = '<p class="empty">Aucun retrait effectué</p>';
    return;
  }
  const statusLabel = { pending: 'En attente', done: 'Traité', rejected: 'Refusé' };
  el.innerHTML = withdrawals.map(w => `
    <div class="activity-item">
      <span class="earn-badge withdraw-badge">-${w.amount.toFixed(2)} €</span>
      <span>${{ paypal: 'PayPal', virement: 'Virement', crypto: 'Crypto' }[w.method] || w.method}</span>
      <span class="status-inline">${statusLabel[w.status] || w.status}</span>
      <span class="activity-time">${DB.formatDate(w.ts)}</span>
    </div>
  `).join('');
}

// ---------- Withdrawal ----------
function updateWithdrawMethod() {
  const method = document.getElementById('withdraw-method').value;
  const aff = DB.getAffiliate(currentAffId);
  const payInfo = aff.paymentInfo || {};
  const infoEl = document.getElementById('withdraw-details');
  const textEl = document.getElementById('withdraw-method-info');

  if (!method) { infoEl.classList.add('hidden'); return; }
  infoEl.classList.remove('hidden');

  if (method === 'paypal') {
    textEl.innerHTML = payInfo.paypal
      ? `PayPal : <strong>${payInfo.paypal}</strong>`
      : 'Aucun PayPal configuré — <a href="#" onclick="affShowTab(\'aff-payment\', null)">Configurer</a>';
  } else if (method === 'virement') {
    textEl.innerHTML = payInfo.iban
      ? `Virement vers <strong>${payInfo.firstname} ${payInfo.lastname}</strong> — IBAN : <strong>${payInfo.iban}</strong>`
      : 'Aucun IBAN configuré — <a href="#" onclick="affShowTab(\'aff-payment\', null)">Configurer</a>';
  } else if (method === 'crypto') {
    textEl.innerHTML = payInfo.wallet
      ? `Wallet : <strong>${payInfo.wallet}</strong> (${payInfo.cryptoNetwork || '?'})`
      : 'Aucun wallet configuré — <a href="#" onclick="affShowTab(\'aff-payment\', null)">Configurer</a>';
  }
}

function requestWithdrawal() {
  const amount = parseFloat(document.getElementById('withdraw-amount').value);
  const method = document.getElementById('withdraw-method').value;
  const aff = DB.getAffiliate(currentAffId);

  if (!amount || amount <= 0) { alert('Montant invalide.'); return; }
  if (!method) { alert('Choisissez une méthode de paiement.'); return; }
  if (!aff) return;

  const balance = aff.balance || 0;
  if (amount > balance) { alert(`Solde insuffisant. Disponible : ${balance.toFixed(2)} €`); return; }

  const payInfo = aff.paymentInfo || {};
  const w = {
    id: DB.generateId(),
    affId: currentAffId,
    amount,
    method,
    status: 'pending',
    ts: Date.now(),
    paypal: payInfo.paypal || '',
    firstname: payInfo.firstname || '',
    lastname: payInfo.lastname || '',
    iban: payInfo.iban || '',
    wallet: payInfo.wallet || '',
    network: payInfo.cryptoNetwork || ''
  };

  // Déduire du solde
  aff.balance = balance - amount;
  DB.saveAffiliate(currentAffId, aff);
  DB.addWithdrawal(w);

  document.getElementById('withdraw-form-area').classList.add('hidden');
  document.getElementById('withdraw-success').classList.remove('hidden');
  renderMyWithdrawals();
}

// ---------- Payment Info ----------
function loadPaymentInfo() {
  const aff = DB.getAffiliate(currentAffId);
  const info = (aff && aff.paymentInfo) || {};
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('pay-paypal', info.paypal);
  set('pay-firstname', info.firstname);
  set('pay-lastname', info.lastname);
  set('pay-iban', info.iban);
  set('pay-crypto', info.wallet);
  set('pay-crypto-network', info.cryptoNetwork);

  const balEl = document.getElementById('withdraw-balance');
  if (balEl && aff) balEl.textContent = (aff.balance || 0).toFixed(2) + ' €';
}

function savePaymentInfo() {
  const aff = DB.getAffiliate(currentAffId);
  if (!aff) return;
  aff.paymentInfo = {
    paypal: document.getElementById('pay-paypal').value.trim(),
    firstname: document.getElementById('pay-firstname').value.trim(),
    lastname: document.getElementById('pay-lastname').value.trim(),
    iban: document.getElementById('pay-iban').value.trim(),
    wallet: document.getElementById('pay-crypto').value.trim(),
    cryptoNetwork: document.getElementById('pay-crypto-network').value.trim()
  };
  DB.saveAffiliate(currentAffId, aff);
  document.getElementById('payment-saved-msg').classList.remove('hidden');
  setTimeout(() => document.getElementById('payment-saved-msg').classList.add('hidden'), 3000);
}

function copyMyLink() {
  const val = document.getElementById('aff-my-link').value;
  navigator.clipboard.writeText(val).then(() => alert('Lien copié !'));
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
  // Pré-remplir l'ID depuis l'URL
  const params = new URLSearchParams(window.location.search);
  const urlId = params.get('id');
  if (urlId) document.getElementById('aff-login-id').value = urlId;

  const savedId = sessionStorage.getItem(AFF_SESSION);
  if (savedId && DB.getAffiliate(savedId)) {
    currentAffId = savedId;
    showAffiliateDashboard();
    document.getElementById('mobile-header').classList.remove('hidden');
  }

  document.getElementById('aff-login-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') affLogin();
  });
});

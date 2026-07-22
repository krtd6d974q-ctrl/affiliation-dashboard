// ============================================================
// data.js — Couche de données partagée (localStorage)
// ============================================================

const DB = {
  // --- Clé admin ---
  ADMIN_PASS: 'admin_password',
  AFFILIATES: 'affiliates',
  LINKS: 'links',
  CLICKS: 'clicks',
  WITHDRAWALS: 'withdrawals',
  EARNINGS: 'earnings',

  // Taux par défaut : 5€ / 1000 clics
  DEFAULT_RATE: 5,

  // --- Helpers ---
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  // --- Admin password ---
  getAdminPassword() {
    return this.get(this.ADMIN_PASS) || 'admin123';
  },

  // --- Affiliates ---
  getAffiliates() { return this.get(this.AFFILIATES) || {}; },
  saveAffiliates(data) { this.set(this.AFFILIATES, data); },
  getAffiliate(id) { return this.getAffiliates()[id] || null; },
  saveAffiliate(id, data) {
    const all = this.getAffiliates();
    all[id] = data;
    this.saveAffiliates(all);
  },

  // --- Links ---
  getLinks() { return this.get(this.LINKS) || {}; },
  saveLinks(data) { this.set(this.LINKS, data); },
  getLink(id) { return this.getLinks()[id] || null; },
  saveLink(id, data) {
    const all = this.getLinks();
    all[id] = data;
    this.saveLinks(all);
  },

  // --- Clicks ---
  getClicks() { return this.get(this.CLICKS) || []; },
  addClick(click) {
    const all = this.getClicks();
    all.unshift(click); // plus récent en premier
    if (all.length > 5000) all.pop(); // limite mémoire
    this.set(this.CLICKS, all);
  },
  getClicksForLink(linkId) {
    return this.getClicks().filter(c => c.linkId === linkId);
  },
  getClicksForAffiliate(affId) {
    return this.getClicks().filter(c => c.affId === affId);
  },

  // --- Withdrawals ---
  getWithdrawals() { return this.get(this.WITHDRAWALS) || []; },
  addWithdrawal(w) {
    const all = this.getWithdrawals();
    all.unshift(w);
    this.set(this.WITHDRAWALS, all);
  },
  updateWithdrawal(id, changes) {
    const all = this.getWithdrawals();
    const idx = all.findIndex(w => w.id === id);
    if (idx !== -1) { all[idx] = { ...all[idx], ...changes }; this.set(this.WITHDRAWALS, all); }
  },
  getWithdrawalsForAffiliate(affId) {
    return this.getWithdrawals().filter(w => w.affId === affId);
  },

  // --- Earnings log ---
  getEarnings() { return this.get(this.EARNINGS) || []; },
  addEarning(e) {
    const all = this.getEarnings();
    all.unshift(e);
    this.set(this.EARNINGS, all);
  },
  getEarningsForAffiliate(affId) {
    return this.getEarnings().filter(e => e.affId === affId);
  },

  // --- Génération d'ID unique ---
  generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  },

  // --- Détection plateforme ---
  detectPlatform() {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'iOS';
    if (/Android/.test(ua)) return 'Android';
    return 'PC';
  },

  // --- Calcul revenus depuis clics ---
  computeEarned(clicks, rate) {
    return Math.floor(clicks / 1000) * (rate || this.DEFAULT_RATE);
  },

  // --- Formatage date ---
  formatDate(ts) {
    return new Date(ts).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
};

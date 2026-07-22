// ============================================================
// data.js — Couche de données (API serveur → fichiers JSON)
// ============================================================

const DB = {
  // Cache local pour éviter trop de requêtes
  _cache: {},

  // ── Requête synchrone vers l'API ──
  // On utilise XMLHttpRequest synchrone pour garder le code
  // appelant simple (pas de async/await partout dans les pages).
  _get(key) {
    if (this._cache[key] !== undefined) return this._cache[key];
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/' + key, false); // synchrone
    xhr.send();
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText);
      this._cache[key] = data;
      return data;
    }
    return null;
  },

  _set(key, value) {
    this._cache[key] = value;
    // Écriture asynchrone — pas besoin d'attendre la réponse
    fetch('/api/' + key, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    }).catch(() => {
      console.error('[DB] Impossible d\'écrire ' + key);
    });
  },

  // Vide le cache pour forcer une relecture depuis le serveur
  invalidate(key) {
    if (key) delete this._cache[key];
    else this._cache = {};
  },

  // ── Admin password ──
  getAdminPassword() {
    const cfg = this._get('config');
    return (cfg && cfg.adminPassword) ? cfg.adminPassword : 'Tiimeeo87';
  },

  // ── Affiliates ──
  getAffiliates()       { return this._get('affiliates') || {}; },
  saveAffiliates(data)  { this._set('affiliates', data); },
  getAffiliate(id)      { return this.getAffiliates()[id] || null; },
  saveAffiliate(id, data) {
    const all = this.getAffiliates();
    all[id] = data;
    this.saveAffiliates(all);
  },

  // ── Links ──
  getLinks()            { return this._get('links') || {}; },
  saveLinks(data)       { this._set('links', data); },
  getLink(id)           { return this.getLinks()[id] || null; },
  saveLink(id, data) {
    const all = this.getLinks();
    all[id] = data;
    this.saveLinks(all);
  },

  // ── Clicks ──
  getClicks()           { return this._get('clicks') || []; },
  addClick(click) {
    const all = this.getClicks();
    all.unshift(click);
    if (all.length > 5000) all.pop();
    this._set('clicks', all);
  },
  getClicksForLink(linkId)      { return this.getClicks().filter(c => c.linkId === linkId); },
  getClicksForAffiliate(affId)  { return this.getClicks().filter(c => c.affId === affId); },

  // ── Withdrawals ──
  getWithdrawals()      { return this._get('withdrawals') || []; },
  addWithdrawal(w) {
    const all = this.getWithdrawals();
    all.unshift(w);
    this._set('withdrawals', all);
  },
  updateWithdrawal(id, changes) {
    const all = this.getWithdrawals();
    const idx = all.findIndex(w => w.id === id);
    if (idx !== -1) { all[idx] = { ...all[idx], ...changes }; this._set('withdrawals', all); }
  },
  getWithdrawalsForAffiliate(affId) {
    return this.getWithdrawals().filter(w => w.affId === affId);
  },

  // ── Earnings ──
  getEarnings()         { return this._get('earnings') || []; },
  addEarning(e) {
    const all = this.getEarnings();
    all.unshift(e);
    this._set('earnings', all);
  },
  getEarningsForAffiliate(affId) {
    return this.getEarnings().filter(e => e.affId === affId);
  },

  // ── Utilitaires ──
  generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  },

  detectPlatform() {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'iOS';
    if (/Android/.test(ua)) return 'Android';
    return 'PC';
  },

  computeEarned(clicks, rate) {
    return Math.floor(clicks / 1000) * (rate || 5);
  },

  formatDate(ts) {
    return new Date(ts).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
};

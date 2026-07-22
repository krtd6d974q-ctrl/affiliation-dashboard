// ============================================================
// data.js — Stockage localStorage (fonctionne partout)
// ============================================================

const DB = {
  ADMIN_PASS:  'crush_admin_pass',
  AFFILIATES:  'crush_affiliates',
  LINKS:       'crush_links',
  CLICKS:      'crush_clicks',
  WITHDRAWALS: 'crush_withdrawals',
  EARNINGS:    'crush_earnings',

  DEFAULT_RATE: 5,

  _get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  _set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  // ── Admin ──
  getAdminPassword() { return this._get(this.ADMIN_PASS) || 'Tiimeeo87'; },

  // ── Affiliates ──
  getAffiliates()         { return this._get(this.AFFILIATES) || {}; },
  saveAffiliates(data)    { this._set(this.AFFILIATES, data); },
  getAffiliate(id)        { return this.getAffiliates()[id] || null; },
  saveAffiliate(id, data) {
    const all = this.getAffiliates();
    all[id] = data;
    this.saveAffiliates(all);
  },

  // ── Links ──
  getLinks()            { return this._get(this.LINKS) || {}; },
  saveLinks(data)       { this._set(this.LINKS, data); },
  getLink(id)           { return this.getLinks()[id] || null; },
  saveLink(id, data)    {
    const all = this.getLinks();
    all[id] = data;
    this.saveLinks(all);
  },

  // ── Clicks ──
  getClicks()           { return this._get(this.CLICKS) || []; },
  addClick(click) {
    const all = this.getClicks();
    all.unshift(click);
    if (all.length > 5000) all.pop();
    this._set(this.CLICKS, all);
  },
  getClicksForLink(linkId)     { return this.getClicks().filter(c => c.linkId === linkId); },
  getClicksForAffiliate(affId) { return this.getClicks().filter(c => c.affId === affId); },

  // ── Withdrawals ──
  getWithdrawals()      { return this._get(this.WITHDRAWALS) || []; },
  addWithdrawal(w) {
    const all = this.getWithdrawals();
    all.unshift(w);
    this._set(this.WITHDRAWALS, all);
  },
  updateWithdrawal(id, changes) {
    const all = this.getWithdrawals();
    const idx = all.findIndex(w => w.id === id);
    if (idx !== -1) { all[idx] = { ...all[idx], ...changes }; this._set(this.WITHDRAWALS, all); }
  },
  getWithdrawalsForAffiliate(affId) {
    return this.getWithdrawals().filter(w => w.affId === affId);
  },

  // ── Earnings ──
  getEarnings()         { return this._get(this.EARNINGS) || []; },
  addEarning(e) {
    const all = this.getEarnings();
    all.unshift(e);
    this._set(this.EARNINGS, all);
  },
  getEarningsForAffiliate(affId) {
    return this.getEarnings().filter(e => e.affId === affId);
  },

  // ── Export toutes les données en JSON ──
  exportAll() {
    const data = {
      affiliates:  this.getAffiliates(),
      links:       this.getLinks(),
      clicks:      this.getClicks(),
      withdrawals: this.getWithdrawals(),
      earnings:    this.getEarnings(),
      config:      { adminPassword: this.getAdminPassword() },
      exportedAt:  new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'crush-affi-backup-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  // ── Import depuis un fichier JSON ──
  importAll(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.affiliates)  this._set(this.AFFILIATES,  data.affiliates);
          if (data.links)       this._set(this.LINKS,       data.links);
          if (data.clicks)      this._set(this.CLICKS,      data.clicks);
          if (data.withdrawals) this._set(this.WITHDRAWALS, data.withdrawals);
          if (data.earnings)    this._set(this.EARNINGS,    data.earnings);
          if (data.config?.adminPassword) this._set(this.ADMIN_PASS, data.config.adminPassword);
          resolve();
        } catch { reject(new Error('Fichier invalide')); }
      };
      reader.readAsText(file);
    });
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
    // Calcul continu : chaque clic compte proportionnellement
    return (clicks / 1000) * (rate || this.DEFAULT_RATE);
  },
  formatDate(ts) {
    return new Date(ts).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
};

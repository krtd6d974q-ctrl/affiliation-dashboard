// ============================================================
// data.js — Supabase comme base de données
// Toutes les données sont persistées dans Supabase
// ============================================================

const SUPABASE_URL = 'https://titrqeounaoxpjgtvcy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JJ1J7KDX-npk66ZIB2AiWw_cFc5EXx8';

const DB = {
  DEFAULT_RATE: 5,
  _cache: {},

  // ── Requête Supabase REST ──
  async _req(table, method, body, params) {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    if (params) url += '?' + params;
    const res = await fetch(url, {
      method,
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type':  'application/json',
        'Prefer':        method === 'POST' ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[DB] ${method} ${table} failed:`, err);
      return null;
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },

  // ── Lecture d'une table (retourne un objet {id: data} ou tableau) ──
  async _getAll(table) {
    if (this._cache[table] !== undefined) return this._cache[table];
    const rows = await this._req(table, 'GET', null, 'select=id,data');
    if (!rows) return table === 'clicks' || table === 'withdrawals' || table === 'earnings' ? [] : {};
    let result;
    if (table === 'clicks' || table === 'withdrawals' || table === 'earnings') {
      result = rows.map(r => ({ id: r.id, ...r.data }));
    } else {
      result = {};
      rows.forEach(r => { result[r.id] = { id: r.id, ...r.data }; });
    }
    this._cache[table] = result;
    return result;
  },

  // ── Écriture d'une ligne ──
  async _upsert(table, id, data) {
    // Met à jour le cache immédiatement
    if (table === 'clicks' || table === 'withdrawals' || table === 'earnings') {
      if (!this._cache[table]) this._cache[table] = [];
      const idx = this._cache[table].findIndex(r => r.id === id);
      if (idx >= 0) this._cache[table][idx] = { id, ...data };
      else this._cache[table].unshift({ id, ...data });
    } else {
      if (!this._cache[table]) this._cache[table] = {};
      this._cache[table][id] = { id, ...data };
    }
    // Sauvegarde en base
    await this._req(table, 'POST', { id, data });
  },

  // ── Suppression ──
  async _delete(table, id) {
    if (this._cache[table]) {
      if (Array.isArray(this._cache[table])) {
        this._cache[table] = this._cache[table].filter(r => r.id !== id);
      } else {
        delete this._cache[table][id];
      }
    }
    await this._req(table, 'DELETE', null, `id=eq.${id}`);
  },

  invalidate(table) {
    if (table) delete this._cache[table];
    else this._cache = {};
  },

  // ── Admin password ──
  async getAdminPassword() {
    const rows = await this._req('config', 'GET', null, 'key=eq.adminPassword&select=value');
    return rows && rows[0] ? rows[0].value : 'Tiimeeo87';
  },

  // ── Affiliates ──
  async getAffiliates()       { return await this._getAll('affiliates'); },
  async getAffiliate(id)      { const all = await this.getAffiliates(); return all[id] || null; },
  async saveAffiliate(id, data) { await this._upsert('affiliates', id, data); },
  async saveAffiliates(obj) {
    for (const [id, data] of Object.entries(obj)) {
      await this._upsert('affiliates', id, data);
    }
  },
  async deleteAffiliate(id) { await this._delete('affiliates', id); },

  // ── Links ──
  async getLinks()           { return await this._getAll('links'); },
  async getLink(id)          { const all = await this.getLinks(); return all[id] || null; },
  async saveLink(id, data)   { await this._upsert('links', id, data); },
  async saveLinks(obj) {
    // Recalcule ce qui doit être supprimé vs upsert
    const current = await this.getLinks();
    for (const id of Object.keys(current)) {
      if (!obj[id]) await this._delete('links', id);
    }
    for (const [id, data] of Object.entries(obj)) {
      await this._upsert('links', id, data);
    }
  },

  // ── Clicks ──
  async getClicks()          { return await this._getAll('clicks'); },
  async addClick(click) {
    await this._upsert('clicks', click.id, click);
  },
  async getClicksForLink(linkId)     { const all = await this.getClicks(); return all.filter(c => c.linkId === linkId); },
  async getClicksForAffiliate(affId) { const all = await this.getClicks(); return all.filter(c => c.affId === affId); },

  // ── Withdrawals ──
  async getWithdrawals()     { return await this._getAll('withdrawals'); },
  async addWithdrawal(w)     { await this._upsert('withdrawals', w.id, w); },
  async updateWithdrawal(id, changes) {
    const all = await this.getWithdrawals();
    const w   = all.find(x => x.id === id);
    if (w) await this._upsert('withdrawals', id, { ...w, ...changes });
  },
  async getWithdrawalsForAffiliate(affId) {
    const all = await this.getWithdrawals();
    return all.filter(w => w.affId === affId);
  },

  // ── Earnings ──
  async getEarnings()        { return await this._getAll('earnings'); },
  async addEarning(e)        { await this._upsert('earnings', e.id, e); },
  async getEarningsForAffiliate(affId) {
    const all = await this.getEarnings();
    return all.filter(e => e.affId === affId);
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
    return (clicks / 1000) * (rate || this.DEFAULT_RATE);
  },
  formatDate(ts) {
    return new Date(ts).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
};

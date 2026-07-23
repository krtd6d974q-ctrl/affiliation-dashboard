// ============================================================
// data.js — Supabase comme base de données
// Toutes les données sont persistées dans Supabase
// ============================================================

const SUPABASE_URL = 'https://titrqeounaoxpjgtvvcy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdHJxZW91bmFveHBqZ3R2dmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3NTM1NTksImV4cCI6MjEwMDMyOTU1OX0.ilPDZT79YmIZBFKpayGmHpr1CXtlKBjT9pv9Ryxi0VM';

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
      console.error(`[DB] ${method} ${table} ${res.status}:`, err);
      throw new Error(`Supabase ${res.status}: ${err}`);
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

  // ── Realtime subscription via Supabase WebSocket ──
  // callback(table, event, row) — event: INSERT | UPDATE | DELETE
  subscribe(tables, callback) {
    const wsUrl = SUPABASE_URL.replace('https://', 'wss://') + '/realtime/v1/websocket?apikey=' + SUPABASE_KEY + '&vsn=1.0.0';
    const ws = new WebSocket(wsUrl);
    let heartbeat;

    ws.onopen = () => {
      // Rejoindre un channel par table
      tables.forEach(table => {
        ws.send(JSON.stringify({
          topic: `realtime:public:${table}`,
          event: 'phx_join',
          payload: {},
          ref: table,
        }));
      });
      // Heartbeat toutes les 25s pour garder la connexion vivante
      heartbeat = setInterval(() => {
        ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: null }));
      }, 25000);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.event === 'phx_reply' || msg.event === 'heartbeat') return;
        if (msg.payload?.type) {
          const table = msg.topic.replace('realtime:public:', '');
          const row   = msg.payload.record || msg.payload.old_record || {};
          // Invalide le cache pour forcer une relecture
          if (this._cache[table] !== undefined) delete this._cache[table];
          callback(table, msg.payload.type, row);
        }
      } catch {}
    };

    ws.onclose = () => {
      clearInterval(heartbeat);
      // Reconnexion automatique après 3s
      setTimeout(() => this.subscribe(tables, callback), 3000);
    };

    ws.onerror = () => ws.close();

    return ws;
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

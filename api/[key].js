// ============================================================
// api/[key].js — Route dynamique Vercel KV
// GET  /api/:key  → lit la valeur
// POST /api/:key  → écrit la valeur
// ============================================================

import { kv } from '@vercel/kv';

const ALLOWED_KEYS = ['affiliates', 'links', 'clicks', 'withdrawals', 'earnings', 'config'];

const DEFAULTS = {
  affiliates:  {},
  links:       {},
  clicks:      [],
  withdrawals: [],
  earnings:    [],
  config:      { adminPassword: 'Tiimeeo87' },
};

export default async function handler(req, res) {
  // CORS — autorise le front à appeler l'API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { key } = req.query;

  if (!ALLOWED_KEYS.includes(key)) {
    return res.status(404).json({ error: 'Unknown key' });
  }

  if (req.method === 'GET') {
    const data = await kv.get(key);
    return res.json(data !== null ? data : DEFAULTS[key]);
  }

  if (req.method === 'POST') {
    await kv.set(key, req.body);
    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}

// ============================================================
// server.js — Serveur local (remplace Vercel KV par fichiers)
// Lance avec : node server.js  ou  START.bat
// Accès :      http://localhost:3000
// ============================================================

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = 3000;
const DATA = path.join(__dirname, 'data');

if (!fs.existsSync(DATA)) fs.mkdirSync(DATA);

const FILES = {
  affiliates:  'affiliates.json',
  links:       'links.json',
  clicks:      'clicks.json',
  withdrawals: 'withdrawals.json',
  earnings:    'earnings.json',
  config:      'config.json',
};

const DEFAULTS = {
  affiliates:  {},
  links:       {},
  clicks:      [],
  withdrawals: [],
  earnings:    [],
  config:      { adminPassword: 'Tiimeeo87' },
};

function read(key) {
  const file = path.join(DATA, FILES[key]);
  if (!fs.existsSync(file)) return DEFAULTS[key];
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return DEFAULTS[key]; }
}

function write(key, data) {
  const file = path.join(DATA, FILES[key]);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

app.get('/api/:key', (req, res) => {
  const { key } = req.params;
  if (!FILES[key]) return res.status(404).json({ error: 'Unknown key' });
  res.json(read(key));
});

app.post('/api/:key', (req, res) => {
  const { key } = req.params;
  if (!FILES[key]) return res.status(404).json({ error: 'Unknown key' });
  write(key, req.body);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`\n✅  Crush Affi → http://localhost:${PORT}`);
  console.log(`   Données : ${DATA}\n`);
});

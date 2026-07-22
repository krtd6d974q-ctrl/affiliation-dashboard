// ============================================================
// api/[key].js — Vercel serverless
// Lit et écrit les fichiers JSON du repo GitHub directement
// Variables d'env requises sur Vercel :
//   GITHUB_TOKEN  → token GitHub avec accès "repo"
//   GITHUB_OWNER  → ton username GitHub  (ex: krtd6d974q-ctrl)
//   GITHUB_REPO   → nom du repo          (ex: affiliation-dashboard)
//   GITHUB_BRANCH → branche              (ex: main)
// ============================================================

const ALLOWED = ['affiliates', 'links', 'clicks', 'withdrawals', 'earnings', 'config'];

const DEFAULTS = {
  affiliates:  {},
  links:       {},
  clicks:      [],
  withdrawals: [],
  earnings:    [],
  config:      { adminPassword: 'Tiimeeo87' },
};

function ghHeaders() {
  return {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept':        'application/vnd.github+json',
    'Content-Type':  'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function fileUrl(key) {
  const owner  = process.env.GITHUB_OWNER;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  return `https://api.github.com/repos/${owner}/${repo}/contents/data/${key}.json?ref=${branch}`;
}

async function readFile(key) {
  const res = await fetch(fileUrl(key), { headers: ghHeaders() });
  if (!res.ok) return { data: DEFAULTS[key], sha: null };
  const json = await res.json();
  const content = Buffer.from(json.content, 'base64').toString('utf8');
  return { data: JSON.parse(content), sha: json.sha };
}

async function writeFile(key, data, sha) {
  const owner  = process.env.GITHUB_OWNER;
  const repo   = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  const url    = `https://api.github.com/repos/${owner}/${repo}/contents/data/${key}.json`;

  const body = {
    message: `data: update ${key}`,
    content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
    branch,
    ...(sha ? { sha } : {}),
  };

  const res = await fetch(url, {
    method:  'PUT',
    headers: ghHeaders(),
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub write failed: ${err}`);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { key } = req.query;
  if (!ALLOWED.includes(key)) return res.status(404).json({ error: 'Unknown key' });

  if (req.method === 'GET') {
    const { data } = await readFile(key);
    return res.json(data);
  }

  if (req.method === 'POST') {
    const { sha } = await readFile(key);   // besoin du SHA pour mettre à jour
    await writeFile(key, req.body, sha);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

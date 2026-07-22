// ============================================================
// api/r/[slug].js — Redirection par slug affilié
// Ex: monsite.com/noam → track le clic puis redirige
// ============================================================
//
// ⚠️  Sur Vercel les données sont dans localStorage (côté client).
//     Cette route ne peut pas y accéder.
//     La redirection propre par slug se fait côté client via
//     la page /r.html qui lit le localStorage et redirige.
//     Cette route sert juste à rediriger vers /r.html?slug=noam
// ============================================================

export default function handler(req, res) {
  const { slug } = req.query;
  res.setHeader('Cache-Control', 'no-store');
  res.redirect(302, `/r.html?s=${encodeURIComponent(slug)}`);
}

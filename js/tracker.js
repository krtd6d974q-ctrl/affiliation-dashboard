// ============================================================
// tracker.js — Enregistre le clic et redirige (async Supabase)
// ============================================================

(async function () {
  const params = new URLSearchParams(window.location.search);
  const linkId = params.get('lid');
  const FALLBACK = 'https://apps.apple.com/us/app/crush-assistant-drague/id6783893349';

  if (!linkId) { location.replace(FALLBACK); return; }

  const link = await DB.getLink(linkId);
  if (!link) { location.replace(FALLBACK); return; }

  // Enregistre le clic
  const click = {
    id:       DB.generateId(),
    linkId,
    affId:    link.affId,
    platform: DB.detectPlatform(),
    ts:       Date.now(),
    ua:       navigator.userAgent.substring(0, 100),
  };
  await DB.addClick(click);

  // Met à jour compteur lien
  link.clicks = (link.clicks || 0) + 1;
  await DB.saveLink(linkId, link);

  // Met à jour affilié
  const aff = await DB.getAffiliate(link.affId);
  if (aff) {
    aff.clicks = (aff.clicks || 0) + 1;
    await DB.saveAffiliate(link.affId, aff);
  }

  location.replace(link.target || FALLBACK);
})();

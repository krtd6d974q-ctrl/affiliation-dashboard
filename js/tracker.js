// ============================================================
// tracker.js — Enregistre le clic et redirige
// ============================================================

(function () {
  const params = new URLSearchParams(window.location.search);
  const linkId = params.get('lid');

  if (!linkId) {
    document.querySelector('p').textContent = 'Lien invalide.';
    return;
  }

  const link = DB.getLink(linkId);

  if (!link) {
    document.querySelector('p').textContent = 'Ce lien n\'existe pas.';
    return;
  }

  // Enregistrement du clic
  const click = {
    id: DB.generateId(),
    linkId: linkId,
    affId: link.affId,
    platform: DB.detectPlatform(),
    ts: Date.now(),
    ua: navigator.userAgent.substring(0, 100)
  };
  DB.addClick(click);

  // Mise à jour compteur du lien
  link.clicks = (link.clicks || 0) + 1;
  DB.saveLink(linkId, link);

  // Mise à jour compteur affilié + calcul revenus
  const aff = DB.getAffiliate(link.affId);
  if (aff) {
    aff.clicks = (aff.clicks || 0) + 1;
    const prevEarned = aff.earned || 0;
    const newEarned = DB.computeEarned(aff.clicks, link.rate);

    // Si un nouveau palier est atteint → enregistrer le gain
    if (newEarned > prevEarned) {
      const gain = newEarned - prevEarned;
      DB.addEarning({
        id: DB.generateId(),
        affId: link.affId,
        linkId: linkId,
        amount: gain,
        clicks: aff.clicks,
        ts: Date.now()
      });
      aff.balance = (aff.balance || 0) + gain;
    }

    aff.earned = newEarned;
    DB.saveAffiliate(link.affId, aff);
  }

  // Redirection immédiate — rien ne s'affiche
  window.location.replace(link.target || 'https://apps.apple.com/us/app/crush-assistant-drague/id6783893349');
})();

'use strict';

/* ───────── Startup ───────── */
renderLegend();
{
  const h = decodeURIComponent(location.hash.slice(1));
  if (VIEWS.includes(h)) setView(h, { fromHash: true }); else renderPanel();
}
(async () => {
  const use = window.claude && typeof window.claude.use === 'function' ? n => window.claude.use(n) : null;
  const db = use ? await use('db').catch(() => null) : null;
  if (!db) {
    S.loaded = true; renderMeta();
    setStatus('Kartet kan ikke hentes her', 'Kartet ligger i sin egen database, som bare kan leses når siden er åpnet i Claude og du er logget inn.');
    renderPanel();
    return;
  }
  S.db = db;
  use('user').then(async u => { if (u) { try { S.writer = await u.can('data.write'); } catch (e) {} renderPanel(); if (S.view === 'register') renderRegister(); } }).catch(() => {});
  db.collection('nodes').limit(1000).onSnapshot(snap => ingest(snap.docs), err => {
    if (err && err.code === 'revoked') return;
    S.loaded = true; renderMeta();
    setStatus('Kartet kunne ikke hentes', 'Last siden på nytt om litt.');
  });
  db.doc('status/current').onSnapshot(snap => { S.status = snap.exists ? (snap.data() || null) : null; if (!S.sel) renderPanel(); }, () => {});
  db.doc('status/history').onSnapshot(snap => {
    const h = snap.exists ? (snap.data() || {}) : {};
    S.statusHistory = Array.isArray(h.versions) ? h.versions : [];
    if (!S.sel) renderPanel();
  }, () => {});
  db.doc('tours/main').onSnapshot(snap => { S.tour = snap.exists ? (snap.data() || null) : null; tourReady(); }, () => {});
  db.collection('notes').limit(1000).onSnapshot(snap => {
    S.notes = snap.docs.filter(d => d.exists).map(d => ({ id: d.id, ...(d.data() || {}) }));
    if (S.sel) renderPanel();
  }, () => {});
})();

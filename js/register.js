'use strict';

/* ───────── Register ───────── */
const R = { q: '', group: 'region', types: new Set(Object.keys(TYPE)), own: false };
function renderRegister() {
  const V = $('#v-register');
  if (!loaded()) { V.innerHTML = `<div class="page"><h2>Register</h2><p class="lead">${S.loaded ? 'Kartet er tomt ennå.' : 'Henter kartet …'}</p></div>`; return; }
  const q = R.q.toLowerCase();
  const items = [...S.nodes.values()].filter(n => R.types.has(n.type) && (!R.own || n.own) && (!q || (n.label + ' ' + n.short + ' ' + n.text).toLowerCase().includes(q)));
  const keys = R.group === 'region' ? REGION_ORDER : TYPE_ORDER;
  const label = k => R.group === 'region' ? REGION[k].label : TYPE_PL[k];
  const groupsHTML = keys.map(k => {
    const g = items.filter(n => (R.group === 'region' ? n.region : n.type) === k)
      .sort((a, b) => (TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)) || a.label.localeCompare(b.label, 'nb'));
    if (!g.length) return '';
    return `<div class="group"><h3>${esc(label(k))}</h3><span>${g.length}</span></div><div class="reglist">${g.map(n => `
      <button type="button" class="regitem" data-go="${esc(n.id)}">${miniSym(n)}<span class="nm">${esc(n.label)}</span>
      ${n.hope.length ? `<span class="hdots" aria-label="Håpsnivå ${n.hope.join(', ')}">${LEVELS.map(h => `<i class="${n.hope.includes(h) ? 'on' + h : ''}"></i>`).join('')}</span>` : ''}
      ${n.own ? '<span class="sty">Egen</span>' : n.strength ? `<span class="sty">${STRENGTH[n.strength]}</span>` : ''}</button>`).join('')}</div>`;
  }).join('');
  const typeChips = TYPE_ORDER.map(t => `<button type="button" class="chip" data-rtype="${t}" aria-pressed="${R.types.has(t)}">${TYPE_PL[t]}</button>`).join('');
  const canAdd = S.db && S.writer !== false;
  V.innerHTML = `<div class="page">
    <h2>Register</h2>
    <p class="lead">Alle ${S.nodes.size} stedene i kartet. Søk, filtrer og trykk for å lese.</p>
    <div class="toolbar">
      <input class="inp" id="reg-q" type="search" placeholder="Søk i navn og tekst" value="${esc(R.q)}" autocomplete="off">
      <button type="button" class="chip" data-rgroup="region" aria-pressed="${R.group === 'region'}">Etter område</button>
      <button type="button" class="chip" data-rgroup="type" aria-pressed="${R.group === 'type'}">Etter type</button>
    </div>
    <div class="toolbar">${typeChips}<span class="sep" aria-hidden="true"></span><button type="button" class="chip" data-rown aria-pressed="${R.own}">Bare egne slutninger</button></div>
    ${canAdd ? `<details style="margin:6px 0 4px"><summary class="sect-h" style="cursor:pointer">Legg til et nytt sted</summary>${newNodeForm()}</details>` : ''}
    ${groupsHTML || '<p class="lead">Ingen treff.</p>'}
  </div>`;
  const inp = $('#reg-q');
  inp.addEventListener('input', () => { R.q = inp.value; const pos = inp.selectionStart; renderRegister(); const i2 = $('#reg-q'); i2.focus(); try { i2.setSelectionRange(pos, pos); } catch (e) {} });
}
function newNodeForm() {
  return `<form class="form" data-form="node" style="max-width:640px">
    <input class="inp" id="nn-label" name="label" placeholder="Navn" required>
    <div class="row">
      <select class="inp" id="nn-type" name="type">${TYPE_ORDER.map(t => `<option value="${t}"${t === 'position' ? ' selected' : ''}>${TYPE[t]}</option>`).join('')}</select>
      <select class="inp" id="nn-region" name="region">${REGION_ORDER.map(r => `<option value="${r}">${REGION[r].label}</option>`).join('')}</select>
      <select class="inp" id="nn-strength" name="strength"><option value="">Styrke</option>${Object.keys(STRENGTH).map(s => `<option value="${s}">${STRENGTH[s]}</option>`).join('')}</select>
    </div>
    <textarea class="inp" id="nn-text" name="text" placeholder="Hva er det, med egne ord?"></textarea>
    <div class="row" style="align-items:center">${[1, 2, 3, 4, 5, 6].map(h => `<label style="flex:0 0 auto;display:inline-flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" id="nn-h${h}" name="h${h}"> Håp ${h}</label>`).join('')}</div>
    <button class="btn" type="submit">Legg til i kartet</button><span class="formmsg" data-msg></span>
  </form>`;
}
$('#v-register').addEventListener('click', ev => {
  const go = ev.target.closest('[data-go]'); if (go) { select(go.dataset.go); return; }
  const g = ev.target.closest('[data-rgroup]'); if (g) { R.group = g.dataset.rgroup; renderRegister(); return; }
  if (ev.target.closest('[data-rown]')) { R.own = !R.own; renderRegister(); return; }
  const t = ev.target.closest('[data-rtype]');
  if (t) { const k = t.dataset.rtype; if (R.types.has(k) && R.types.size > 1) R.types.delete(k); else R.types.add(k); renderRegister(); }
});
$('#v-register').addEventListener('submit', async ev => {
  ev.preventDefault();
  const f = ev.target; if (f.dataset.form !== 'node' || !S.db) return;
  const msg = f.querySelector('[data-msg]'), btn = f.querySelector('button[type=submit]');
  const label = f.label.value.trim(); if (!label) return;
  // a new id is an ASCII slug of the name; ids never change once other places link to them
  let base = label.toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'place';
  if (['map', 'register', 'patterns', 'export', 'settings', 'sidebar', 'customize', 'upgrade', 'downloads'].includes(base) || base.startsWith('comment-')) base = 'place-' + base;
  let id = base, i = 2; while (S.nodes.has(id) || S.retired.has(id)) id = base + '-' + i++;
  const hope = [1, 2, 3, 4, 5, 6].filter(h => f['h' + h].checked);
  const doc = { type: f.type.value, region: f.region.value, label, text: f.text.value.trim(), added: new Date().toISOString().slice(0, 10), conversation: 'map', links: [] };
  if (f.strength.value) doc.strength = f.strength.value;
  if (hope.length) doc.hope = hope;
  btn.disabled = true;
  try {
    await S.db.doc('nodes/' + id).set(doc);
    msg.textContent = 'Lagt til.'; msg.classList.remove('err');
    setTimeout(() => select(id), 400);
  } catch (err) { msg.textContent = writeError(err); msg.classList.add('err'); if (err && err.code === 'invalid_argument') S.writer = false; }
  btn.disabled = false;
});

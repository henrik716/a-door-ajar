'use strict';

/* ───────── Export ───────── */
const NS = 'urn:x-alfred-atlas:';
const CLS = { question: 'Question', position: 'Position', thinker: 'Thinker', finding: 'Finding', word: 'Word', image: 'Image', insight: 'Insight' };
const lit = s => JSON.stringify(String(s)) + '@' + LANG;
// a text field as RDF literals, one per language when it has several
const lits = v => v && typeof v === 'object' ? Object.entries(v).map(([l, t]) => JSON.stringify(String(t)) + '@' + l).join(', ') : lit(v);
// the same as a JSON-LD language map
const lmap = v => v && typeof v === 'object' ? v : { [LANG]: String(v ?? '') };
function toTurtle() {
  const L = [`@prefix v: <${NS}schema#> .`, `@prefix n: <${NS}node:> .`, '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .', '@prefix dct: <http://purl.org/dc/terms/> .',
    '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .', '',
    '# Schema'];
  for (const [c, l] of Object.entries(CLS)) L.push(`v:${l} a rdfs:Class ; rdfs:label ${lit(TYPE[c])} .`);
  for (const [p, l] of Object.entries(PRED)) L.push(`v:${p} rdfs:label ${lit(l[0].toLowerCase())} .`);
  for (const [p, l] of Object.entries(DPRED)) L.push(`v:${p} rdfs:label ${lit(l[0].toLowerCase() + ' (utledet)')} .`);
  L.push('', '# Nodes');
  for (const n of S.nodes.values()) {
    const r = n.raw;
    const t = [`n:${n.id} a v:${CLS[n.type]}`, `  rdfs:label ${lits(r.label)}`];
    if (n.short) t.push(`  v:shortLabel ${lits(r.short)}`);
    if (n.text) t.push(`  rdfs:comment ${lits(r.text)}`);
    t.push(`  v:region v:${n.region}`);
    if (n.strength) t.push(`  v:strength v:${n.strength}`);
    if (n.own) t.push('  v:ownConclusion true');
    if (n.hope.length) t.push(`  v:hopeLevel ${n.hope.join(', ')}`);
    if (n.status) t.push(`  v:status v:${n.status}`);
    if (n.answer) t.push(`  v:answer ${lits(r.answer)}`);
    t.push(`  v:conversation v:${n.conversation}`);
    if (n.added) t.push(`  dct:created "${n.added}"^^xsd:date`);
    if (n.changes.length) {
      t.push(`  dct:modified "${n.changes[n.changes.length - 1].date}"^^xsd:date`);
      for (const c of n.changes) {
        const p = [`dct:date "${c.date}"^^xsd:date`];
        if (c.text) p.push(`rdfs:comment ${lits(c.text)}`);
        if (Array.isArray(c.fields) && c.fields.length) p.push(`v:changedField ${c.fields.map(f => JSON.stringify(f)).join(', ')}`);
        t.push(`  v:change [ ${p.join(' ; ')} ]`);
      }
    }
    for (const src of n.sources) if (src && src.title) t.push(`  dct:source ${src.url ? `<${src.url}>` : lits(src.title)}`);
    const out = new Map();
    for (const e of S.edges) if (e.s === n.id) { if (!out.has(e.p)) out.set(e.p, []); out.get(e.p).push(`n:${e.o}`); }
    for (const [p, os] of out) t.push(`  v:${p} ${os.join(', ')}`);
    L.push(t.join(' ;\n') + ' .', '');
    for (const e of S.edges) if (e.s === n.id && e.m) L.push(`# note: n:${e.s} v:${e.p} n:${e.o} — ${e.m}`);
  }
  // retired places keep their id and say what replaced them
  if (S.retired.size) L.push('# Retired');
  for (const [id, r] of S.retired) {
    const t = [`n:${id} v:retired "${r.date}"^^xsd:date`, `  rdfs:label ${lit(r.label)}`];
    if (r.text) t.push(`  rdfs:comment ${lits(r.text)}`);
    if (r.replacedBy) t.push(`  dct:isReplacedBy n:${r.replacedBy}`);
    L.push(t.join(' ;\n') + ' .', '');
  }
  L.push('# Derived by the rules (see SPARQL)');
  for (const d of S.derived) L.push(`n:${d.s} v:${d.p} n:${d.o} .`);
  return L.join('\n');
}
function toJSONLD() {
  const lang = id => ({ '@id': id, '@container': '@language' });
  const ctx = {
    v: NS + 'schema#', n: NS + 'node:', rdfs: 'http://www.w3.org/2000/01/rdf-schema#', dct: 'http://purl.org/dc/terms/',
    label: lang('rdfs:label'), text: lang('rdfs:comment'), shortLabel: lang('v:shortLabel'), answer: lang('v:answer'),
    hopeLevel: 'v:hopeLevel', ownConclusion: 'v:ownConclusion', sources: 'dct:source', notes: 'v:note',
    xsd: 'http://www.w3.org/2001/XMLSchema#', created: { '@id': 'dct:created', '@type': 'xsd:date' }, modified: { '@id': 'dct:modified', '@type': 'xsd:date' },
    changes: { '@id': 'v:change', '@container': '@list' }, retired: { '@id': 'v:retired', '@type': 'xsd:date' }, replacedBy: { '@id': 'dct:isReplacedBy', '@type': '@id' }, date: { '@id': 'dct:date', '@type': 'xsd:date' }, fields: 'v:changedField',
  };
  for (const p of [...Object.keys(PRED), ...Object.keys(DPRED), 'region', 'strength', 'status', 'conversation']) ctx[p] = { '@id': 'v:' + p, '@type': '@id' };
  const graph = [...S.nodes.values()].map(n => {
    const r = n.raw;
    const o = { '@id': 'n:' + n.id, '@type': 'v:' + CLS[n.type], label: lmap(r.label), text: lmap(r.text), region: 'v:' + n.region };
    if (n.strength) o.strength = 'v:' + n.strength;
    if (n.own) o.ownConclusion = true;
    if (n.hope.length) o.hopeLevel = n.hope;
    if (n.status) o.status = 'v:' + n.status;
    if (n.short) o.shortLabel = lmap(r.short);
    if (n.answer) o.answer = lmap(r.answer);
    o.conversation = 'v:' + n.conversation;
    if (n.added) o.created = n.added;
    if (n.changes.length) {
      o.modified = n.changes[n.changes.length - 1].date;
      o.changes = n.changes.map(c => {
        const x = { date: c.date };
        if (c.text) x.text = lmap(c.text);
        if (Array.isArray(c.fields) && c.fields.length) x.fields = c.fields;
        return x;
      });
    }
    const src = n.sources.filter(x => x && x.title).map(x => x.url || tx(x.title)); if (src.length) o.sources = src;
    for (const e of S.edges) if (e.s === n.id) (o[e.p] = o[e.p] || []).push('n:' + e.o);
    const nt = S.edges.filter(e => e.s === n.id && e.m).map(e => `v:${e.p} n:${e.o}: ${e.m}`); if (nt.length) o.notes = nt;
    for (const d of S.derived) {
      if (d.s === n.id) (o[d.p] = o[d.p] || []).push('n:' + d.o);
      else if (d.p === 'sharesPremiseWith' && d.o === n.id) (o[d.p] = o[d.p] || []).push('n:' + d.s);
    }
    return o;
  });
  for (const [id, r] of S.retired) {
    const o = { '@id': 'n:' + id, label: lmap(r.label), retired: r.date };
    if (r.text) o.text = lmap(r.text);
    if (r.replacedBy) o.replacedBy = 'n:' + r.replacedBy;
    graph.push(o);
  }
  return JSON.stringify({ '@context': ctx, '@graph': graph }, null, 2);
}
const SPARQL = `PREFIX v: <${NS}schema#>

# R1  B challenges A when A presupposes X and B contradicts X
CONSTRUCT { ?b v:challengesDerived ?a }
WHERE { ?a v:presupposes ?x . ?b v:contradicts ?x .
        FILTER(?a != ?b) FILTER NOT EXISTS { ?b v:contradicts ?a } }

# R2  B strengthens A when A presupposes X and B supports X,
#     unless B also contradicts another premise of A
CONSTRUCT { ?b v:strengthensDerived ?a }
WHERE { ?a v:presupposes ?x . ?b v:supports ?x .
        FILTER(?a != ?b) FILTER NOT EXISTS { ?b v:supports ?a }
        FILTER NOT EXISTS { ?b v:contradicts ?a }
        FILTER NOT EXISTS { ?a v:presupposes ?y . ?b v:contradicts ?y } }

# R3  A and B share a premise when both presuppose X
CONSTRUCT { ?a v:sharesPremiseWith ?b }
WHERE { ?a v:presupposes ?x . ?b v:presupposes ?x .
        FILTER(STR(?a) < STR(?b)) }
#     The relation is symmetric. In JSON-LD it is listed on both nodes.

# R4  P may dissolve question Q when Q uses a word that P challenges
CONSTRUCT { ?p v:mayDissolveDerived ?q }
WHERE { ?q a v:Question ; v:usesWord ?w . ?p v:challengesWord ?w .
        FILTER(?p != ?q) FILTER NOT EXISTS { ?p v:dissolves ?q } }

# R5  B qualifies A when A presupposes X and B qualifies X
CONSTRUCT { ?b v:qualifiesDerived ?a }
WHERE { ?a v:presupposes ?x . ?b v:qualifies ?x .
        FILTER(?a != ?b) FILTER NOT EXISTS { ?b v:qualifies ?a }
        FILTER NOT EXISTS { ?b v:contradicts ?a } }

# CONSTRUCT returns a set, so each derivation appears once even when several paths lead to it.`;
function renderExport() {
  const V = $('#v-export');
  if (!loaded()) { V.innerHTML = `<div class="page"><h2>Eksport</h2><p class="lead">${S.loaded ? 'Kartet er tomt ennå.' : 'Henter kartet …'}</p></div>`; return; }
  V.innerHTML = `<div class="page">
    <h2>Eksport</h2>
    <p class="lead">Kartet som lenkede data, til å leke med selv. Navnerommet er <span class="mono">${NS}</span>. Last Turtle inn i en triplestore og kjør reglene, så får du de samme utledede koblingene som kartet viser.</p>
    <div class="codehead"><h3>Turtle</h3><button type="button" class="btn ghost" data-copy="ttl">Kopier</button><span class="formmsg" data-cmsg="ttl"></span></div>
    <textarea class="code" id="code-ttl" readonly spellcheck="false" aria-label="Turtle"></textarea>
    <div class="codehead"><h3>JSON-LD</h3><button type="button" class="btn ghost" data-copy="jsonld">Kopier</button><span class="formmsg" data-cmsg="jsonld"></span></div>
    <textarea class="code" id="code-jsonld" readonly spellcheck="false" aria-label="JSON-LD"></textarea>
    <div class="codehead"><h3>Reglene som SPARQL</h3><button type="button" class="btn ghost" data-copy="sparql">Kopier</button><span class="formmsg" data-cmsg="sparql"></span></div>
    <textarea class="code" id="code-sparql" readonly spellcheck="false" aria-label="SPARQL" style="height:360px"></textarea>
  </div>`;
  $('#code-ttl').value = toTurtle();
  $('#code-jsonld').value = toJSONLD();
  $('#code-sparql').value = SPARQL;
}
$('#v-export').addEventListener('click', ev => {
  const b = ev.target.closest('[data-copy]'); if (!b) return;
  const ta = $('#code-' + b.dataset.copy), m = document.querySelector(`[data-cmsg="${b.dataset.copy}"]`);
  const sel = () => { ta.focus(); ta.select(); m.textContent = 'Markert. Kopier med tastaturet.'; };
  try {
    navigator.clipboard.writeText(ta.value).then(() => { m.textContent = 'Kopiert.'; }, sel);
  } catch (e) { sel(); }
});

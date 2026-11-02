// The schema in docs/model.md as code. Used by `npm run check` and by the
// local write server, which refuses to save anything that would not pass.

import { readFile } from 'node:fs/promises';

export const FILES = {
  nodes: new URL('../data/nodes.json', import.meta.url),
  status: new URL('../data/status.json', import.meta.url),
  tours: new URL('../data/tours.json', import.meta.url),
  // Henrik's working notes live outside data/: they are not part of the published map.
  notes: new URL('../work/notes.json', import.meta.url),
};

export const readData = async () => {
  const read = async u => JSON.parse(await readFile(u, 'utf8'));
  const [nodes, notes, status, tours] = await Promise.all([read(FILES.nodes), read(FILES.notes), read(FILES.status), read(FILES.tours)]);
  return { nodes, notes, status, tours };
};

// The files are written the way they were exported from claude.ai: one-space indent and a final newline.
export const serialize = v => JSON.stringify(v, null, 1) + '\n';

export const TYPES = ['question', 'position', 'finding', 'insight', 'word', 'image', 'thinker'];
export const REGIONS = ['core', 'words', 'east', 'blindspots', 'time', 'consciousness', 'limits', 'borderland', 'grief', 'dog', 'self'];
export const STRENGTHS = ['solid', 'supported', 'position', 'contested', 'image'];
export const STATUSES = ['frontier', 'planned'];
export const CONVERSATIONS = ['deepdive', 'alfred', 'map'];
export const RELS = ['supports', 'contradicts', 'presupposes', 'qualifies', 'dissolves', 'makesWellPosed', 'usesWord', 'challengesWord',
  'answers', 'partOf', 'leadsTo', 'exampleOf', 'behind', 'influenced', 'relatedTo'];
export const NODE_FIELDS = ['id', 'type', 'region', 'label', 'short', 'strength', 'hope', 'own', 'status', 'answer', 'text', 'sources', 'links', 'added', 'conversation', 'changes', 'retired'];
// The fields a change can be about. id, added and conversation never change, the log is not about
// itself, and retiring a place is recorded in retired.
export const CHANGEABLE = NODE_FIELDS.filter(k => !['id', 'added', 'conversation', 'changes', 'retired'].includes(k));
// For these short fields a change also keeps the value it had before, in from. null means it was not set.
export const SMALL = ['type', 'region', 'strength', 'hope', 'own', 'status'];
export const CHANGE_FIELDS = ['date', 'text', 'fields', 'from'];
export const RETIRED_FIELDS = ['date', 'text', 'replacedBy'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
export const NOTE_FIELDS = ['id', 'node', 'text', 'time'];
export const TOUR_FIELDS = ['id', 'title', 'updated', 'draft', 'intro', 'stages'];
export const STEP_FIELDS = ['node', 'also', 'text'];
const VIEWS = ['map', 'register', 'patterns', 'export'];

// a text field is a string, or a map of languages such as { "nb": "…", "en": "…" }
export const isText = v => typeof v === 'string' || (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0
  && Object.entries(v).every(([l, s]) => /^[a-z]{2,3}$/.test(l) && typeof s === 'string'));

// Returns a list of errors, empty when everything is valid.
export function validate({ nodes, notes, status, tours = [] }) {
  const errors = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);

  const ids = new Set();
  let prev = '';
  for (const n of nodes) {
    const w = n.id || '(no id)';
    if (typeof n.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n.id)) err(w, 'id must be lower-case ASCII with hyphens');
    if (VIEWS.includes(n.id)) err(w, 'id is taken by a view');
    if (ids.has(n.id)) err(w, 'duplicate id');
    if (n.id <= prev) err(w, `not sorted by id (after ${prev})`);
    ids.add(n.id); prev = n.id;
    for (const k of Object.keys(n)) if (!NODE_FIELDS.includes(k)) err(w, `unknown field ${k}`);
    if (!TYPES.includes(n.type)) err(w, `type ${n.type}`);
    if (!REGIONS.includes(n.region)) err(w, `region ${n.region}`);
    if (!isText(n.label)) err(w, 'label');
    if (!isText(n.text)) err(w, 'text');
    for (const f of ['short', 'answer']) if (n[f] !== undefined && !isText(n[f])) err(w, f);
    if (n.strength !== undefined && !STRENGTHS.includes(n.strength)) err(w, `strength ${n.strength}`);
    if (n.hope !== undefined && !(Array.isArray(n.hope) && n.hope.every(h => Number.isInteger(h) && h >= 1 && h <= 6))) err(w, 'hope must be levels 1 to 6');
    if (n.own !== undefined && n.own !== true) err(w, 'own is true or left out');
    if (n.status !== undefined && !STATUSES.includes(n.status)) err(w, `status ${n.status}`);
    if (!CONVERSATIONS.includes(n.conversation)) err(w, `conversation ${n.conversation}`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(n.added || '')) err(w, 'added must be YYYY-MM-DD');
    for (const s of n.sources || []) if (!isText(s.title) || (s.url !== undefined && typeof s.url !== 'string')) err(w, 'source needs a title, url is optional');
    if (!Array.isArray(n.links)) err(w, 'links must be a list');
    // changes: what moved in the place since it was added, oldest first. Only ever appended to.
    if (n.changes !== undefined) {
      if (!Array.isArray(n.changes) || !n.changes.length) err(w, 'changes must be a non-empty list, or left out');
      else {
        let last = n.added || '';
        n.changes.forEach((c, i) => {
          const wc = `${w} change ${i + 1}`;
          if (!c || typeof c !== 'object') { err(wc, 'must be an object'); return; }
          for (const k of Object.keys(c)) if (!CHANGE_FIELDS.includes(k)) err(wc, `unknown field ${k}`);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date || '')) err(wc, 'date must be YYYY-MM-DD');
          else if (c.date < last) err(wc, `date ${c.date} is before ${last}: oldest first, and not before added`);
          else last = c.date;
          if (c.text === undefined && c.fields === undefined) err(wc, 'needs text, fields or both');
          if (c.text !== undefined && !isText(c.text)) err(wc, 'text');
          if (c.fields !== undefined && !(Array.isArray(c.fields) && c.fields.length && c.fields.every(f => CHANGEABLE.includes(f))))
            err(wc, `fields must be a list of ${CHANGEABLE.join(', ')}`);
          if (c.from !== undefined) {
            if (!c.from || typeof c.from !== 'object' || Array.isArray(c.from)) err(wc, 'from must be an object');
            else for (const k of Object.keys(c.from)) {
              if (!SMALL.includes(k)) err(wc, `from.${k}: only ${SMALL.join(', ')} keep their earlier value`);
              else if (!(c.fields || []).includes(k)) err(wc, `from.${k} is not in fields`);
            }
          }
        });
        if (n.retired && n.retired.date && n.retired.date < n.changes[n.changes.length - 1].date) err(w, 'retired before its last change');
      }
    }
    // retired: the place is no longer part of the map, but stays in the file so its id and history are kept.
    if (n.retired !== undefined) {
      const r = n.retired;
      if (!r || typeof r !== 'object' || Array.isArray(r)) err(w, 'retired must be an object');
      else {
        for (const k of Object.keys(r)) if (!RETIRED_FIELDS.includes(k)) err(w, `retired: unknown field ${k}`);
        if (!DAY.test(r.date || '')) err(w, 'retired.date must be YYYY-MM-DD');
        else if (r.date < (n.added || '')) err(w, 'retired before it was added');
        if (!isText(r.text)) err(w, 'retired needs a text saying why');
      }
    }
  }
  const retired = new Set(nodes.filter(n => n.retired).map(n => n.id));
  for (const n of nodes) {
    const by = n.retired && n.retired.replacedBy;
    if (by !== undefined && by !== null && (!ids.has(by) || by === n.id)) err(n.id, `retired.replacedBy ${by} is not another place`);
  }
  for (const n of nodes) for (const l of Array.isArray(n.links) ? n.links : []) {
    if (!RELS.includes(l.rel)) err(n.id, `link rel ${l.rel}`);
    if (!ids.has(l.to)) err(n.id, `link to missing id ${l.to}`);
    else if (!n.retired && retired.has(l.to)) err(n.id, `link to retired place ${l.to}: point it to what replaced it`);
    if (l.to === n.id) err(n.id, 'link to itself');
    if (l.note !== undefined && !isText(l.note)) err(n.id, 'link note');
  }
  const noteIds = new Set();
  for (const x of notes) {
    const w = `note ${x.id}`;
    if (typeof x.id !== 'string' || !x.id) err(w, 'needs an id');
    if (noteIds.has(x.id)) err(w, 'duplicate id');
    noteIds.add(x.id);
    for (const k of Object.keys(x)) if (!NOTE_FIELDS.includes(k)) err(w, `unknown field ${k}`);
    if (!ids.has(x.node)) err(w, `on missing id ${x.node}`);
    if (!isText(x.text)) err(w, 'text');
    if (isNaN(new Date(x.time))) err(w, 'time must be an ISO date');
  }
  for (const [key, s] of Object.entries(status)) {
    if (key === 'history') continue;
    for (const p of s.points || []) {
      if (p.node && !ids.has(p.node)) err(`status.${key}`, `point on missing id ${p.node}`);
      else if (p.node && retired.has(p.node)) err(`status.${key}`, `point on retired place ${p.node}`);
    }
    for (const id of s.next || []) {
      if (!ids.has(id)) err(`status.${key}`, `next has missing id ${id}`);
      else if (retired.has(id)) err(`status.${key}`, `next has retired place ${id}`);
    }
  }
  // status.history.versions: earlier versions of "Hva kartet har funnet", oldest first, each kept
  // as it was, with the date it was replaced and why. Only appended to.
  if (status.history !== undefined) {
    const v = status.history && status.history.versions;
    if (!Array.isArray(v)) err('status.history', 'needs versions, a list');
    else {
      let last = '';
      v.forEach((x, i) => {
        const w = `status.history version ${i + 1}`;
        if (!x || typeof x !== 'object') { err(w, 'must be an object'); return; }
        if (!DAY.test(x.updated || '')) err(w, 'updated must be YYYY-MM-DD');
        if (!DAY.test(x.replaced || '')) err(w, 'replaced must be YYYY-MM-DD');
        else if (x.replaced < (x.updated || '') || x.replaced < last) err(w, 'replaced must be after updated and after the version before');
        else last = x.replaced;
        if (!isText(x.why)) err(w, 'needs why, a text');
        if (!Array.isArray(x.points)) err(w, 'needs points');
        for (const p of Array.isArray(x.points) ? x.points : []) if (p.node && !ids.has(p.node)) err(w, `point on missing id ${p.node}`);
      });
      if (status.current && last && (status.current.updated || '') < last) err('status.current', `updated is before the last replaced version (${last})`);
    }
  }
  if (!Array.isArray(tours)) err('tours', 'must be a list');
  const tourIds = new Set();
  for (const t of Array.isArray(tours) ? tours : []) {
    const w = `tour ${t.id || '(no id)'}`;
    if (typeof t.id !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.id)) err(w, 'id must be lower-case ASCII with hyphens');
    if (tourIds.has(t.id)) err(w, 'duplicate id');
    tourIds.add(t.id);
    for (const k of Object.keys(t)) if (!TOUR_FIELDS.includes(k)) err(w, `unknown field ${k}`);
    if (!isText(t.title)) err(w, 'title');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.updated || '')) err(w, 'updated must be YYYY-MM-DD');
    if (t.draft !== undefined && t.draft !== true) err(w, 'draft is true or left out');
    if (t.intro !== undefined && !(Array.isArray(t.intro) && t.intro.length && t.intro.every(isText))) err(w, 'intro must be a list of paragraphs');
    if (!Array.isArray(t.stages) || !t.stages.length) { err(w, 'needs stages'); continue; }
    t.stages.forEach((st, i) => {
      const ws = `${w} stage ${i + 1}`;
      if (!isText(st.title)) err(ws, 'title');
      if (!Array.isArray(st.steps) || !st.steps.length) { err(ws, 'needs steps'); return; }
      st.steps.forEach((x, j) => {
        const wx = `${ws} step ${j + 1}`;
        for (const k of Object.keys(x)) if (!STEP_FIELDS.includes(k)) err(wx, `unknown field ${k}`);
        if (!ids.has(x.node)) err(wx, `on missing id ${x.node}`);
        if (!isText(x.text)) err(wx, 'text');
        if (x.also !== undefined && !Array.isArray(x.also)) err(wx, 'also must be a list');
        for (const id of Array.isArray(x.also) ? x.also : []) if (!ids.has(id)) err(wx, `also has missing id ${id}`);
        for (const id of [x.node, ...(Array.isArray(x.also) ? x.also : [])]) if (retired.has(id)) err(wx, `on retired place ${id}`);
      });
    });
  }
  return errors;
}

// Compares the data with an earlier version of it, usually the last commit, and returns errors for
// history that would be lost: a place removed instead of retired, a change without an entry in its
// log, an earlier entry rewritten, a note changed, a status replaced without keeping the old one.
export function compareHistory(prev, cur) {
  const errors = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const now = new Map(cur.nodes.map(n => [n.id, n]));
  for (const a of prev.nodes) {
    const b = now.get(a.id);
    if (!b) { err(a.id, 'removed. A place is never removed: retire it (see docs/model.md)'); continue; }
    for (const k of ['added', 'conversation']) if (!same(a[k], b[k])) err(a.id, `${k} never changes`);
    if (a.retired) { if (!same(a, b)) err(a.id, 'is retired and does not change any more'); continue; }
    const old = a.changes || [], log = b.changes || [];
    if (log.length < old.length || old.some((c, i) => !same(c, log[i]))) { err(a.id, 'earlier entries in changes were changed or removed'); continue; }
    const fresh = log.slice(old.length);
    const changed = CHANGEABLE.filter(k => !same(a[k], b[k]));
    if (changed.length && !fresh.length) { err(a.id, `${changed.join(', ')} changed without an entry in changes`); continue; }
    const listed = new Set(fresh.flatMap(c => c.fields || []));
    const unlisted = changed.filter(k => !listed.has(k));
    if (unlisted.length) err(a.id, `${unlisted.join(', ')} changed, but no new entry in changes lists it in fields`);
    for (const k of SMALL) {
      if (!changed.includes(k)) continue;
      const first = fresh.find(c => (c.fields || []).includes(k));
      if (!first) continue;
      if (!first.from || !(k in first.from)) err(a.id, `the entry for ${k} needs from.${k}: ${JSON.stringify(a[k] ?? null)}`);
      else if (!same(first.from[k], a[k])) err(a.id, `from.${k} is ${JSON.stringify(first.from[k])}, but it was ${JSON.stringify(a[k] ?? null)}`);
    }
  }
  const notes = new Map(cur.notes.map(x => [x.id, x]));
  for (const x of prev.notes) if (!same(x, notes.get(x.id))) err(`note ${x.id}`, 'notes are never changed or removed');
  const versions = st => (st && st.history && Array.isArray(st.history.versions) ? st.history.versions : []);
  const ph = versions(prev.status), ch = versions(cur.status);
  if (ch.length < ph.length || ph.some((x, i) => !same(x, ch[i]))) err('status.history', 'earlier versions were changed or removed');
  else if (prev.status.current && !same(prev.status.current, cur.status.current)) {
    const kept = ch.slice(ph.length).some(x => { const { replaced, why, ...rest } = x; return same(rest, prev.status.current); });
    if (!kept) err('status.current', 'changed, but the version before is not kept in status.history.versions, with replaced and why');
  }
  return errors;
}

// Things worth a look that are not errors. The map is not finished, so a tour is a
// snapshot: when "Hva kartet har funnet" changes after the tour was last gone over,
// say so, and name the findings and dig sites the tour does not visit.
export function warnings({ status, tours = [] }) {
  const out = [];
  const cur = status && status.current;
  for (const t of Array.isArray(tours) ? tours : []) {
    if (t.draft) out.push(`tour ${t.id}: still a draft. Henrik writes or approves the texts, then remove "draft".`);
    if (!cur || !cur.updated || !t.updated || cur.updated <= t.updated) continue;
    const visited = new Set((t.stages || []).flatMap(st => (st.steps || []).flatMap(x => [x.node, ...(x.also || [])])));
    const missing = [...(cur.points || []).map(p => p.node), ...(cur.next || [])].filter(id => id && !visited.has(id));
    out.push(`tour ${t.id}: status.json was updated ${cur.updated}, the tour ${t.updated}. Go over the tour and set its "updated".`
      + (missing.length ? ` Not in the tour: ${[...new Set(missing)].join(', ')}.` : ''));
  }
  return out;
}

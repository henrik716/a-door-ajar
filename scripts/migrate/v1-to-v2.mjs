// One-off migration from the original Norwegian schema (v1) to the English
// schema (v2), done on 1 November 2026.
//
// Only structure changes: file names, field names, enum values and node ids.
// Every piece of text (labels, texts, notes, sources) is copied byte for byte.
//
// Usage:  node scripts/migrate/v1-to-v2.mjs <v1-dir> <v2-dir>
//
// <v1-dir> must contain noder.json, notater.json and status.json, in the shape
// of the claude.ai artifact database. <v2-dir> gets nodes.json, notes.json and
// status.json. Kept in the repo so the live artifact database can be migrated
// the same way, and so old ids can be looked up in ids.json.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const [from, to] = process.argv.slice(2);
if (!from || !to) { console.error('Usage: node scripts/migrate/v1-to-v2.mjs <v1-dir> <v2-dir>'); process.exit(2); }

const read = async f => JSON.parse(await readFile(f, 'utf8'));
const IDS = await read(new URL('./ids.json', import.meta.url));

const TYPE = { spm: 'question', pos: 'position', funn: 'finding', innsikt: 'insight', ord: 'word', bilde: 'image', tenker: 'thinker' };
const REGION = {
  kjerne: 'core', ord: 'words', ost: 'east', blind: 'blindspots', tid: 'time', bev: 'consciousness',
  grense: 'limits', sone: 'borderland', sorg: 'grief', hund: 'dog', selv: 'self',
};
const STRENGTH = { solid: 'solid', stottet: 'supported', posisjon: 'position', omstridt: 'contested', bilde: 'image' };
const STATUS = { front: 'frontier', planlagt: 'planned' };
const CONVERSATION = { dypdykk: 'deepdive', alfred: 'alfred', kart: 'map' };
const REL = {
  stotter: 'supports', motsier: 'contradicts', forutsetter: 'presupposes', nyanserer: 'qualifies',
  opplos: 'dissolves', godtstilt: 'makesWellPosed', brukerord: 'usesWord', utfordrer: 'challengesWord',
  svarer: 'answers', delav: 'partOf', leder: 'leadsTo', eksempel: 'exampleOf', bak: 'behind',
  paavirket: 'influenced', beslektet: 'relatedTo',
};

const fail = msg => { throw new Error(msg); };
const map = (table, v, what) => v === undefined ? undefined : (table[v] ?? fail(`unknown ${what}: ${v}`));
const id = v => IDS[v] ?? fail(`no new id for: ${v}`);

// Drops undefined keys, so the output keeps a fixed key order without empty fields.
const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

function node(r) {
  const known = new Set(['id', 'type', 'omr', 'navn', 'kort', 'styrke', 'haap', 'egen', 'status', 'svar', 'tekst', 'kilder', 'k', 'lagt', 'samtale']);
  for (const key of Object.keys(r)) if (!known.has(key)) fail(`${r.id}: unknown field ${key}`);
  return clean({
    id: id(r.id),
    type: map(TYPE, r.type, 'type'),
    region: map(REGION, r.omr, 'region'),
    label: r.navn,
    short: r.kort,
    strength: map(STRENGTH, r.styrke, 'strength'),
    hope: r.haap,
    own: r.egen,
    status: map(STATUS, r.status, 'status'),
    answer: r.svar,
    text: r.tekst,
    sources: r.kilder && r.kilder.map(s => clean({ title: s.t, url: s.u })),
    links: (r.k || []).map(e => clean({ rel: map(REL, e.p, 'link'), to: id(e.o), note: e.m })),
    added: r.lagt,
    conversation: map(CONVERSATION, r.samtale, 'conversation'),
  });
}

const note = r => clean({ id: r.id, node: id(r.node), text: r.tekst, time: r.tid });

function status(s) {
  const out = {};
  for (const [key, v] of Object.entries(s)) {
    out[key === 'na' ? 'current' : key] = clean({
      title: v.tittel,
      lead: v.ingress,
      updated: v.oppdatert,
      points: (v.punkter || []).map(p => clean({ node: p.node && id(p.node), strength: map(STRENGTH, p.styrke, 'strength'), own: p.egen, text: p.tekst })),
      next: (v.neste || []).map(id),
    });
  }
  return out;
}

const nodes = (await read(join(from, 'noder.json'))).map(node).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const notes = (await read(join(from, 'notater.json'))).map(note);
const st = status(await read(join(from, 'status.json')));

const ids = new Set(nodes.map(n => n.id));
if (ids.size !== nodes.length) fail('duplicate ids after migration');
for (const n of nodes) for (const l of n.links) if (!ids.has(l.to)) fail(`${n.id}: link to missing ${l.to}`);

await mkdir(to, { recursive: true });
const write = (f, v) => writeFile(join(to, f), JSON.stringify(v, null, 1) + '\n');
await write('nodes.json', nodes);
await write('notes.json', notes);
await write('status.json', st);
console.log(`Migrated ${nodes.length} nodes, ${notes.length} notes.`);

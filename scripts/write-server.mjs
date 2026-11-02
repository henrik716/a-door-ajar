// Local write mode. Serves the map and saves what is written in it:
// notes go to work/notes.json, new places and links to data/nodes.json.
//
// Usage:  npm run write          → http://localhost:8000
//         PORT=8080 npm run write
//         HOST=0.0.0.0 npm run write   (also reachable from a phone on the same network)
//
// static-db.js asks GET /api/ping. When it answers, the map shows the notes and the
// forms. Everywhere else (GitHub Pages, python -m http.server) the map stays read-only
// and does not load the notes at all.
//
// Every change is applied to the files as they are on disk right now, checked with
// the same rules as `npm run check`, and only then written. The export is not
// rebuilt here: run `npm run export` before committing.

import { createServer } from 'node:http';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { CHANGEABLE, CHANGE_FIELDS, FILES, SMALL, NODE_FIELDS, readData, serialize, validate } from './validate.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '127.0.0.1';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ttl': 'text/turtle; charset=utf-8', '.jsonld': 'application/ld+json', '.sparql': 'text/plain; charset=utf-8',
};

class Refused extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// One write at a time, so two quick saves cannot overwrite each other.
let queue = Promise.resolve();
const serial = fn => { const p = queue.then(fn); queue = p.catch(() => {}); return p; };

const writeAtomic = async (url, value) => {
  const file = fileURLToPath(url), tmp = file + '.tmp';
  await writeFile(tmp, serialize(value));
  await rename(tmp, file);
};

// Reads the files fresh, applies the change, and writes only the files that changed,
// and only if the result passes the checks.
const change = apply => serial(async () => {
  const d = await readData();
  const touched = apply(d) || [];
  const errors = validate(d);
  if (errors.length) throw new Refused(422, errors.join('\n'));
  for (const k of touched) await writeAtomic(FILES[k], d[k]);
});

const noteId = () => { // 20 characters, like the ids from claude.ai
  const a = 'abcdefghijklmnopqrstuvwxyz0123456789', b = randomBytes(20);
  return [...b].map(x => a[x % a.length]).join('');
};
const ordered = doc => Object.fromEntries(NODE_FIELDS.filter(k => doc[k] !== undefined).map(k => [k, doc[k]]));
const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const today = () => new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD, local time
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const api = {
  'GET ping': async () => ({ write: true }),

  'POST notes': async (_, body) => {
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) throw new Refused(400, 'A note needs text.');
    const note = { id: noteId(), node: body.node, text, time: new Date().toISOString() };
    await change(d => {
      while (d.notes.some(x => x.id === note.id)) note.id = noteId();
      d.notes.push(note);
      return ['notes'];
    });
    return { id: note.id };
  },

  // set: only for new places. An id never changes, and an existing place is never replaced whole.
  'PUT nodes': async (id, body) => {
    await change(d => {
      if (d.nodes.some(n => n.id === id)) throw new Refused(409, `There is already a place with id ${id}.`);
      if ('changes' in body) throw new Refused(400, 'A new place has no changes yet: added says when it came.');
      d.nodes.push(ordered({ ...body, id }));
      d.nodes.sort(byId);
      return ['nodes'];
    });
    return { id };
  },

  // update: changes the given fields of an existing place, as the form for new links does.
  // Retiring a place is a PATCH with retired: { date, text, replacedBy }. It is not logged in changes.
  // Every other change is logged in the place's changes. The body may append entries of its own,
  // with a text saying what moved. If it does not, an entry with the date and the fields is
  // added here. Earlier entries are never changed or removed.
  'PATCH nodes': async (id, body) => {
    if ('id' in body) throw new Refused(400, 'An id never changes.');
    for (const k of ['added', 'conversation']) if (k in body) throw new Refused(400, `${k} never changes.`);
    await change(d => {
      const i = d.nodes.findIndex(n => n.id === id);
      if (i < 0) throw new Refused(404, `No place with id ${id}.`);
      const before = d.nodes[i], after = { ...before, ...body };
      if (before.retired) throw new Refused(409, `${id} is retired and does not change any more.`);
      const old = before.changes || [], now = Array.isArray(after.changes) ? after.changes : [];
      if (now.length < old.length || old.some((c, k) => !same(c, now[k]))) throw new Refused(400, 'The change log is only appended to. Earlier entries are never changed or removed.');
      const fields = CHANGEABLE.filter(k => !same(before[k], after[k]));
      const fresh = now.slice(old.length).map(c => ({ ...c }));
      if (fields.length && !fresh.length) fresh.push({});
      for (const c of fresh) {
        c.date = c.date || today();
        if (!c.fields && fields.length) c.fields = fields;
        // the short fields keep the value they had before
        const from = (c.fields || []).filter(k => SMALL.includes(k) && fields.includes(k) && !(c.from && k in c.from));
        if (from.length) c.from = { ...(c.from || {}), ...Object.fromEntries(from.map(k => [k, before[k] ?? null])) };
      }
      const log = [...old, ...fresh.map(c => Object.fromEntries(CHANGE_FIELDS.filter(k => c[k] !== undefined).map(k => [k, c[k]])))];
      if (log.length) after.changes = log; else delete after.changes;
      d.nodes[i] = ordered(after);
      return ['nodes'];
    });
    return { id };
  },
};

const readBody = req => new Promise((resolve, reject) => {
  let size = 0; const chunks = [];
  req.on('data', c => { size += c.length; if (size > 1e6) { reject(new Refused(413, 'Too large.')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => {
    if (!chunks.length) return resolve({});
    try { const v = JSON.parse(Buffer.concat(chunks).toString('utf8')); resolve(v && typeof v === 'object' ? v : {}); }
    catch { reject(new Refused(400, 'The body is not JSON.')); }
  });
  req.on('error', reject);
});

const send = (res, status, body, type = 'application/json; charset=utf-8') => {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) {
      // Only the map itself may write: a page on another site cannot send JSON here without
      // a CORS preflight, which this server never answers, and the origin must be this server.
      if (req.method !== 'GET') {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) throw new Refused(403, 'Wrong origin.');
        if (!/^application\/json\b/.test(req.headers['content-type'] || '')) throw new Refused(415, 'Send JSON.');
      }
      const [, coll, ...rest] = url.pathname.slice(1).split('/');
      const handler = api[`${req.method} ${coll}`];
      if (!handler) throw new Refused(404, 'Unknown.');
      const id = rest.length ? decodeURIComponent(rest.join('/')) : null;
      const body = req.method === 'GET' ? {} : await readBody(req);
      const out = await handler(id, body);
      if (req.method !== 'GET') console.log(`${new Date().toLocaleTimeString('nb-NO')}  ${req.method} ${coll}${id ? '/' + id : ''}`);
      return send(res, 200, out);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new Refused(405, 'Read-only.');
    const path = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    if (path.split(/[/\\]/).some(p => p.startsWith('.') || p === 'node_modules')) throw new Refused(404, 'Not found.');
    const file = join(root, path || 'index.html');
    if (!file.startsWith(root)) throw new Refused(404, 'Not found.');
    const body = await readFile(file).catch(() => { throw new Refused(404, 'Not found.'); });
    send(res, 200, body, TYPES[extname(file)] || 'application/octet-stream');
  } catch (e) {
    const status = e instanceof Refused ? e.status : 500;
    if (status >= 400 && url.pathname.startsWith('/api/')) console.error(`Refused ${req.method} ${url.pathname}: ${e.message}`);
    if (status === 500) console.error(e);
    send(res, status, { error: e.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`The map with write mode: http://localhost:${PORT}`);
  if (HOST === '0.0.0.0' || HOST === '::') {
    const lan = Object.values(networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => `http://${i.address}:${PORT}`);
    if (lan.length) console.log(`On the same network: ${lan.join('  ')}`);
    console.log('Anyone on this network can write to the map while the server runs.');
  }
  console.log('Run npm run export before you commit. Stop with Ctrl+C.');
});

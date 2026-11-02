/*
 * Static database for the map.
 *
 * On claude.ai the page gets a database through window.claude.use('db').
 * Outside Claude there is none, so this file provides a stand-in with the same
 * interface, reading data/nodes.json, data/status.json and data/tours.json.
 *
 * Two modes:
 * - Read-only (GitHub Pages, python -m http.server): the map shows the places.
 *   Henrik's working notes in work/notes.json are not loaded, and no forms are shown.
 * - Write mode (npm run write): the local server answers /api/ping. Then the notes
 *   are loaded and shown, and notes, new places and new links are saved to the files.
 *
 * If a real window.claude exists (the page runs as an artifact), this file does nothing.
 */
(function () {
  if (window.claude && typeof window.claude.use === 'function') return;

  const base = (document.currentScript && document.currentScript.src)
    ? new URL('.', document.currentScript.src).href
    : location.href.replace(/[^/]*$/, '');

  const getJSON = path => fetch(base + path, { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(path + ': ' + r.status); return r.json(); });

  const writable = fetch(base + 'api/ping', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null)).then(j => !!(j && j.write)).catch(() => false);

  const fetchAll = () => writable.then(w => Promise.all([
    getJSON('data/nodes.json'),
    w ? getJSON('work/notes.json') : [],
    getJSON('data/status.json'),
    getJSON('data/tours.json').catch(() => []),
  ])).then(([nodes, notes, status, tours]) => ({ nodes, notes, status, tours }));

  let data = fetchAll();
  const listeners = new Set();
  const listen = (fn, fail) => {
    listeners.add(fn);
    data.then(fn).catch(err => fail && fail(err));
    return () => listeners.delete(fn);
  };
  // After a save, read the files again and tell everyone listening, as a live database would.
  const refresh = () => { data = fetchAll(); return data.then(d => listeners.forEach(fn => fn(d))); };

  const fail = (message, code) => Promise.reject(Object.assign(new Error(message), code ? { code } : {}));
  const readOnly = () => fail('Kartet er bare til lesing her. Start skrivemodus med npm run write.', 'invalid_argument');

  const send = (method, path, body) => writable.then(w => {
    if (!w) return readOnly();
    return fetch(base + 'api/' + path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .catch(() => fail('Fant ikke skriveserveren.', 'unavailable'))
      .then(async r => {
        const out = await r.json().catch(() => ({}));
        if (!r.ok) { console.warn('Ikke lagret:', out.error || r.status); return fail(out.error || String(r.status)); }
        await refresh();
        return out;
      });
  });

  const toDoc = row => {
    const { id, ...rest } = row;
    return { id, exists: true, data: () => rest };
  };

  function collection(name) {
    const api = {
      limit: () => api,
      onSnapshot(next, onError) {
        return listen(d => {
          const rows = name === 'nodes' ? d.nodes : name === 'notes' ? d.notes : [];
          next({ docs: rows.map(toDoc) });
        }, onError);
      },
      add: doc => (name === 'notes' ? send('POST', 'notes', doc).then(r => ({ id: r.id })) : readOnly()),
    };
    return api;
  }

  function doc(path) {
    const [coll, id] = path.split('/');
    const path2 = coll + '/' + encodeURIComponent(id);
    return {
      onSnapshot(next, onError) {
        return listen(d => {
          const row = coll === 'status' ? d.status[id] : coll === 'nodes' ? d.nodes.find(n => n.id === id)
            : coll === 'tours' ? (d.tours || []).find(t => t.id === id) : null;
          next({ id, exists: !!row, data: () => row });
        }, onError);
      },
      set: value => (coll === 'nodes' ? send('PUT', path2, value) : readOnly()),
      update: value => (coll === 'nodes' ? send('PATCH', path2, value) : readOnly()),
      delete: readOnly,
    };
  }

  const db = { collection, doc };
  const user = { can: () => writable };

  window.claude = {
    use(name) {
      if (name === 'db') return Promise.resolve(db);
      if (name === 'user') return Promise.resolve(user);
      return Promise.reject(new Error('Ikke tilgjengelig utenfor Claude: ' + name));
    },
  };
})();

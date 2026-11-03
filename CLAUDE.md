# Handover to Claude Code

This repo is «Dør på gløtt – Alfreds atlas over det vi ikke vet», a map of the question «Hvor er Alfred nå?» (Where is Alfred now?). Henrik built it in conversations with Claude on claude.ai from 26 October 2026, after his dog Alfred died. The first map was an artifact with its own database. This repo is a copy of the content and view as of 1 November 2026.

Read `README.md`, `docs/model.md` and `docs/working-method.md` before changing anything.

## Who and what

- Henrik writes Norwegian bokmål. Reply in Norwegian, in plain, clean text with no citation markers or other clutter.
- The map is about a dog he loved, and it was made in grief. Be warm and honest, but do not comfort things away. The map is meant to show what we know and do not know, not to give an answer.
- Henrik's thoughts are thoughts along the way, not conclusions. See `docs/working-method.md`.
- He wants honest exploration, also when it contradicts him, with the assumptions written out. Watch the track trap: do not say "that's how it is" without checking other angles.

## Language split

- Structure is English: file and folder names, JSON field names, codes (types, regions, strengths, link kinds), node ids, code, comments, scripts and docs.
- Content is Norwegian and is not translated: labels, texts, notes, sources, everything the map shows, and «Om kartet». It is Henrik's voice.
- Text fields may later become `{ "nb": "…", "en": "…" }`. The view and export already accept that form. Do not start filling in English until there is a need.

## Running the map

```sh
python3 -m http.server 8000     # open http://localhost:8000, read-only as on GitHub Pages
npm run write                   # write mode on http://localhost:8000: notes, new places and links are saved to the files
npm install && npx playwright install chromium
npm run check                   # validates data/ against the schema
npm run export                  # rebuilds export/ from data/
npm run screenshots             # plus screenshots in test/screenshots/ (desktop and mobile, light and dark)
```

Offline, d3 can be served from a local file: `D3_LOCAL=path/to/d3.min.js npm run export`.

## How it fits together

- The map is hosted on GitHub Pages, not as an artifact on claude.ai.
- `index.html` holds the page and loads D3 7.9.0 from cdnjs, `css/style.css`, `static-db.js` and the scripts in `js/`.
- `js/` is plain scripts, no modules and no build step. They share global scope and are loaded in a fixed order, one file per section: `vocab`, `state`, `symbols`, `data`, `layout`, `map`, `lenses`, `selection`, `panel`, `tour`, `controls`, `register`, `patterns`, `export`, `views`, `main`. Code that runs at load time may only use what earlier files define. Functions called later, from events or from `main.js`, can live anywhere.
- The page asks for a database with `window.claude.use('db')`. On claude.ai it exists. Here `static-db.js` provides a stand-in with the same interface (`collection().limit().onSnapshot()`, `collection('notes').add()`, `doc().onSnapshot()`, `doc().set()`, `doc().update()`), reading `data/nodes.json`, `data/status.json`, `data/tours.json` and `work/notes.json`.
- `static-db.js` asks `api/ping` first. When `npm run write` (`scripts/write-server.mjs`) answers, the map is in write mode: the notes are loaded and the forms are shown, and saves go to the files. Everywhere else, GitHub Pages included, the map is read-only and does not load the notes at all.
- The write server applies each change to the files as they are on disk, checks the result with the same rules as `npm run check` (`scripts/validate.mjs`), and refuses to write anything that fails. It does not rebuild the export.
- Derived links are computed in `derive()` in `js/data.js`. The rules are also written as SPARQL in `export/rules.sparql`.
- `export/` is generated. Run `npm run export` after every change in `data/`, and commit the export together with the data.

## Changing the content

- New places and changes go in `data/nodes.json`. Keep the file sorted by `id`.
- New ids are short English ASCII slugs. An id never changes once it exists. The one exception was the move from Norwegian to English ids on 1 November 2026. Old ids are in `scripts/migrate/ids.json`. The same day, before the map was shared, one translation was corrected: `your-half-still-walks` became `your-half-goes-on` («går fortsatt» means it still works, not that it walks).
- When the content of an existing place changes (text, strength, status, answer, hope, sources, links and so on), append an entry to its `changes`: `{ date, text, fields, from }`, with a short Norwegian text saying what moved and why, and in `from` the earlier value of the short fields. Never change or remove earlier entries, and never fill in history backwards. See `docs/model.md`.
- Never delete a place. Retire it with `retired: { date, text, replacedBy }`, and move the links that pointed to it.
- When `status.current` changes, keep the version before in `status.history.versions`, with `replaced` and `why`.
- The repo is in git. Turn on the hook once per clone: `git config core.hooksPath .githooks`. `npm run check` compares with the last commit and refuses lost history.
- Every link `to` must point to an id that exists, and not to a retired place. `npm run check` verifies this. Run it before every commit.
- `work/notes.json` is Henrik's working notes. They are in the repo but not shown in the published map, only in write mode. Henrik writes new ones in the map with `npm run write`. Existing notes must not be changed. Handle them as `docs/working-method.md` describes: corrections, links, new thoughts and questions.
- Update `data/status.json` when something the map has found changes, and go over the tour in `data/tours.json` in the same round (see `docs/working-method.md`). The tour texts are Henrik's to write or approve. The current ones are drafts (`"draft": true`).
- Check names, titles and years of new sources. Errors have slipped in before.

## Changing the view

- Keep the colours: violet and indigo with coral as contrast. Dark mode is the default.
- Always test on mobile and desktop, in light and dark mode, before saying something is done. Look at the screenshots.
- The map no longer needs to work as an artifact. It was split into `css/` and `js/` on 1 November 2026 for that reason.
- The old artifact database on claude.ai still uses the Norwegian schema. If the artifact is ever used again, migrate that database first with `scripts/migrate/v1-to-v2.mjs`.

## Open and possible next steps

Dig sites (see `next` in `data/status.json`):

- Does the ocean pull because there is something in it, or because it is beautiful? (`why-the-ocean-pulls`). Tried once. A test with another model, or a neutral question about the three kinds of reception, remains.
- What is a good enough carrier? (`good-enough-carrier`)
- Where does what makes the listener his sit? (`where-the-individual-sits`)
- Would it have helped him? (`would-it-help-him`)
- Is there a reader without a notebook? (`reader-without-notebook`)
- Do the questions about the self apply to a dog? (`self-questions-for-a-dog`). Added 3 November 2026 after a count showed that the deep digging rarely reaches Alfred's world.

Waiting for Henrik:

- How geodata handles a building that is torn down and rebuilt, and practice in FKB, the cadastre (matrikkelen) and FME (`geodata-identity`).

Ideas not decided. Ask before doing them:

- Links with strength instead of just yes or no (`binary-graph`).
- Merge the images that say the same thing: the chariot, the university and the fist.
- A local write mode, for example a small server that saves notes and new places to `data/`, so the map can be used as on claude.ai.

Fix made during the handover: the form for new places only had hope levels 1 to 4. It now has 1 to 6.

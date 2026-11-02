# Dør på gløtt

*Alfreds atlas over det vi ikke vet* (Alfred's atlas of what we do not know)

A map of one question: where is Alfred now? It puts physics, philosophy, religion, brain science and grief side by side, and shows what we know, what we do not know, and where the door stands.

The map itself is in Norwegian. The code, schema and documentation are in English.

## Om kartet

Alfred var en finsk lapphund. Jeg hadde ham i tretten av hans nesten fjorten år. Han døde hjemme 26. oktober 2026, etter en lang dag ute i sola, med oss rundt seg.

Dagene etter satt jeg igjen med ett spørsmål: Hvor er Alfred nå? Dette kartet er et forsøk på å se ordentlig på det spørsmålet, med fysikk, filosofi, religion, hjerneforskning og sorg side om side.

Navnet kommer fra ham. I tretten år gikk jeg ut døra uten at han visste hvor jeg ble av, men han visste at jeg fantes, og han ventet. Og han trengte aldri en åpen dør. En glipe var alltid nok.

Ingen vet hva som er på den andre siden. Kartet gir ikke et svar. Det viser hva vi vet, hva vi ikke vet, og hvor døra står.

## What is here

| Path | What |
|---|---|
| `index.html` | The map. The page itself, with D3 from cdnjs and no build step. |
| `css/style.css` | All styling. |
| `js/` | The map's code, as plain scripts loaded in order by `index.html`. |
| `static-db.js` | Lets the map read from `data/` when it is not running inside Claude, and write through the local server in write mode. |
| `data/nodes.json` | Every place in the map, with its links. |
| `data/status.json` | The summary «Hva kartet har funnet». |
| `data/tours.json` | The guided walk «Gå gjennom kartet». |
| `export/alfred-atlas.ttl` | The whole map as Turtle, with the derived links. |
| `export/alfred-atlas.jsonld` | The same as JSON-LD. |
| `export/rules.sparql` | The rules that produce the derived links. |
| `scripts/export.mjs` | Rebuilds the export files from `data/`. |
| `scripts/check.mjs` | Checks `data/` and `work/` against the schema in `scripts/validate.mjs`, and against the last commit so that no history is lost. |
| `.githooks/pre-commit` | Runs the check before every commit. Turn it on with `git config core.hooksPath .githooks`. |
| `scripts/write-server.mjs` | Local write mode (`npm run write`). |
| `work/notes.json` | Henrik's working notes on the places, as he wrote them. Not shown in the published map. |
| `scripts/migrate/` | The one-off migration from the Norwegian schema, and the map from old to new ids. |
| `docs/model.md` | The data model: types, regions, strengths, hope levels and links. |
| `docs/working-method.md` | How the map was built, and the rules we worked by. |
| `CLAUDE.md` | Handover to Claude Code. |

## Viewing the map

The map loads its data with `fetch`, so it must be opened through a small web server, not directly as a file:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

It can also be published straight from the repo with GitHub Pages (Settings → Pages → Deploy from branch, root folder).

Opened like this, or on GitHub Pages, the map is read-only and does not show Henrik's working notes.

To work in the map, start it in write mode instead:

```sh
npm run write
# open http://localhost:8000
```

Then notes, new places and new links can be added in the map itself. They are saved to `work/notes.json` and `data/nodes.json`, but only if they pass the same checks as `npm run check`. Run `npm run export` before you commit. With `HOST=0.0.0.0 npm run write` the map can also be opened from a phone on the same network, but then anyone on that network can write to it.

## Rebuilding the export

```sh
npm install
npx playwright install chromium   # first time
git config core.hooksPath .githooks   # once per clone: the check runs before every commit
npm run check                     # validates data/ and compares with the last commit
npm run export                    # writes export/*.ttl, *.jsonld and *.sparql
npm run screenshots               # the same, plus screenshots in test/screenshots/
```

The export is computed by the same code as the map, so the derived links in the Turtle file are always the ones the map shows.

## Origin

The map was built in conversations with Claude from 26 October 2026, with input and criticism from Gemini along the way. The first map lived as an artifact on claude.ai, with its own database. This repo is a copy of the content and view as of 1 November 2026. The schema was moved from Norwegian to English the same day, without changing any text.

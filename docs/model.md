# The data model

The map is a graph. Each place is a node in `data/nodes.json`, and its links are stored on the node they start from, in the field `links`. Everything else, including the derived links, is computed by the code in `js/` when the map loads.

Structure (file names, field names, codes and ids) is in English. Content (labels, texts, notes, sources and everything the map shows) is in Norwegian, in Henrik's voice, and is not translated.

## A place

```json
{
  "id": "presence-and-archive",
  "type": "finding",
  "region": "dog",
  "label": "Han bar nærværet, du bar arkivet",
  "short": "Nærværet og arkivet",
  "strength": "supported",
  "hope": [2],
  "own": true,
  "text": "Dine tanker: …",
  "sources": [{ "title": "Forfatter, Tittel (år)", "url": "https://…" }],
  "links": [{ "rel": "qualifies", "to": "t-content", "note": "for en hund var nærværet mer enn arkivet" }],
  "added": "2026-11-01",
  "conversation": "deepdive",
  "changes": [{ "date": "2026-11-03", "text": "Styrken fra omstridt til støttet, etter kildene om transaktiv hukommelse.", "fields": ["strength"], "from": { "strength": "contested" } }]
}
```

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Lower-case ASCII slug in English with hyphens. Never changes, because other places point to it. |
| `type` | yes | What kind of place, see below. |
| `region` | yes | The region the place belongs to, see below. |
| `label` | yes | The title shown in the panel. |
| `short` | no | Short label used on the map when `label` is long. |
| `strength` | no | How well it stands, see below. Questions and thinkers have none. |
| `hope` | no | Which hope levels the place is about, numbers from 1 to 6. |
| `own` | no | `true` when it is the map's own conclusion, our own experiment, or Henrik's thoughts, and not taken from a source. |
| `status` | no | Whether the place is still open. `frontier` («Fronten»): dug into, and still open. `planned` («Ikke gravd ennå»): a question raised but not dug into yet. Leave it out when the place is not open. |
| `answer` | no | Short answer to a question, shown under the title. |
| `text` | yes | The text itself. |
| `sources` | no | List of `{ title, url }`, where `url` is optional. |
| `links` | yes | Links out of the place: `{ rel, to, note }`, where `rel` is the kind of link, `to` is the id of the target and `note` is an optional remark. |
| `added` | yes | Date the place was added, `YYYY-MM-DD`. |
| `conversation` | yes | Which conversation it came from: `deepdive` (the deep dive), `alfred` («Min kjære Alfred») or `map` (added in the map itself). |
| `changes` | no | The change log: what has moved in the place since it was added, oldest first. See below. |
| `retired` | no | Set when the place has gone out of the map: `{ date, text, replacedBy }`. See below. |

Keep the file sorted by `id`. `npm run check` validates all of this, including that every link points to an id that exists. In a git clone it also compares with the last commit, so that no history is lost (see «History» below).

### The change log

`changes` is a list of `{ date, text, fields, from }`, oldest first:

- `date` is `YYYY-MM-DD`, never before `added` and never before the entry above it.
- `text` is a text field saying what moved and why, in Henrik's voice, for example «Styrken fra omstridt til støttet, etter kildene om transaktiv hukommelse.»
- `fields` lists which fields changed: any of `type`, `region`, `label`, `short`, `strength`, `hope`, `own`, `status`, `answer`, `text`, `sources`, `links`.
- `from` keeps the value the short fields had before: `type`, `region`, `strength`, `hope`, `own` and `status`. `null` means the field was not set. Earlier versions of the long fields (texts, sources, links) are in git.
- An entry needs `text`, `fields` or both. Leave `changes` out until there is a first entry.

The log is only appended to, like the notes. Earlier entries are never changed or removed. `id`, `added` and `conversation` never change and are not logged. A new place has no log: `added` says when it came.

Every change in one of the fields above is logged, a corrected typo too («Rettet skrivefeil.»), so the log and git always agree. Derived links are not logged, since they follow from the links. The one exception is a mechanical change of the whole file that is not a change of content, such as the move to English ids on 1 November 2026. It is checked with `npm run check -- --migration` and explained in the commit.

There was no log before 1 November 2026. A place without `changes` has not been changed since it was added, or was changed before the log existed. Nothing is filled in backwards.

The write server logs every change it saves. When the map sends an entry with a text (the form for new links does), it is used, and the server fills in `fields` and `from`. When it does not, the server adds an entry with the date, the fields and `from`. It refuses any change that rewrites or removes earlier entries, any change to `added` or `conversation`, and any change to a retired place. When a place is changed by hand in `nodes.json`, the entry is written by hand too, and `npm run check` says what is missing.

### Retired places

A place is never removed from `nodes.json`. Other places, notes, earlier versions of the status and links from outside may point to it, and its history would be lost. When a place goes out of the map, for example when two places that say the same thing are merged, it is retired:

```json
"retired": { "date": "2026-11-10", "text": "Slått sammen med «Vogna»: de sa det samme.", "replacedBy": "the-chariot" }
```

- `date` is `YYYY-MM-DD`, not before `added` and not before the last entry in `changes`.
- `text` says why, and is required.
- `replacedBy` is optional: the id of the place that took over. The map's address for the retired place leads there.

A retired place keeps every other field as it was, and does not change any more. It is not drawn, listed or counted in the map, and it is not part of the derived links. In the export it keeps its id and label, with `v:retired` and `dct:isReplacedBy`. Places in the map may not link to a retired place, and neither may the status or the tour: move those links to what replaced it, and log that in the places that change. A retired place's own links stay as they were. Notes on it are kept, like all notes.

### Text fields and languages

`label`, `short`, `text`, `answer`, `sources[].title`, `links[].note`, `changes[].text`, `retired.text`, `status.history.versions[].why`, the `text` of notes and the texts in `status.json` are *text fields*. A text field is either a plain string, which is Norwegian bokmål, or a map of languages:

```json
"label": { "nb": "Han bar nærværet, du bar arkivet", "en": "He carried the presence, you carried the archive" }
```

Today every text field is a plain string. The view and the export accept both forms, so an English translation can be added one field at a time, if it is ever needed, without a schema change. The view shows `nb` (set by `LANG` in `js/vocab.js`). The export writes every language it finds, as `@nb`/`@en` literals in Turtle and as language maps in JSON-LD.

## Types

| `type` | Shown as | Used for |
|---|---|---|
| `question` | Spørsmål | Questions the map asks, dig sites included. |
| `position` | Posisjon | A view someone holds, or an assumption (`t-…`). |
| `finding` | Funn | Something measured or observed, including our own experiments and Henrik's thoughts. |
| `insight` | Innsikt | A conclusion the map has drawn. |
| `word` | Feil ord | A word that may frame the question wrongly. |
| `image` | Bilde | A parable or an image. |
| `thinker` | Tenker | A person or text behind a view. Hidden in the overview by default. |

Assumptions are ordinary `position` places whose id starts with `t-` (thesis), for example `t-content` and `t-one-subject`. They exist so it is visible what rests on what.

## Regions

| `region` | Shown as |
|---|---|
| `core` | Kjernen |
| `words` | Ordene |
| `east` | Østen |
| `self` | Selvet |
| `blindspots` | Blindsonene |
| `borderland` | Grensesonen |
| `consciousness` | Bevisstheten |
| `limits` | Grensene |
| `dog` | Alfreds verden |
| `grief` | Sorgen |
| `time` | Tiden |

The regions sit clockwise around the core in this order. Neighbours are the regions that share the most links, so three arcs form without being named: language (`words`, `east`), the mind (`self` to `consciousness`) and life and loss (`limits` to `time`).

## Strength

| `strength` | Shown as |
|---|---|
| `solid` | Solid |
| `supported` | Støttet |
| `position` | Alvorlig posisjon |
| `contested` | Omstridt |
| `image` | Bilde |

On the map's own places, strength is shown as grounding: «Bygger på solide funn», «Bygger på støttede funn», «Rimelig, ikke prøvd», «Usikker».

## Hope levels

| Level | Name | Meaning |
|---|---|---|
| 1 | Varig | What happened is lasting. |
| 2 | Mønster | The pattern lives on in you. |
| 3 | Havet eller støvet | Experience goes on, but not as his: either one consciousness (the ocean) or experience left in matter with no whole (the dust). |
| 4 | Havet med vannet | His perspective ends, but what he carried joins the whole. |
| 5 | Hans strøm | His own stream goes on, without the memories. |
| 6 | Han selv | He goes on as himself, with the memories. |

Levels 3 to 6 are not a ladder but four cells built from two questions:

|  | The content is lost | The content comes along |
|---|---|---|
| **Not his perspective** | 3 Havet eller støvet | 4 Havet med vannet |
| **His perspective** | 5 Hans strøm | 6 Han selv |

3 and 4 differ in what comes along. 3 and 5 differ in who experiences. The numbers do not rank how beautiful something is.

## Links

| `rel` | Shown as | The other way |
|---|---|---|
| `supports` | Støtter | Støttes av |
| `contradicts` | Motsier | Motsies av |
| `presupposes` | Forutsetter | Forutsettes av |
| `qualifies` | Nyanserer | Nyanseres av |
| `dissolves` | Oppløser spørsmålet | Oppløses av |
| `makesWellPosed` | Gjør spørsmålet godt stilt | Gjøres godt stilt av |
| `usesWord` | Bruker ordet | Brukes i |
| `challengesWord` | Utfordrer ordet | Utfordres av |
| `answers` | Svarer på | Svar og forsøk på svar |
| `partOf` | Del av | Deler |
| `leadsTo` | Leder til | Følger av |
| `exampleOf` | Eksempel på | Eksempler og bilder |
| `behind` | Står bak (thinker → view) | Fra |
| `influenced` | Påvirket | Påvirket av |
| `relatedTo` | Henger sammen med | Henger sammen med |

## Derived links

Computed in `derive()` in `js/data.js`, and also written as SPARQL in `export/rules.sparql`:

- **R1 Challenges** (`challengesDerived`). B challenges A when A presupposes X and B contradicts X.
- **R2 Strengthens** (`strengthensDerived`). B strengthens A when A presupposes X and B supports X, but not if B also contradicts another premise of A.
- **R3 Shares a premise** (`sharesPremiseWith`). A and B share a premise when both presuppose X. Symmetric.
- **R4 May dissolve** (`mayDissolveDerived`). P may dissolve question Q when Q uses a word that P challenges. Questions only.
- **R5 Qualifies** (`qualifiesDerived`). B qualifies A when A presupposes X and B qualifies X.

Each derivation appears once, even when several paths lead to it.

## Notes and status

`work/notes.json` holds Henrik's working notes on places: `{ id, node, text, time }`, where `id` is 20 random lower-case letters and digits and `time` is an ISO timestamp. They are never edited. Whatever is built from them is added as places or in the texts, alongside.

The notes are kept outside `data/` because they are not part of the published map. They are in the repo, but the map only loads them in write mode (`npm run write`).

`data/status.json` holds the summary in the side panel, under the key `current`: `title`, `lead`, `updated`, `points` (each with `node`, `strength`, `text` and optionally `own`) and `next` («Der vi graver videre»): the open places chosen to dig in now. This is a choice made at a point in time, taken from the open places (`frontier` or `planned`), not a list of all of them. `npm run check` refuses a `next` in `current` that points to a place which is not open. All open places are listed under «Åpne steder» in Mønstre.

What the map has found is its most important history. When `current` is replaced, the version before is kept, unchanged, in `history.versions`, oldest first, with two fields added: `replaced` (the date it was replaced) and `why` (a text saying what moved). `current.updated` is then set to the new date.

```json
"history": { "versions": [{ "title": "…", "lead": "…", "updated": "2026-11-01", "points": [], "next": [], "replaced": "2026-11-10", "why": "Punktet om havet flyttet seg etter testen med en annen modell." }] }
```

The versions are only appended to. The panel lists them under «Tidligere versjoner». `npm run check` refuses a changed `current` when the version before is not kept.

## Tours

`data/tours.json` is a list of guided walks through the map. The map shows the one with id `main` («Gå gjennom kartet»), at the address `#tour/<n>`, counted from 1.

```json
{
  "id": "main",
  "title": "Gjennom kartet",
  "updated": "2026-11-01",
  "draft": true,
  "stages": [
    { "title": "Det som står fast", "steps": [
      { "node": "cannot-be-undone", "also": ["happened"], "text": "Det sikreste stedet i kartet. …" }
    ] }
  ]
}
```

`intro` is an optional list of paragraphs shown before the first step, at `#tour/0`, with the whole map in view: why the map was made, what kind of map it is, and that it is not finished. A tour has stages, and a stage has steps. A step is a place (`node`), a short text shown above the place in the panel, and optionally a few places to look at alongside it (`also`). `title`, stage titles and step texts are text fields. `draft: true` means the texts are not yet approved by Henrik. A place may appear in more than one step, as the door does at the start and the end.

The map is not finished, so a tour is a snapshot. `updated` is the date it was last gone over, and the tour shows it. `npm run check` refuses a step on a place that does not exist. It also gives a note, not an error, when `status.json` was updated after the tour, with the findings and dig sites the tour does not visit.

## The export

The RDF namespace is `urn:x-alfred-atlas:`. Classes and properties are in `urn:x-alfred-atlas:schema#` (prefix `v:`), places in `urn:x-alfred-atlas:node:` (prefix `n:`). Class names are the types in upper camel case (`v:Question`, `v:Finding`, …). Labels are `rdfs:label`, texts `rdfs:comment`, sources `dct:source`. `added` is `dct:created`, and the date of the last change is `dct:modified`. Each change is a `v:change` with `dct:date`, `rdfs:comment` and `v:changedField`: blank nodes in Turtle, where the dates give the order, and an ordered list in JSON-LD.

## History

The history of the map is kept in three places that agree with each other: git, which has every version of every file; the change log in each place, which says what moved and why; and `status.history`, which keeps what the map had found before. `npm run check` compares the files with the last commit and refuses:

- a place that is removed instead of retired,
- a change in a place without an entry in its log, or with an entry that does not list the field or has the wrong `from`,
- an earlier log entry, a retired place or a note that is changed,
- a changed `status.current` when the version before is not kept.

The git hook in `.githooks/pre-commit` runs the check before every commit. Turn it on once per clone with `git config core.hooksPath .githooks`.

Until 1 November 2026 the schema was in Norwegian (`noder.json`, `omr`, `navn`, `stotter`, `spm`, ids like `trekker-havet`). It was migrated once, with `scripts/migrate/v1-to-v2.mjs`. No text was changed. `scripts/migrate/ids.json` maps every old id to its new one. One new id was corrected the same day, before anything was shared: `to-halvdeler` maps to `your-half-goes-on`, not the first, too literal `your-half-still-walks`. The live database behind the claude.ai artifact can be migrated with the same script, if the artifact is ever used again.

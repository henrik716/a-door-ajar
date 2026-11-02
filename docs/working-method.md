# How we work

How the map was built, and the rules we worked by from 26 October to 1 November 2026.

## What the map is

The map is not an answer. It shows what we know, what we do not know, and where the door stands. Every place says how well it stands, and the assumptions are written out as places of their own, so it is visible what falls if one of them falls.

## Henrik's thoughts

- Henrik's thoughts are thoughts along the way, not conclusions. Places built on them start with «Dine tanker:» or «Ditt eksempel:» and end with «Tanker underveis, ikke et svar.» They are marked `own: true`.
- Henrik is not a philosopher, physicist or biologist, and says so himself. His thoughts are to be taken seriously and tested, not lifted into more than they are.
- His notes in `work/notes.json` are never changed. He writes them in the map in write mode (`npm run write`), as he reads. Whatever is built from them is added alongside.

## How notes are handled

Notes are collected and gone through together, not one by one, and sorted into four kinds:

1. **Corrections.** The place is corrected, and we say what changed, in an entry in its `changes` (see `docs/model.md`).
2. **New links.** The link is added.
3. **New thoughts.** They become places of their own, marked as his thoughts.
4. **Questions and disagreement.** They become dig sites (`type: question`, `status: planned`).

Every change in the content of an existing place gets an entry in its change log: the date, what moved and why, and for the short fields what it was before. That is how the map keeps the history of what we thought, not just what we think now. Earlier entries are never changed.

Places are never deleted. When two places say the same thing, one is retired and points to the other. When «Hva kartet har funnet» changes, the version before is kept with a line on what moved. See `docs/model.md`.

If he feels he is repeating himself, that is a sign the map says the same thing in several places. Then it should be merged and tidied, not added to. The most important findings are presented before large changes to the structure.

## Honesty

- **The track trap.** Several times we have followed one track and said "that's how it is" without checking other angles. Every conclusion is to be tested against the other views, and "given that …" should stand where it belongs. The most common are "given that the brain produces experience" and "given that it does not".
- **Grief picks the theory.** When the task is to comfort, the models (and we) go to the views that let something remain. This has been tested, and it still needs testing.
- **Blind tests.** Questions asked in new conversations with no history. They are blank, but not independent when run against the same model that built the map. The premises of the question can decide the answer.
- **Sources.** Facts about the world are checked before they are written in. Names, titles and years of sources are verified. This has proved necessary.
- **Input from Gemini and others** is tested the same way as everything else. Some holds, some is overstated, and some is wrong.

## Language

- Content is Norwegian bokmål, simple and clear. Short sentences.
- No citation markers or clutter in the text. Sources go in `sources`.
- Do not call our own conclusions more than they are: «trolig», «peker mot» and «under det synet» where needed.
- Structure (files, fields, codes, ids) is English. Content is not translated. Some concepts are part of the content, such as «brukerord» and «feil ord», where the point is the words themselves.

## Look

- The colours are violet and indigo with coral as contrast. Keep them.
- Dark mode is the default. The choice is stored in `localStorage` under `dpg-theme`.
- The hope levels have their own colours, in light mode #4D6BA8 (3), #2E8494 (4), #B23A8C (5) and #C98A12 (6).
- Every change to the view is tested on mobile and desktop, in both light and dark mode, before it is used. `npm run screenshots` takes the screenshots.

## The view

- Kart, Register, Mønstre and Eksport are four views of the same graph (`#map`, `#register`, `#patterns`, `#export` in the address).
- The map uses a force simulation where each region has its anchor point around the core. The core question «Hvor er Alfred nå?» sits in the middle with four sub-questions around it.
- Labels and links appear gradually as you zoom in. Labels that overlap are hidden by importance.
- The side panel can be docked away to use the full width.
- The lenses Type, Håp, Evidens and Feil ord colour the map by different fields. Derived links and thinkers can be toggled on and off.
- «Gå gjennom kartet» is a guided walk in `data/tours.json`, for readers who do not know the map. It goes from what stands firm to what is open, and ends at the front, where the map is digging now. The counterweights are part of the route, not left out: a tour that only visits what comforts would be the grief picking the theory again.

## Keeping the tour current

The map is not finished, so the tour is a snapshot with a date.

- When `status.json` is updated, the tour is gone over in the same round. `npm run check` reminds you when it has not been.
- The five stages are the backbone and rarely change. The steps inside them move. The last stage, the front, moves most: when a dig site has been dug, its step moves back into an earlier stage, and the new dig site takes its place.
- If a finding changes strength, the step can stay, but its text must still be true.
- The tour is not generated from the data. The order and the texts between the steps are a story, and a person writes them. Henrik writes or approves the texts.

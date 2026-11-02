// Checks data/*.json and work/notes.json against the schema in docs/model.md, and against the
// last commit, so that no history is lost: places are retired and not removed, every change in
// a place has an entry in its log, notes and earlier entries are never changed, and an earlier
// "Hva kartet har funnet" is kept when it is replaced.
//
// Run before every commit:  npm run check
// The git hook in .githooks/pre-commit runs it for you (git config core.hooksPath .githooks).
//
// A mechanical change of the whole file that is not a change of content, such as the move to
// English ids on 1 November 2026, can skip the comparison:  npm run check -- --migration

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compareHistory, readData, validate, warnings } from './validate.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const cur = await readData();
const errors = validate(cur);

// The same files as they are in the last commit, or null when there is no git or no commit yet.
const committed = path => {
  try { return JSON.parse(execFileSync('git', ['show', `HEAD:${path}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 })); }
  catch { return null; }
};
let compared = 'no earlier commit to compare with';
if (process.argv.includes('--migration')) compared = 'not compared with the last commit (--migration)';
else {
  const prev = { nodes: committed('data/nodes.json'), notes: committed('work/notes.json'), status: committed('data/status.json') };
  if (prev.nodes && prev.notes && prev.status) {
    errors.push(...compareHistory(prev, cur));
    compared = 'history kept since the last commit';
  }
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
for (const w of warnings(cur)) console.warn('Note: ' + w);
const { nodes, notes, tours } = cur;
const retired = nodes.filter(n => n.retired).length;
console.log(`OK: ${nodes.length - retired} nodes${retired ? ` (and ${retired} retired)` : ''}, ${nodes.reduce((a, n) => a + n.links.length, 0)} links, ${notes.length} notes, ${tours.length} tour. ${compared[0].toUpperCase() + compared.slice(1)}.`);

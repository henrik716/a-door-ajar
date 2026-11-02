// Rebuilds export/alfred-atlas.ttl, export/alfred-atlas.jsonld and export/rules.sparql
// from data/*.json, by opening the map in a headless browser and reading the
// Export view. The export is therefore always computed by exactly the same code
// the map uses, derived links included.
//
// Usage:  npm install   (first time)
//         npm run export
//
// With --screenshots it also takes screenshots of the map on desktop and mobile,
// in both colour modes, into test/screenshots/.

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = createRequire(import.meta.url)('playwright')); }

const root = fileURLToPath(new URL('..', import.meta.url));
const screenshots = process.argv.includes('--screenshots');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };

const server = createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    const file = join(root, path || 'index.html');
    if (!file.startsWith(root)) throw new Error('outside root');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end();
  }
});
await new Promise(r => server.listen(0, r));
const url = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch();
const errors = [];
// Offline, d3 can be served from a local file: D3_LOCAL=path/to/d3.min.js npm run export
const d3local = process.env.D3_LOCAL;
const withD3 = async ctx => { if (d3local) await ctx.route('**/d3.min.js', r => r.fulfill({ path: d3local, contentType: 'text/javascript' })); };
try {
  const ctx0 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await withD3(ctx0);
  const page = await ctx0.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url + '#export');
  await page.waitForFunction(() => {
    const t = document.querySelector('#code-ttl');
    return t && t.value.length > 1000;
  }, null, { timeout: 30000 });
  const out = await page.evaluate(() => ({
    ttl: document.querySelector('#code-ttl').value,
    jsonld: document.querySelector('#code-jsonld').value,
    sparql: document.querySelector('#code-sparql').value,
    meta: document.querySelector('#meta') ? document.querySelector('#meta').innerText : '',
  }));
  await mkdir(join(root, 'export'), { recursive: true });
  await writeFile(join(root, 'export/alfred-atlas.ttl'), out.ttl);
  await writeFile(join(root, 'export/alfred-atlas.jsonld'), out.jsonld);
  await writeFile(join(root, 'export/rules.sparql'), out.sparql);
  console.log('Export written. ' + out.meta);

  if (screenshots) {
    await mkdir(join(root, 'test/screenshots'), { recursive: true });
    for (const [name, vp, scale] of [['desktop', { width: 1440, height: 900 }, 1], ['mobile', { width: 390, height: 844 }, 2]]) {
      for (const theme of ['dark', 'light']) {
        const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: scale });
        await withD3(ctx);
        await ctx.addInitScript(t => { try { localStorage.setItem('dpg-theme', t); } catch (e) {} }, theme);
        const p = await ctx.newPage();
        p.on('pageerror', e => errors.push(String(e)));
        await p.goto(url);
        await p.waitForTimeout(2500);
        await p.screenshot({ path: join(root, `test/screenshots/${name}-${theme}.png`) });
        await ctx.close();
      }
    }
    console.log('Screenshots in test/screenshots/.');
  }
} finally {
  await browser.close();
  server.close();
}
if (errors.length) { console.error('Errors in the page:\n' + errors.join('\n')); process.exit(1); }

'use strict';

/* ───────── Layout ───────── */
function anchor(region) {
  const a = REGION[region].a;
  if (a === null) return { x: 0, y: 0 };
  const r = a * Math.PI / 180;
  return { x: Math.cos(r) * RX, y: Math.sin(r) * RY };
}
const coreRing = d => d.region === 'core' && d.id !== 'alfred-now' && !CORE_POS[d.id];
function hash01(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

function layout() {
  const arr = [...S.nodes.values()];
  const fresh = arr.filter(n => !S.pos.has(n.id));
  if (!fresh.length) { for (const n of arr) Object.assign(n, S.pos.get(n.id)); return; }
  const partial = fresh.length < arr.length;
  if (!partial) {
    // the map grows: regions get more room as more places are added
    const g = Math.max(1, Math.min(1.6, Math.sqrt(arr.filter(n => n.type !== 'thinker').length / 280)));
    const portrait = innerHeight > innerWidth * 1.15;
    RX = (portrait ? 470 : 600) * g; RY = (portrait ? 980 : 440) * g;
  }
  for (const n of arr) {
    const p = S.pos.get(n.id);
    if (p) { n.x = p.x; n.y = p.y; if (partial) { n.fx = p.x; n.fy = p.y; } }
    else {
      const a = anchor(n.region), h = hash01(n.id), h2 = hash01(n.id + '#');
      const rr = n.region === 'core' ? 40 + h2 * 60 : 30 + h2 * 140;
      n.x = a.x + Math.cos(h * 6.283) * rr; n.y = a.y + Math.sin(h * 6.283) * rr;
    }
  }
  const core = S.nodes.get('alfred-now'); if (core) { core.fx = 0; core.fy = 0; }
  for (const [id, [x, y]] of Object.entries(CORE_POS)) { const c = S.nodes.get(id); if (c) { c.fx = x; c.fy = y; } }
  const links = S.edges.map(e => ({ source: e.s, target: e.o, p: e.p }));
  const same = l => l.source.region === l.target.region;
  const sim = d3.forceSimulation(arr)
    .force('link', d3.forceLink(links).id(d => d.id)
      .distance(l => l.p === 'behind' ? 34 : same(l) ? 58 : 150)
      .strength(l => l.p === 'behind' ? (same(l) ? .7 : .02) : same(l) ? .32 : .008))
    .force('charge', d3.forceManyBody().strength(d => d.type === 'thinker' ? -40 : -140).distanceMax(300))
    .force('x', d3.forceX(d => anchor(d.region).x).strength(d => coreRing(d) ? .02 : d.region === 'core' ? .4 : .22))
    .force('y', d3.forceY(d => anchor(d.region).y).strength(d => coreRing(d) ? .02 : d.region === 'core' ? .4 : .22))
    // the core's own conclusions settle in a ring outside the four questions, keeping the middle free
    .force('ring', d3.forceRadial(d => coreRing(d) ? Math.min(RX, RY) * .36 : 0, 0, 0).strength(d => coreRing(d) ? .35 : 0))
    .force('collide', d3.forceCollide(d => radOf(d) + (d.type === 'thinker' ? 6 : d.type === 'word' ? 26 : coreRing(d) ? 16 : d.region === 'core' ? 30 : 14)).iterations(3))
    .stop();
  const ticks = partial ? 160 : 460;
  for (let i = 0; i < ticks; i++) sim.tick();
  for (const n of arr) { n.fx = null; n.fy = null; S.pos.set(n.id, { x: n.x, y: n.y }); }
  if (core) { core.x = 0; core.y = 0; S.pos.set('alfred-now', { x: 0, y: 0 }); }
  for (const [id, [x, y]] of Object.entries(CORE_POS)) { const c = S.nodes.get(id); if (c) { c.x = x; c.y = y; S.pos.set(id, { x, y }); } }
}

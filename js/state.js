'use strict';

/* ───────── State ───────── */
const S = {
  nodes: new Map(), retired: new Map(), edges: [], derived: [], notes: [],
  pos: new Map(), sel: null, view: 'map', lens: 'type', hope: 0,
  showDerived: false, showThinkers: false,
  db: null, writer: null, loaded: false, t: d3.zoomIdentity, firstFit: false, status: null, statusHistory: [], intro: false,
  tour: null, step: null,
};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mq = window.matchMedia('(min-width: 960px)');
const isDesk = () => mq.matches;

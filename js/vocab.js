'use strict';

/* ───────── Vocabulary ───────── */
// Codes are English and never change. What the map shows is Norwegian.
// A text field is either a string (Norwegian) or a map of languages, { nb: '…', en: '…' }.
const LANG = 'nb';
const tx = v => v == null ? '' : typeof v === 'object' ? String(v[LANG] ?? v.nb ?? Object.values(v)[0] ?? '') : String(v);
const TYPE = {
  question: 'Spørsmål', position: 'Posisjon', thinker: 'Tenker', finding: 'Funn', word: 'Feil ord', image: 'Bilde', insight: 'Innsikt'
};
const TYPE_PL = {
  question: 'Spørsmål', position: 'Posisjoner', thinker: 'Tenkere', finding: 'Funn', word: 'Feil ord', image: 'Bilder', insight: 'Innsikter'
};
const TYPE_ORDER = ['question', 'insight', 'position', 'finding', 'word', 'image', 'thinker'];
const REGION = {
  core: { label: 'Kjernen', a: null },
  words: { label: 'Ordene', a: -90 },
  // neighbours share the most links: language (words, east), the mind (self … consciousness), life and loss (limits … time)
  east: { label: 'Østen', a: -54 },
  self: { label: 'Selvet', a: -18 },
  blindspots: { label: 'Blindsonene', a: 18 },
  borderland: { label: 'Grensesonen', a: 54 },
  consciousness: { label: 'Bevisstheten', a: 90 },
  limits: { label: 'Grensene', a: 126 },
  dog: { label: 'Alfreds verden', a: 162 },
  grief: { label: 'Sorgen', a: 198 },
  time: { label: 'Tiden', a: 234 },
};
const REGION_ORDER = ['core', 'words', 'east', 'self', 'blindspots', 'borderland', 'consciousness', 'limits', 'dog', 'grief', 'time'];
const STRENGTH = { solid: 'Solid', supported: 'Støttet', position: 'Alvorlig posisjon', contested: 'Omstridt', image: 'Bilde' };
const STRENGTH_RANK = { solid: 0, supported: 1, position: 2, contested: 3, image: 4 };
const BASIS = { solid: 'Bygger på solide funn', supported: 'Bygger på støttede funn', position: 'Rimelig, ikke prøvd', contested: 'Usikker', image: 'Bilde' };
const HOPE = [null,
  { k: 'Varig', l: 'Det som skjedde er varig' },
  { k: 'Mønster', l: 'Mønsteret lever i deg' },
  { k: 'Havet eller støvet', l: 'Opplevelsen fortsetter, men ikke som hans' },
  { k: 'Havet med vannet', l: 'Perspektivet hans tar slutt, men det han bar, blir med i helheten' },
  { k: 'Hans strøm', l: 'Hans egen strøm fortsetter, uten minnene' },
  { k: 'Han selv', l: 'Han fortsetter som seg selv, med minnene' },
];
// Levels 3–6 are not a ladder but four cells: is the perspective his, and does the content come along?
const HOPE_GRID = { 3: [0, 0], 4: [0, 1], 5: [1, 0], 6: [1, 1] };
const LEVELS = [1, 2, 3, 4, 5, 6];
function hopeGridHTML(active) {
  const cell = h => `<button type="button" class="cell" data-hope="${h}" aria-pressed="${active === h}" style="--hc: var(--h${h})${active && active !== h ? ';opacity:.45' : ''}"><b>${h}</b> ${esc(HOPE[h].k)}</button>`;
  return `<div class="hgrid"><span></span><span class="ax top">Innholdet blir borte</span><span class="ax top">Innholdet blir med</span>
    <span class="ax">Ikke hans perspektiv</span>${cell(3)}${cell(4)}
    <span class="ax">Hans perspektiv</span>${cell(5)}${cell(6)}</div>`;
}
let HF_OPEN = false;
function hopeExplainHTML(active, open) {
  const T = {
    3: 'Det er ikke lenger han som opplever, og det han bar på, er borte. Noe opplever fortsatt, men ingenting i det er Alfred. Det kan være havet: elva har rent ut i én bevissthet, og vannet kan ikke skilles fra resten. Eller det kan være støvet: opplevelse som blir igjen i materien, uten noen helhet å møtes i.',
    4: 'Det er ikke lenger han som opplever, men det han bar på, blir med inn i helheten. Ingen «Alfred» ser lenger ut fra et sted, men tretten år med deg er en del av det større. Et øye lukkes, men det det så, blir værende.',
    5: 'Det er fortsatt han som opplever, men uten minnene. En egen strøm som fortsetter fra ham, men som ikke husker deg. Litt som en drøm du har glemt: den var din, men innholdet er borte.',
    6: 'Både perspektivet og minnene. Alfred som Alfred, som kjenner deg igjen.'
  };
  const row = h => `<p class="hf${active === h ? ' on' : ''}" style="--hc: var(--h${h})"><b>${h} ${esc(HOPE[h].k)}.</b> ${T[h]}</p>`;
  return `<details class="hope-explain"${open ? ' open' : ''}><summary>Forskjellen på 3, 4, 5 og 6</summary>
    <p>To spørsmål skiller dem. Er det fortsatt han som opplever, altså hans eget perspektiv, eller har det gått opp i noe større? Og blir innholdet med: minnene, lukten av deg, vanene, alt han bar på?</p>
    ${[3, 4, 5, 6].map(row).join('')}
    <p class="rule">Huskeregel: 3 og 4 skiller seg på hva som blir med. 3 og 5 skiller seg på hvem som opplever. Derfor ligger 3 og 5 så nær hverandre: begge mangler innholdet, og bare opphavet skiller dem.</p></details>`;
}
const PRED = {
  supports: ['Støtter', 'Støttes av'],
  contradicts: ['Motsier', 'Motsies av'],
  presupposes: ['Forutsetter', 'Forutsettes av'],
  dissolves: ['Oppløser spørsmålet', 'Oppløses av'],
  makesWellPosed: ['Gjør spørsmålet godt stilt', 'Gjøres godt stilt av'],
  usesWord: ['Bruker ordet', 'Brukes i'],
  challengesWord: ['Utfordrer ordet', 'Utfordres av'],
  exampleOf: ['Eksempel på', 'Eksempler og bilder'],
  behind: ['Står bak', 'Fra'],
  answers: ['Svarer på', 'Svar og forsøk på svar'],
  partOf: ['Del av', 'Deler'],
  leadsTo: ['Leder til', 'Følger av'],
  relatedTo: ['Henger sammen med', 'Henger sammen med'],
  qualifies: ['Nyanserer', 'Nyanseres av'],
  influenced: ['Påvirket', 'Påvirket av'],
};
const PRED_ORDER = ['partOf', 'answers', 'supports', 'contradicts', 'qualifies', 'presupposes', 'dissolves', 'makesWellPosed', 'leadsTo', 'challengesWord', 'usesWord', 'exampleOf', 'influenced', 'relatedTo', 'behind'];
// Derived links. The keys are also the property names in the RDF export.
const DPRED = {
  challengesDerived: ['Utfordrer', 'Utfordres av'],
  strengthensDerived: ['Styrker', 'Styrkes av'],
  sharesPremiseWith: ['Deler forutsetning med', 'Deler forutsetning med'],
  mayDissolveDerived: ['Kan oppløse', 'Kan oppløses av'],
  qualifiesDerived: ['Nyanserer', 'Nyanseres av'],
};
const ADDABLE = ['supports', 'contradicts', 'presupposes', 'dissolves', 'makesWellPosed', 'answers', 'leadsTo', 'qualifies', 'challengesWord', 'usesWord', 'exampleOf', 'influenced', 'relatedTo', 'behind', 'partOf'];
const SIZE = { question: 240, position: 140, thinker: 52, finding: 118, word: 150, image: 160, insight: 168 };
let RX = 680, RY = 500;
const CORE_POS = { happened: [-125, -82], pattern: [125, -82], inside: [125, 88], place: [-125, 88] };

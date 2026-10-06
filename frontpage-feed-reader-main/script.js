// ---------- Sample data (replace with sample-feeds.json / a real RSS proxy later) ----------
const CATS = {
  'Frontend': '#2563eb', 'Design': '#ec4899', 'Backend & DevOps': '#f59e0b',
  'General Tech': '#6366f1', 'AI & ML': '#a855f7',
};
const TAGS = { 'Frontend': ['#e0ecff', '#1d4ed8'], 'Design': ['#fde7f1', '#be185d'], 'Backend & DevOps': ['#fef3c7', '#92400e'], 'General Tech': ['#e0e7ff', '#4338ca'], 'AI & ML': ['#f3e8ff', '#7e22ce'] };

const FEEDS = [
  { id: 'css', name: 'CSS-Tricks', cat: 'Frontend', c: '#e5532d', url: 'https://css-tricks.com' },
  { id: 'smash', name: 'Smashing Magazine', cat: 'Frontend', c: '#d33a2c', url: 'https://www.smashingmagazine.com' },
  { id: 'josh', name: 'Josh Comeau', cat: 'Frontend', c: '#4f46e5', url: 'https://www.joshwcomeau.com' },
  { id: 'side', name: 'Sidebar.io', cat: 'Design', c: '#a855f7', url: 'https://sidebar.io' },
  { id: 'nn', name: 'NN Group', cat: 'Design', c: '#059669', url: 'https://www.nngroup.com/articles' },
  { id: 'cf', name: 'Cloudflare Blog', cat: 'Backend & DevOps', c: '#f97316', url: 'https://blog.cloudflare.com' },
  { id: 'ars', name: 'Ars Technica', cat: 'General Tech', c: '#ea580c', url: 'https://arstechnica.com' },
  { id: 'simon', name: 'Simon Willison', cat: 'AI & ML', c: '#111827', url: 'https://simonwillison.net' },
];

const ARTICLES = [
  { id: 1, f: 'smash', h: 2, tag: 'Design', t: 'Practical Guide To Designing For Colorblind Users', s: 'Color blindness affects roughly 8% of men and 0.5% of women worldwide. Yet most interfaces rely heavily on color to convey meaning, status, and hierarchy.' },
  { id: 2, f: 'cf', h: 3, t: 'How We Reduced P99 Latency by 60% with Edge-First Caching', s: 'Our engineering team spent the last quarter rethinking how we cache at the edge. The result: dramatically lower tail latency for our most demanding customers.' },
  { id: 3, f: 'simon', h: 4, t: 'Building Effective RAG Systems: What Actually Works in Production', s: "After months of experimenting with retrieval-augmented generation, here's what I've learned about chunking strategies and embedding models." },
  { id: 4, f: 'josh', h: 5, t: 'The Surprising Truth About CSS Container Queries', s: 'Container queries have been available for a while now, but most developers are still using them like media queries with a different name.' },
  { id: 5, f: 'css', h: 7, t: 'A Complete Guide to CSS Grid Subgrid', s: 'Subgrid finally lets nested grids line up with their parent tracks. Here are the patterns that make it worth learning.' },
  { id: 6, f: 'nn', h: 9, t: 'Why Users Skim: Designing For Scannable Content', s: 'Eye-tracking studies confirm that people read in F-shaped patterns. Headings, spacing and lists decide whether your content gets read at all.' },
  { id: 7, f: 'side', h: 14, t: 'Ten Design Systems Worth Studying This Year', s: 'A curated look at design systems with great documentation, token structure and accessibility practices.' },
  { id: 8, f: 'ars', h: 20, t: 'The Quiet Rise of Local-First Software', s: 'Apps that work offline and sync later are moving from niche to mainstream. What changed, and what still hurts.' },
  { id: 9, f: 'smash', h: 30, t: 'Accessible Forms: Patterns That Actually Help', s: 'Labels, error messages and focus order: small decisions that decide whether a form is usable with a keyboard or screen reader.' },
  { id: 10, f: 'cf', h: 52, t: 'Understanding HTTP/3 and QUIC in Practice', s: 'A look at what moving from TCP to QUIC changes for connection setup, loss recovery and mobile networks.' },
];

// ---------- State ----------
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const state = {
  read: new Set(load('fp-read', [])),
  saved: new Set(load('fp-saved', [])),
  layout: load('fp-layout', 'list'),
  filter: { type: 'all' }, // all | saved | cat | feed
  sort: 'new', q: '', view: 'feed',
};
const persist = () => {
  localStorage.setItem('fp-read', JSON.stringify([...state.read]));
  localStorage.setItem('fp-saved', JSON.stringify([...state.saved]));
  localStorage.setItem('fp-layout', JSON.stringify(state.layout));
};

const $ = (s) => document.querySelector(s);
const feedOf = (id) => FEEDS.find((f) => f.id === id);
const catOf = (a) => feedOf(a.f).cat;
const ago = (h) => (h < 24 ? h + 'h ago' : Math.floor(h / 24) + 'd ago');
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const unread = (list) => list.filter((a) => !state.read.has(a.id)).length;

function visible() {
  let list = ARTICLES.filter((a) => {
    const { type, value } = state.filter;
    if (type === 'saved') return state.saved.has(a.id);
    if (type === 'cat') return catOf(a) === value;
    if (type === 'feed') return a.f === value;
    return true;
  });
  if (state.q) {
    const q = state.q.toLowerCase();
    list = list.filter((a) => (a.t + a.s + feedOf(a.f).name).toLowerCase().includes(q));
  }
  if (state.view === 'digest') {
    const seen = {};
    list = list.filter((a) => !state.read.has(a.id) && (seen[catOf(a)] = (seen[catOf(a)] || 0) + 1) <= 2);
  }
  return list.sort((a, b) => (state.sort === 'new' ? a.h - b.h : b.h - a.h));
}

// ---------- Render ----------
function renderSidebar() {
  const f = state.filter;
  const on = (t, v) => (f.type === t && f.value === v ? ' is-active' : '');
  let html = `<button class="side-item${f.type === 'all' ? ' is-active' : ''}" data-t="all">All Items <span class="n">${unread(ARTICLES)}</span></button>
    <button class="side-item${f.type === 'saved' ? ' is-active' : ''}" data-t="saved">Saved <span class="n">${state.saved.size}</span></button>
    <p class="side-label">Categories</p>`;
  for (const [cat, color] of Object.entries(CATS)) {
    const inCat = ARTICLES.filter((a) => catOf(a) === cat);
    html += `<button class="side-item${on('cat', cat)}" data-t="cat" data-v="${esc(cat)}"><span class="dot" style="background:${color}"></span>${esc(cat)} <span class="n">${unread(inCat)}</span></button>`;
    for (const fd of FEEDS.filter((x) => x.cat === cat)) {
      html += `<button class="side-item side-item--feed${on('feed', fd.id)}" data-t="feed" data-v="${fd.id}"><span class="fav" style="background:${fd.c}">${fd.name[0]}</span>${esc(fd.name)} <span class="n">${unread(ARTICLES.filter((a) => a.f === fd.id))}</span></button>`;
    }
  }
  $('#sidebar').innerHTML = html;
}

function renderList() {
  const list = visible();
  const f = state.filter;
  $('#title').firstChild.textContent =
    state.view === 'digest' ? 'Digest ' : f.type === 'saved' ? 'Saved ' : f.type === 'cat' ? f.value + ' ' : f.type === 'feed' ? feedOf(f.value).name + ' ' : 'All Items ';
  $('#count').textContent = unread(list) + ' unread';

  const el = $('#list');
  el.className = 'list ' + state.layout;
  if (state.view === 'discover') {
    el.innerHTML = '<p class="empty">Discover is coming soon: suggested feeds will appear here.</p>';
    return;
  }
  if (!list.length) {
    el.innerHTML = `<p class="empty">${state.q ? 'No articles match your search.' : 'Nothing here yet.'}</p>`;
    return;
  }
  el.innerHTML = '<p class="group">Today</p>' + list.map((a) => {
    const fd = feedOf(a.f), tag = a.tag || fd.cat, [bg, fg] = TAGS[tag];
    return `<article class="item${state.read.has(a.id) ? ' is-read' : ''}" data-id="${a.id}">
      <div class="item__meta"><span class="fav" style="background:${fd.c}">${fd.name[0]}</span><b>${esc(fd.name)}</b> · ${ago(a.h)}</div>
      <a class="item__title" href="${fd.url}" target="_blank" rel="noopener">${esc(a.t)}</a>
      <p class="item__sum">${esc(a.s)}</p>
      <div class="item__foot"><span class="tag" style="background:${bg};color:${fg}">${esc(tag)}</span>
        <button class="save${state.saved.has(a.id) ? ' is-on' : ''}" aria-label="Bookmark" aria-pressed="${state.saved.has(a.id)}">${state.saved.has(a.id) ? '★' : '☆'}</button></div>
    </article>`;
  }).join('');
}

const render = () => { renderSidebar(); renderList(); persist(); };

// ---------- Events ----------
$('#sidebar').addEventListener('click', (e) => {
  const b = e.target.closest('.side-item');
  if (!b) return;
  state.filter = { type: b.dataset.t, value: b.dataset.v };
  render();
});

$('#list').addEventListener('click', (e) => {
  const item = e.target.closest('.item');
  if (!item) return;
  const id = Number(item.dataset.id);
  if (e.target.closest('.save')) state.saved.has(id) ? state.saved.delete(id) : state.saved.add(id);
  else if (e.target.closest('.item__title')) state.read.add(id);
  else return;
  render();
});

document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  state.view = t.dataset.view;
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('is-active', x === t));
  render();
}));

document.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => {
  state.layout = b.dataset.layout;
  syncLayout();
  render();
}));
function syncLayout() {
  document.querySelectorAll('[data-layout]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.layout === state.layout));
}

$('#sort').addEventListener('click', () => {
  state.sort = state.sort === 'new' ? 'old' : 'new';
  $('#sort').textContent = state.sort === 'new' ? 'Newest' : 'Oldest';
  renderList();
});
$('#mark-all').addEventListener('click', () => { visible().forEach((a) => state.read.add(a.id)); render(); });
$('#refresh').addEventListener('click', () => {
  const b = $('#banner');
  b.textContent = 'Feeds are up to date. (Demo data: connect a real RSS source to fetch new items.)';
  b.hidden = false;
  setTimeout(() => (b.hidden = true), 3000);
});
$('#add-feed').addEventListener('click', () => alert('Adding feeds needs a backend or RSS proxy. See the README notes.'));

$('#search').addEventListener('input', (e) => { state.q = e.target.value.trim(); renderList(); });
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); $('#search').focus(); }
});

syncLayout();
render();
// Neon Coast Cover Studio — the editor page, rebuilt for round 3.
// Wires the controls to the cover engine: photo slots, layouts, grades,
// lettering, title styles, decor stamps, per-panel crop, undo/redo, export.
// A `?shot=` query instead sets up a fixed scene for a screenshot (shots.js).
import { drawCover, defaultState, panelsForLayout, layoutGeometry, stampAt, LAYOUTS, GRADES, SIZES, TITLE_STYLES, STAMPS } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const statusLine = $('status');

const state = defaultState();
state.panels = panelsForLayout(state.layout, []);

let selectedPanel = 0;
let selectedStamp = -1;
const past = [];
const future = [];

// ---- history ------------------------------------------------------------

// Only the editable bits are snapshotted — photos hold Image objects.
function takeSnapshot() {
  return JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    badge: state.badge,
    stars: state.stars,
    titleStyle: state.titleStyle,
    stamps: state.stamps,
    panels: state.panels,
  });
}

function pushHistory() {
  past.push(takeSnapshot());
  if (past.length > 60) past.shift();
  future.length = 0;
  refreshHistoryButtons();
}

function applySnapshot(json) {
  const s = JSON.parse(json);
  state.layout = s.layout;
  state.grade = s.grade;
  state.title = s.title;
  state.subtitle = s.subtitle;
  state.badge = s.badge;
  state.stars = s.stars;
  state.titleStyle = s.titleStyle || 'sunset';
  state.stamps = s.stamps || [];
  state.panels = s.panels;
  selectedStamp = -1;
  syncAll();
  repaint();
}

function refreshHistoryButtons() {
  $('undo').disabled = past.length === 0;
  $('redo').disabled = future.length === 0;
}

// ---- painting -----------------------------------------------------------

function repaint() {
  const size = SIZES.find((entry) => entry.id === state.size) ?? SIZES[0];
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, state);
  syncPanelControls();
}

// ---- control sync -------------------------------------------------------

function markOn(container, attr, value) {
  container.querySelectorAll(`[data-${attr}]`).forEach((el) => {
    el.classList.toggle('on', el.dataset[attr] === String(value));
  });
}

function syncAll() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('badge').value = state.badge;
  markOn($('layouts'), 'layout', state.layout);
  markOn($('grades'), 'grade', state.grade);
  markOn($('sizes'), 'size', state.size);
  markOn($('titleStyles'), 'titleStyle', state.titleStyle);
  document.querySelectorAll('[data-stars]').forEach((el) => {
    el.classList.toggle('on', Number(el.dataset.stars) === state.stars);
  });
  syncStampControls();
}

function syncStampControls() {
  const st = state.stamps[selectedStamp];
  $('stampLabel').textContent = st
    ? `${STAMPS.find((entry) => entry.id === st.type)?.name ?? 'Stamp'} ${selectedStamp + 1} of ${state.stamps.length} — drag it on the cover to move it.`
    : state.stamps.length
      ? `${state.stamps.length} stamp${state.stamps.length === 1 ? '' : 's'} on the cover — click one to edit it.`
      : 'No stamp selected';
  $('stampSize').value = st ? st.size : 0.16;
  $('stampRot').value = st ? st.rot : 0;
  $('removeStamp').disabled = !st;
}

function syncPanelControls() {
  const panel = state.panels[selectedPanel];
  if (!panel) return;
  $('panelLabel').textContent = `Panel ${selectedPanel + 1} of ${state.panels.length}`;
  $('zoom').value = panel.zoom;
  $('panX').value = panel.panX;
  $('panY').value = panel.panY;
  const sel = $('panelPhoto');
  sel.innerHTML = state.photos
    .map((p, i) => `<option value="${i}" ${i === panel.photo ? 'selected' : ''}>${p.name}</option>`)
    .join('');
}

// ---- state changes ------------------------------------------------------

function pickLayout(id) {
  if (id === state.layout) return;
  pushHistory();
  state.layout = id;
  state.panels = panelsForLayout(id, state.panels);
  selectedPanel = 0;
  syncAll();
  repaint();
}

function pickGrade(id) {
  if (id === state.grade) return;
  pushHistory();
  state.grade = id;
  syncAll();
  repaint();
}

function pickTitleStyle(id) {
  if (id === state.titleStyle) return;
  pushHistory();
  state.titleStyle = id;
  syncAll();
  repaint();
}

function pickSize(id) {
  state.size = id;
  syncAll();
  repaint();
  statusLine.textContent = `Preview ${id.replace('x', ' × ')} — export writes a full-size PNG.`;
}

function dropStamp(type) {
  pushHistory();
  state.stamps.push({
    type,
    x: 0.18 + Math.random() * 0.64,
    y: 0.18 + Math.random() * 0.3,
    size: 0.16,
    rot: Math.floor(Math.random() * 17) - 8,
  });
  selectedStamp = state.stamps.length - 1;
  syncAll();
  repaint();
  statusLine.textContent = 'Stamp added — drag it on the cover to place it.';
}

function removeStamp() {
  if (selectedStamp < 0) return;
  pushHistory();
  state.stamps.splice(selectedStamp, 1);
  selectedStamp = -1;
  syncAll();
  repaint();
}

// ---- photos -------------------------------------------------------------

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function keepPhoto(img, name) {
  if (state.photos.length >= 4) state.photos.shift();
  state.photos.push({ img, name });
}

async function loadSamples() {
  const names = ['convertible', 'rooftop', 'boulevard', 'pier'];
  for (const name of names) {
    try {
      const img = await loadImage(`samples/${name}.jpg`);
      if (!state.photos.some((p) => p.name === name)) state.photos.push({ img, name });
    } catch {
      // A missing sample just skips; the rest still load.
    }
  }
  state.panels = panelsForLayout(
    state.layout,
    state.panels.map((p, i) => ({ ...p, photo: i % Math.max(1, state.photos.length) })),
  );
  repaint();
}

// ---- building the controls ----------------------------------------------

// A chip button with a bold name line and a small description line.
function makeChip(label, sub, dataset, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  Object.entries(dataset).forEach(([key, value]) => {
    b.dataset[key] = value;
  });
  b.innerHTML = `<b>${label}</b><span>${sub}</span>`;
  b.addEventListener('click', onClick);
  return b;
}

LAYOUTS.forEach((entry) => {
  $('layouts').appendChild(
    makeChip(entry.name, `${entry.blurb} · ${entry.panels} panels`, { layout: entry.id }, () => pickLayout(entry.id)),
  );
});

GRADES.forEach((entry) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.grade = entry.id;
  b.className = 'swatch';
  b.style.background = `linear-gradient(135deg, ${entry.sky[0]}, ${entry.sky[1]} 55%, ${entry.sky[2]})`;
  b.title = entry.name;
  b.textContent = entry.name;
  b.addEventListener('click', () => pickGrade(entry.id));
  $('grades').appendChild(b);
});

TITLE_STYLES.forEach((entry) => {
  $('titleStyles').appendChild(
    makeChip(entry.name, entry.blurb, { titleStyle: entry.id }, () => pickTitleStyle(entry.id)),
  );
});

STAMPS.forEach((entry) => {
  const b = makeChip(entry.name, entry.blurb, { stamp: entry.id }, () => dropStamp(entry.id));
  b.classList.add('stamp');
  b.innerHTML = `<span class="glyph">${entry.glyph}</span><b>${entry.name}</b><span>${entry.blurb}</span>`;
  $('stamps').appendChild(b);
});

SIZES.forEach((entry) => {
  const sub = entry.id === '1080x1080' ? 'Square post' : entry.id === '1080x1350' ? 'Portrait post' : 'Wide post';
  $('sizes').appendChild(
    makeChip(`${entry.w} × ${entry.h}`, sub, { size: entry.id }, () => pickSize(entry.id)),
  );
});

[1, 2, 3, 4, 5].forEach((n) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.stars = n;
  b.className = 'chip star';
  b.textContent = '★'.repeat(n);
  b.addEventListener('click', () => {
    pushHistory();
    state.stars = n;
    syncAll();
    repaint();
  });
  $('stars').appendChild(b);
});

// ---- wiring the inputs --------------------------------------------------

$('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  repaint();
});
$('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  repaint();
});
$('badge').addEventListener('input', (e) => {
  state.badge = e.target.value;
  repaint();
});
['title', 'subtitle', 'badge'].forEach((id) => {
  $(id).addEventListener('change', pushHistory);
});

$('stampSize').addEventListener('input', (e) => {
  const st = state.stamps[selectedStamp];
  if (!st) return;
  st.size = Number(e.target.value);
  repaint();
});
$('stampRot').addEventListener('input', (e) => {
  const st = state.stamps[selectedStamp];
  if (!st) return;
  st.rot = Number(e.target.value);
  repaint();
});
$('stampSize').addEventListener('change', pushHistory);
$('stampRot').addEventListener('change', pushHistory);
$('removeStamp').addEventListener('click', removeStamp);

$('photos').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const img = await loadImage(URL.createObjectURL(file));
    keepPhoto(img, file.name.replace(/\.[^.]+$/, '').slice(0, 14) || 'photo');
  }
  repaint();
  statusLine.textContent = `${state.photos.length} photo${state.photos.length === 1 ? '' : 's'} loaded — click a panel, then drag it to crop.`;
});
$('loadSamples').addEventListener('click', async () => {
  await loadSamples();
  statusLine.textContent = '4 sample photos loaded — one per panel. Swap any panel below.';
});

$('panelPhoto').addEventListener('change', (e) => {
  pushHistory();
  state.panels[selectedPanel].photo = Number(e.target.value);
  repaint();
});
$('zoom').addEventListener('input', (e) => {
  state.panels[selectedPanel].zoom = Number(e.target.value);
  repaint();
});
$('panX').addEventListener('input', (e) => {
  state.panels[selectedPanel].panX = Number(e.target.value);
  repaint();
});
$('panY').addEventListener('input', (e) => {
  state.panels[selectedPanel].panY = Number(e.target.value);
  repaint();
});
['zoom', 'panX', 'panY'].forEach((id) => {
  $(id).addEventListener('change', pushHistory);
});
$('resetCrop').addEventListener('click', () => {
  pushHistory();
  const panel = state.panels[selectedPanel];
  panel.zoom = 1;
  panel.panX = 0;
  panel.panY = 0;
  repaint();
});

$('undo').addEventListener('click', () => {
  if (!past.length) return;
  future.push(takeSnapshot());
  applySnapshot(past.pop());
  refreshHistoryButtons();
});
$('redo').addEventListener('click', () => {
  if (!future.length) return;
  past.push(takeSnapshot());
  applySnapshot(future.pop());
  refreshHistoryButtons();
});

$('surprise').addEventListener('click', () => {
  pushHistory();
  state.layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)].id;
  state.grade = GRADES[Math.floor(Math.random() * GRADES.length)].id;
  state.titleStyle = TITLE_STYLES[Math.floor(Math.random() * TITLE_STYLES.length)].id;
  state.panels = panelsForLayout(state.layout, state.panels);
  state.panels.forEach((p) => {
    p.photo = Math.floor(Math.random() * Math.max(1, state.photos.length));
    p.zoom = 1 + Math.random() * 0.4;
    p.panX = (Math.random() - 0.5) * 0.8;
    p.panY = (Math.random() - 0.5) * 0.8;
  });
  selectedPanel = 0;
  syncAll();
  repaint();
  statusLine.textContent = 'Surprise layout — tweak it, then export.';
});

// ---- dragging on the canvas ---------------------------------------------

// One drag at a time: either a stamp (move it) or a panel (pan its photo).
let drag = null;

function toCanvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * canvas.width) / r.width,
    y: ((e.clientY - r.top) * canvas.height) / r.height,
  };
}

canvas.addEventListener('pointerdown', (e) => {
  const pt = toCanvasPoint(e);
  const hitStamp = stampAt(state, pt.x, pt.y, canvas.width, canvas.height);
  if (hitStamp >= 0) {
    selectedStamp = hitStamp;
    const st = state.stamps[hitStamp];
    drag = { kind: 'stamp', x: pt.x, y: pt.y, sx: st.x, sy: st.y };
    canvas.setPointerCapture(e.pointerId);
    syncStampControls();
    return;
  }
  selectedStamp = -1;
  syncStampControls();
  const geo = layoutGeometry(state.layout, canvas.width, canvas.height);
  const hitPanel = geo.panels.findIndex(
    (p) => pt.x >= p.x && pt.x <= p.x + p.w && pt.y >= p.y && pt.y <= p.y + p.h,
  );
  if (hitPanel >= 0) {
    selectedPanel = hitPanel;
    const panel = state.panels[hitPanel];
    drag = { kind: 'panel', x: pt.x, y: pt.y, panX: panel.panX, panY: panel.panY };
    canvas.setPointerCapture(e.pointerId);
    syncPanelControls();
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const pt = toCanvasPoint(e);
  if (drag.kind === 'stamp') {
    const st = state.stamps[selectedStamp];
    st.x = Math.max(0.03, Math.min(0.97, drag.sx + (pt.x - drag.x) / canvas.width));
    st.y = Math.max(0.03, Math.min(0.97, drag.sy + (pt.y - drag.y) / canvas.height));
  } else {
    const panel = state.panels[selectedPanel];
    panel.panX = Math.max(-1, Math.min(1, drag.panX + (pt.x - drag.x) / (canvas.width * 0.28)));
    panel.panY = Math.max(-1, Math.min(1, drag.panY + (pt.y - drag.y) / (canvas.height * 0.28)));
  }
  repaint();
});

canvas.addEventListener('pointerup', () => {
  if (drag) {
    pushHistory();
    drag = null;
  }
});

// ---- export ---------------------------------------------------------------

function exportPNG(sizeId) {
  const size = SIZES.find((entry) => entry.id === sizeId) ?? SIZES[0];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state);
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${size.id}.png`;
    a.click();
    statusLine.textContent = `Saved neon-coast-cover-${size.id}.png (${size.w} × ${size.h}).`;
  }, 'image/png');
}

$('export').addEventListener('click', () => exportPNG(state.size));
$('exportAll').addEventListener('click', () => {
  SIZES.forEach((entry, i) => setTimeout(() => exportPNG(entry.id), i * 400));
  statusLine.textContent = 'Exporting all three sizes…';
});

// ---- boot -----------------------------------------------------------------

async function boot() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px Pacifico'),
      document.fonts.load('bold 40px "Bebas Neue"'),
      document.fonts.ready,
    ]);
  } catch {
    // Lettering falls back to system fonts when the vendored ones fail.
  }
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot) {
    await runShot(shot, params, state, {
      loadImage,
      redraw: repaint,
      setLayout: pickLayout,
      setGrade: pickGrade,
    });
  } else {
    await loadSamples();
    syncAll();
    repaint();
  }
}

refreshHistoryButtons();
boot();

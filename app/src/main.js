// Neon Coast Cover Studio — wires the editor page: photo slots, layouts,
// grades, caption, per-panel crop and zoom, undo/redo, PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, defaultState, panelsForLayout, layoutGeometry, LAYOUTS, GRADES, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();
state.panels = panelsForLayout(state.layout, []);
let selected = 0;
let undoStack = [];
let redoStack = [];

const $ = (id) => document.getElementById(id);

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function snapshot() {
  return JSON.stringify({ layout: state.layout, grade: state.grade, title: state.title, subtitle: state.subtitle, badge: state.badge, stars: state.stars, panels: state.panels, photoIdx: state.photos.map((p) => p.name) });
}

function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  syncUndoButtons();
}

function restore(json) {
  const s = JSON.parse(json);
  state.layout = s.layout; state.grade = s.grade; state.title = s.title;
  state.subtitle = s.subtitle; state.badge = s.badge; state.stars = s.stars;
  state.panels = s.panels;
  syncControls();
  redraw();
}

function syncUndoButtons() {
  $('undo').disabled = undoStack.length === 0;
  $('redo').disabled = redoStack.length === 0;
}

function applySizeToCanvas() {
  const size = SIZES.find((s) => s.id === state.size) ?? SIZES[0];
  canvas.width = size.w; canvas.height = size.h;
}

function redraw() {
  applySizeToCanvas();
  drawCover(canvas, state);
  syncPanelControls();
}

function syncControls() {
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('badge').value = state.badge;
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('on', b.dataset.size === state.size));
  document.querySelectorAll('[data-stars]').forEach((b) => b.classList.toggle('on', Number(b.dataset.stars) === state.stars));
}

function syncPanelControls() {
  const panel = state.panels[selected];
  if (!panel) return;
  $('panelLabel').textContent = `Panel ${selected + 1} of ${state.panels.length}`;
  $('zoom').value = panel.zoom;
  $('panX').value = panel.panX;
  $('panY').value = panel.panY;
  const sel = $('panelPhoto');
  sel.innerHTML = state.photos.map((p, i) => `<option value="${i}" ${i === panel.photo ? 'selected' : ''}>${p.name}</option>`).join('');
  document.querySelectorAll('.slot').forEach((el, i) => el.classList.toggle('on', state.photos[i] && state.photos[i].img === state.photos[panel.photo]?.img));
}

function setLayout(id) {
  if (id === state.layout) return;
  pushUndo();
  state.layout = id;
  state.panels = panelsForLayout(id, state.panels);
  selected = 0;
  syncControls(); redraw();
}

function setGrade(id) {
  if (id === state.grade) return;
  pushUndo();
  state.grade = id;
  syncControls(); redraw();
}

function setSize(id) {
  state.size = id;
  syncControls(); redraw();
  status.textContent = `Preview ${id.replace('x', ' × ')} — export writes a full-size PNG.`;
}

async function addPhoto(img, name) {
  if (state.photos.length >= 4) state.photos.shift();
  state.photos.push({ img, name });
  if (state.photos.length === 1) {
    state.panels = panelsForLayout(state.layout, state.panels.map((p) => ({ ...p, photo: 0 })));
  }
  redraw();
}

async function loadSamples() {
  const names = ['convertible', 'rooftop', 'boulevard', 'pier'];
  for (const name of names) {
    try {
      const img = await loadImage(`samples/${name}.jpg`);
      if (!state.photos.some((p) => p.name === name)) state.photos.push({ img, name });
    } catch { /* a missing sample just skips */ }
  }
  state.panels = panelsForLayout(state.layout, state.panels.map((p, i) => ({ ...p, photo: i % state.photos.length })));
  redraw();
}

// ---- Controls ----
const layoutBox = $('layouts');
LAYOUTS.forEach((l) => {
  const b = document.createElement('button');
  b.type = 'button'; b.dataset.layout = l.id; b.className = 'chip';
  b.innerHTML = `<b>${l.name}</b><span>${l.blurb} · ${l.panels} panels</span>`;
  b.addEventListener('click', () => setLayout(l.id));
  layoutBox.appendChild(b);
});

const gradeBox = $('grades');
GRADES.forEach((g) => {
  const b = document.createElement('button');
  b.type = 'button'; b.dataset.grade = g.id; b.className = 'swatch';
  b.style.background = `linear-gradient(135deg, ${g.sky[0]}, ${g.sky[1]} 55%, ${g.sky[2]})`;
  b.title = g.name; b.textContent = g.name;
  b.addEventListener('click', () => setGrade(g.id));
  gradeBox.appendChild(b);
});

const sizeBox = $('sizes');
SIZES.forEach((s) => {
  const b = document.createElement('button');
  b.type = 'button'; b.dataset.size = s.id; b.className = 'chip';
  b.innerHTML = `<b>${s.w} × ${s.h}</b><span>${s.id === '1080x1080' ? 'Square post' : s.id === '1080x1350' ? 'Portrait post' : 'Wide post'}</span>`;
  b.addEventListener('click', () => setSize(s.id));
  sizeBox.appendChild(b);
});

[1, 2, 3, 4, 5].forEach((n) => {
  const b = document.createElement('button');
  b.type = 'button'; b.dataset.stars = n; b.className = 'chip star';
  b.textContent = '★'.repeat(n);
  b.addEventListener('click', () => { pushUndo(); state.stars = n; syncControls(); redraw(); });
  $('stars').appendChild(b);
});

$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('badge').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
$('title').addEventListener('change', pushUndo);
$('subtitle').addEventListener('change', pushUndo);
$('badge').addEventListener('change', pushUndo);

$('photos').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const img = await loadImage(URL.createObjectURL(file));
    await addPhoto(img, file.name.replace(/\.[^.]+$/, '').slice(0, 14) || 'photo');
  }
  status.textContent = `${state.photos.length} photo${state.photos.length === 1 ? '' : 's'} loaded — click a panel, then drag it to crop.`;
});
$('loadSamples').addEventListener('click', async () => {
  await loadSamples();
  status.textContent = '4 sample photos loaded — one per panel. Swap any panel below.';
});
$('panelPhoto').addEventListener('change', (e) => {
  pushUndo();
  state.panels[selected].photo = Number(e.target.value);
  redraw();
});
$('zoom').addEventListener('input', (e) => { state.panels[selected].zoom = Number(e.target.value); redraw(); });
$('zoom').addEventListener('change', pushUndo);
$('panX').addEventListener('input', (e) => { state.panels[selected].panX = Number(e.target.value); redraw(); });
$('panY').addEventListener('input', (e) => { state.panels[selected].panY = Number(e.target.value); redraw(); });
$('panX').addEventListener('change', pushUndo);
$('panY').addEventListener('change', pushUndo);
$('resetCrop').addEventListener('click', () => {
  pushUndo();
  state.panels[selected].zoom = 1; state.panels[selected].panX = 0; state.panels[selected].panY = 0;
  redraw();
});

$('undo').addEventListener('click', () => {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncUndoButtons();
});
$('redo').addEventListener('click', () => {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncUndoButtons();
});

$('surprise').addEventListener('click', () => {
  pushUndo();
  state.layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)].id;
  state.grade = GRADES[Math.floor(Math.random() * GRADES.length)].id;
  state.panels = panelsForLayout(state.layout, state.panels);
  state.panels.forEach((p) => { p.photo = Math.floor(Math.random() * Math.max(1, state.photos.length)); p.zoom = 1 + Math.random() * 0.4; p.panX = (Math.random() - 0.5) * 0.8; p.panY = (Math.random() - 0.5) * 0.8; });
  selected = 0;
  syncControls(); redraw();
  status.textContent = 'Surprise layout — tweak it, then export.';
});

// Click a panel to select it; drag on the preview to pan its photo.
let dragging = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
}
canvas.addEventListener('pointerdown', (e) => {
  const pt = canvasPoint(e);
  const geo = layoutGeometry(state.layout, canvas.width, canvas.height);
  const hit = geo.panels.findIndex((p) => pt.x >= p.x && pt.x <= p.x + p.w && pt.y >= p.y && pt.y <= p.y + p.h);
  if (hit >= 0) {
    selected = hit;
    dragging = { x: pt.x, y: pt.y, panX: state.panels[hit].panX, panY: state.panels[hit].panY };
    canvas.setPointerCapture(e.pointerId);
    syncPanelControls();
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const pt = canvasPoint(e);
  const panel = state.panels[selected];
  panel.panX = Math.max(-1, Math.min(1, dragging.panX + (pt.x - dragging.x) / (canvas.width * 0.28)));
  panel.panY = Math.max(-1, Math.min(1, dragging.panY + (pt.y - dragging.y) / (canvas.height * 0.28)));
  redraw();
});
canvas.addEventListener('pointerup', () => { if (dragging) { pushUndo(); dragging = null; } });

// ---- Export ----
function exportPNG(sizeId) {
  const size = SIZES.find((s) => s.id === sizeId) ?? SIZES[0];
  const off = document.createElement('canvas');
  off.width = size.w; off.height = size.h;
  drawCover(off, state);
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${size.id}.png`;
    a.click();
    status.textContent = `Saved neon-coast-cover-${size.id}.png (${size.w} × ${size.h}).`;
  }, 'image/png');
}
$('export').addEventListener('click', () => exportPNG(state.size));
$('exportAll').addEventListener('click', () => {
  SIZES.forEach((s, i) => setTimeout(() => exportPNG(s.id), i * 400));
  status.textContent = 'Exporting all three sizes…';
});

// ---- Boot ----
async function boot() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px Pacifico'),
      document.fonts.load('bold 40px "Bebas Neue"'),
      document.fonts.ready,
    ]);
  } catch { /* lettering falls back to system fonts */ }
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), state, { loadImage, addPhoto, loadSamples, redraw, setLayout, setGrade });
  } else {
    await loadSamples();
    syncControls();
    redraw();
  }
}
syncUndoButtons();
boot();

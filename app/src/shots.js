// Fixed scenes for screenshots: ?shot=editor shows the page with sample
// photos loaded; ?shot=cover shows the cover alone, drawn by the app itself
// at the requested export size. window.__shotReady is set once painted.
import { panelsForLayout, SIZES } from './cover.js';

const SAMPLES = ['convertible', 'rooftop', 'boulevard', 'pier'];

// Stamps come in as `type:x,y,size,rot` joined by `|`. The colon split has
// to happen first — splitting on commas alone would swallow the type into
// the numbers and blow the stamp up to a giant size.
function parseStamps(raw) {
  if (!raw) return [];
  return raw
    .split('|')
    .map((part) => {
      const [type, rest = ''] = part.split(':');
      const [x, y, size, rot] = rest.split(',');
      return { type, x: Number(x), y: Number(y), size: Number(size), rot: Number(rot || 0) };
    })
    .filter((st) => st.type && Number.isFinite(st.x) && Number.isFinite(st.y) && Number.isFinite(st.size));
}

function num(query, key, fallback) {
  const raw = query.get(key);
  if (raw === null) return fallback;
  const v = Number(raw);
  return Number.isFinite(v) ? v : fallback;
}

export async function runShot(shot, query, state, helpers) {
  const { loadImage, redraw } = helpers;
  if (shot === 'cover') document.body.classList.add('shot-cover');

  // The four sample photos go into the four photo slots, in order.
  state.photos = [];
  for (const name of SAMPLES) {
    try {
      const img = await loadImage(`samples/${name}.jpg`);
      state.photos.push({ img, name });
    } catch {
      // A missing sample just skips; the scene still renders.
    }
  }

  // Scene choices from the query, with poster defaults.
  state.layout = query.get('layout') ?? 'loading';
  state.grade = query.get('grade') ?? 'sunset';
  state.title = query.get('title') ?? 'NEON COAST';
  state.subtitle = query.get('subtitle') ?? 'chasing the sunset';
  state.badge = query.get('badge') ?? 'PALM SHORES';
  state.stars = num(query, 'stars', 5);
  state.titleStyle = query.get('titlestyle') ?? 'sunset';
  state.stamps = parseStamps(query.get('stamps'));
  state.panels = panelsForLayout(state.layout, []);
  state.panels.forEach((p, i) => {
    p.photo = i % Math.max(1, state.photos.length);
    p.zoom = num(query, 'zoom', 1);
    p.panX = num(query, 'panx', 0);
    p.panY = num(query, 'pany', 0);
  });

  const sizeId = query.get('size') ?? '1080x1080';
  const size = SIZES.find((entry) => entry.id === sizeId) ?? SIZES[0];
  state.size = size.id;
  const canvas = document.getElementById('cover');
  canvas.width = size.w;
  canvas.height = size.h;

  // In editor shots the controls should mirror the scene being shown.
  if (shot === 'editor') {
    const mark = (attr, value) => {
      document.querySelectorAll(`[data-${attr}]`).forEach((b) => {
        b.classList.toggle('on', b.dataset[attr] === value);
      });
    };
    mark('layout', state.layout);
    mark('grade', state.grade);
    mark('title-style', state.titleStyle);
    mark('size', state.size);
    const titleInput = document.getElementById('title');
    if (titleInput) titleInput.value = state.title;
    const subInput = document.getElementById('subtitle');
    if (subInput) subInput.value = state.subtitle;
    const badgeInput = document.getElementById('badge');
    if (badgeInput) badgeInput.value = state.badge;
  }

  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px Pacifico'),
      document.fonts.load('bold 40px "Bebas Neue"'),
      document.fonts.ready,
    ]);
  } catch {
    // Fall back to system fonts when the vendored ones fail.
  }
  redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  // Two frames, not one: the first lets the canvas paint, the second lets
  // the browser finish compositing before the screenshot driver fires.
  window.__shotReady = true;
}

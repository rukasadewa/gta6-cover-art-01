// Fixed scenes for screenshots: ?shot=editor shows the page with sample
// photos loaded; ?shot=cover shows the cover alone, drawn by the app itself
// at the requested export size. window.__shotReady is set once painted.
import { panelsForLayout, SIZES } from './cover.js';

const SAMPLES = ['convertible', 'rooftop', 'boulevard', 'pier'];

export async function runShot(shot, query, state, helpers) {
  const { loadImage, redraw, setLayout, setGrade } = helpers;
  if (shot === 'cover') document.body.classList.add('shot-cover');

  // Load the four sample photos into the four photo slots.
  state.photos = [];
  for (const name of SAMPLES) {
    try {
      const img = await loadImage(`samples/${name}.jpg`);
      state.photos.push({ img, name });
    } catch { /* skip a missing sample */ }
  }

  // Scene choices from the query, with poster defaults.
  const layout = query.get('layout') ?? 'loading';
  const grade = query.get('grade') ?? 'sunset';
  state.title = query.get('title') ?? 'NEON COAST';
  state.subtitle = query.get('subtitle') ?? 'chasing the sunset';
  state.badge = query.get('badge') ?? 'PALM SHORES';
  state.stars = Number(query.get('stars') ?? 5);
  state.titleStyle = query.get('titlestyle') ?? 'sunset';
  // Stamps: type:x,y,size,rot | type:x,y,size,rot — coords are 0..1 of the cover.
  const stampsParam = query.get('stamps');
  state.stamps = stampsParam
    ? stampsParam.split('|').map((part) => {
      const [type, x, y, size, rot] = part.split(',');
      return { type, x: Number(x), y: Number(y), size: Number(size), rot: Number(rot || 0) };
    }).filter((s) => s.type && Number.isFinite(s.x) && Number.isFinite(s.y))
    : [];
  state.layout = layout;
  state.grade = grade;
  state.panels = panelsForLayout(layout, []);
  state.panels.forEach((p, i) => {
    p.photo = i % Math.max(1, state.photos.length);
    p.zoom = Number(query.get('zoom') ?? 1);
    p.panX = Number(query.get('panx') ?? 0);
    p.panY = Number(query.get('pany') ?? 0);
  });
  const sizeId = query.get('size') ?? '1080x1080';
  const size = SIZES.find((s) => s.id === sizeId) ?? SIZES[0];
  state.size = size.id;
  const canvas = document.getElementById('cover');
  canvas.width = size.w;
  canvas.height = size.h;

  // Keep the editor chrome visible in editor shots; hide it for covers.
  if (shot === 'editor') {
    document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('on', b.dataset.layout === state.layout));
    document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('on', b.dataset.grade === state.grade));
    document.querySelectorAll('[data-title-style]').forEach((b) => b.classList.toggle('on', b.dataset.titleStyle === state.titleStyle));
    document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('on', b.dataset.size === state.size));
    const t = document.getElementById('title'); if (t) t.value = state.title;
    const s = document.getElementById('subtitle'); if (s) s.value = state.subtitle;
    const bd = document.getElementById('badge'); if (bd) bd.value = state.badge;
  }
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px Pacifico'),
      document.fonts.load('bold 40px "Bebas Neue"'),
      document.fonts.ready,
    ]);
  } catch { /* fall back to system fonts */ }
  redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}

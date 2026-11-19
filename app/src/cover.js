// Neon Coast Cover Studio — cover engine, rebuilt for round 3.
// One canvas, one state object, no network: the app paints a poster-style
// cover from the user's photos — panels with their own crop, a sunset or
// neon grade, big Anton lettering, a script subtitle, a badge ribbon, a
// star meter, hand-drawn decor stamps, grain and a vignette. Nothing here
// copies Rockstar art, a Rockstar logo or a Rockstar font.

export const LAYOUTS = [
  { id: 'loading', name: 'Loading Screen', panels: 1, blurb: 'Full-bleed hero, title over the photo' },
  { id: 'vice-grid', name: 'Vice Grid', panels: 3, blurb: 'Hero plus two stacked' },
  { id: 'tilted', name: 'Tilted Snaps', panels: 3, blurb: 'Overlapping snapshots' },
  { id: 'hero-strip', name: 'Hero Strip', panels: 4, blurb: 'Full-bleed plus film strip' },
  { id: 'nine', name: 'Nine Panel', panels: 9, blurb: '3 x 3 poster grid' },
  { id: 'duo', name: 'Split Duo', panels: 2, blurb: 'Two tall halves' },
  { id: 'story', name: 'Story Stack', panels: 3, blurb: 'Tall hero plus a pair' },
];

export const GRADES = [
  { id: 'sunset', name: 'Vice Sunset', filter: 'saturate(1.35) contrast(1.08) sepia(0.18)', sky: ['#ff7a3d', '#ff2e88', '#7b2ff7'], title: ['#ffe259', '#ff7a3d', '#ff2e88'], accent: '#ff2e88', sub: '#7df9ff' },
  { id: 'neon', name: 'Neon Night', filter: 'saturate(1.55) contrast(1.18) hue-rotate(12deg)', sky: ['#00e5ff', '#ff2e88', '#2b1055'], title: ['#7df9ff', '#ff7ad9', '#b967ff'], accent: '#00e5ff', sub: '#ffe259' },
  { id: 'teal', name: 'Palm Teal', filter: 'saturate(1.25) contrast(1.1) hue-rotate(28deg)', sky: ['#2af598', '#08aeea', '#0b486b'], title: ['#d4ff4f', '#2af598', '#08aeea'], accent: '#2af598', sub: '#ff9a3d' },
  { id: 'haze', name: 'Heat Haze', filter: 'sepia(0.38) saturate(1.45) contrast(1.05) brightness(1.06)', sky: ['#f7971e', '#ff5e62', '#8e2de2'], title: ['#fff176', '#f7971e', '#ff5e62'], accent: '#f7971e', sub: '#ff5e62' },
  { id: 'noir', name: 'Noir Pop', filter: 'grayscale(1) contrast(1.28) brightness(1.04)', sky: ['#e8e8e8', '#9a9a9a', '#222222'], title: ['#ffffff', '#ffd319', '#ff2975'], accent: '#ffd319', sub: '#ff2975' },
];

export const SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: 'Square · 1080 x 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: 'Portrait · 1080 x 1350' },
  { id: '1920x1080', w: 1920, h: 1080, label: 'Wide · 1920 x 1080' },
];

// How the title itself is painted — same words, three finishes.
export const TITLE_STYLES = [
  { id: 'sunset', name: 'Sunset Gradient', blurb: 'Warm gradient fill' },
  { id: 'chrome', name: 'Chrome', blurb: 'Silver-blue metal' },
  { id: 'neon-outline', name: 'Neon Outline', blurb: 'Glowing outline only' },
];

// Decor stamps, all drawn by hand with canvas paths — no borrowed artwork.
export const STAMPS = [
  { id: 'sun', name: 'Sun', blurb: 'Setting sun', glyph: '☀' },
  { id: 'palm', name: 'Palm', blurb: 'Palm tree', glyph: '🌴' },
  { id: 'bolt', name: 'Bolt', blurb: 'Lightning', glyph: '⚡' },
  { id: 'star', name: 'Star', blurb: 'Sparkle star', glyph: '✦' },
];

// A blank cover: four photo slots, panels assigned round-robin by index.
export function defaultState() {
  return {
    layout: 'loading',
    grade: 'sunset',
    title: 'NEON COAST',
    subtitle: 'chasing the sunset',
    badge: 'PALM SHORES',
    stars: 5,
    titleStyle: 'sunset',
    stamps: [],
    size: '1080x1080',
    photos: [],
    panels: [],
  };
}

// Fit the panel list to a layout, carrying each panel's photo and crop over.
export function panelsForLayout(layout, previous) {
  const def = LAYOUTS.find((entry) => entry.id === layout) ?? LAYOUTS[0];
  const kept = Array.isArray(previous) ? previous : [];
  const rows = [];
  for (let i = 0; i < def.panels; i++) {
    const prior = kept[i] ?? kept[i % Math.max(1, kept.length)] ?? null;
    rows.push({
      photo: prior ? prior.photo : i % 4,
      zoom: prior ? prior.zoom : 1,
      panX: prior ? prior.panX : 0,
      panY: prior ? prior.panY : 0,
    });
  }
  return rows;
}

function box(x, y, w, h, rot = 0) {
  return { x, y, w, h, rot };
}

// One builder per layout. Each returns the title band plus its panels;
// `overlay` means the band is painted on top of the photo, not below it.
const GEOMETRY = {
  loading(w, h) {
    const bandTop = Math.round(h * 0.6);
    return { band: box(0, bandTop, w, h - bandTop), overlay: true, panels: [box(0, 0, w, h)] };
  },
  'vice-grid'(w, h) {
    const gap = Math.round(w * 0.018);
    const bandH = Math.round(h * 0.3);
    const top = h - bandH;
    const heroW = Math.round(w * 0.62);
    const sideW = w - heroW - gap * 2;
    const sideH = Math.round((top - gap * 3) / 2);
    return {
      band: box(0, top, w, bandH),
      panels: [
        box(gap, gap, heroW, top - gap * 2),
        box(gap * 2 + heroW, gap, sideW, sideH),
        box(gap * 2 + heroW, gap * 2 + sideH, sideW, sideH),
      ],
    };
  },
  tilted(w, h) {
    const bandH = Math.round(h * 0.3);
    const top = h - bandH;
    const pw = w * 0.46;
    const ph = top * 0.82;
    return {
      band: box(0, top, w, bandH),
      panels: [
        box(w * 0.04, top * 0.06, pw, ph, -6),
        box(w * 0.3, top * 0.1, pw, ph, 3),
        box(w * 0.56, top * 0.05, pw * 0.82, ph, -2),
      ],
    };
  },
  'hero-strip'(w, h) {
    const gap = Math.round(w * 0.018);
    const bandH = Math.round(h * 0.3);
    const top = h - bandH;
    const stripH = Math.round(top * 0.24);
    const sw = (w - gap * 4) / 3;
    return {
      band: box(0, top, w, bandH),
      panels: [
        box(0, 0, w, top - stripH - gap),
        box(gap, top - stripH, sw, stripH),
        box(gap * 2 + sw, top - stripH, sw, stripH),
        box(gap * 3 + sw * 2, top - stripH, sw, stripH),
      ],
    };
  },
  nine(w, h) {
    const gap = Math.round(w * 0.018);
    const bandH = Math.round(h * 0.3);
    const top = h - bandH;
    const cw = (w - gap * 4) / 3;
    const ch = (top - gap * 4) / 3;
    const panels = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        panels.push(box(gap + c * (cw + gap), gap + r * (ch + gap), cw, ch));
      }
    }
    return { band: box(0, top, w, bandH), panels };
  },
  duo(w, h) {
    const gap = Math.round(w * 0.018);
    const bandH = Math.round(h * 0.3);
    const top = h - bandH;
    const hw = (w - gap * 3) / 2;
    return {
      band: box(0, top, w, bandH),
      panels: [box(gap, gap, hw, top - gap * 2), box(gap * 2 + hw, gap, hw, top - gap * 2)],
    };
  },
  story(w, h) {
    const gap = Math.round(w * 0.018);
    const bandH = Math.round(h * 0.3);
    const top = h - bandH;
    const rw = w * 0.36;
    const rh = (top - gap * 3) / 2;
    return {
      band: box(0, top, w, bandH),
      panels: [
        box(gap, gap, w - rw - gap * 2, top - gap * 2),
        box(w - rw - gap, gap, rw, rh),
        box(w - rw - gap, gap * 2 + rh, rw, rh),
      ],
    };
  },
};

export function layoutGeometry(layout, w, h) {
  const build = GEOMETRY[layout] ?? GEOMETRY['vice-grid'];
  return build(w, h);
}

// ---- small painters -------------------------------------------------------

let grainTile = null;

// A 128px tile of grey static, built once and tiled over the cover.
function grain(ctx) {
  if (grainTile) return grainTile;
  grainTile = document.createElement('canvas');
  grainTile.width = 128;
  grainTile.height = 128;
  const g = grainTile.getContext('2d');
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 28;
  }
  g.putImageData(img, 0, 0);
  return grainTile;
}

// Shrink the font until the text fits the width, then return the size used.
function fitSize(ctx, text, maxW, start, family) {
  let size = start;
  ctx.font = `${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

// Cover-fit one photo into a rectangle, honouring its zoom and pan.
function paintPhoto(ctx, img, rect, panel, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!img) {
    const empty = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    empty.addColorStop(0, '#3b1d5a');
    empty.addColorStop(1, '#12081f');
    ctx.fillStyle = empty;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `bold ${Math.round(rect.w * 0.07)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.restore();
    return;
  }
  const zoom = panel.zoom || 1;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const ox = rect.x + (rect.w - pw) / 2 + (panel.panX || 0) * rect.w * 0.28;
  const oy = rect.y + (rect.h - ph) / 2 + (panel.panY || 0) * rect.h * 0.28;
  ctx.filter = grade.filter;
  ctx.drawImage(img, ox, oy, pw, ph);
  ctx.filter = 'none';
  ctx.restore();
}

// A warm pink wash over the bottom of each photo, for the sunset feel.
function paintWash(ctx, rect) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  const wash = ctx.createLinearGradient(rect.x, rect.y + rect.h * 0.4, rect.x, rect.y + rect.h);
  wash.addColorStop(0, 'rgba(255,46,136,0)');
  wash.addColorStop(1, 'rgba(255,46,136,0.28)');
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

// A palm silhouette: one curved trunk, six drooping fronds.
function paintPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = s * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.55, x + s * 0.05, y - s * 0.95);
  ctx.stroke();
  const topX = x + s * 0.05;
  const topY = y - s * 0.95;
  for (let i = 0; i < 6; i++) {
    const a = (-160 + i * 52) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * s * 0.45, topY + Math.sin(a) * s * 0.45 - s * 0.12,
      topX + Math.cos(a) * s * 0.62, topY + Math.sin(a) * s * 0.62 + s * 0.28,
    );
    ctx.stroke();
  }
  ctx.restore();
}

// A five-pointed star, alternating long and short spikes.
function paintStar(ctx, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// The three title finishes. Each gets the same x/y baseline to share.
const TITLE_PAINT = {
  sunset(ctx, title, size, band, grade) {
    const grad = ctx.createLinearGradient(0, band.y + band.h * 0.3, 0, band.y + band.h * 0.86);
    grad.addColorStop(0, grade.title[0]);
    grad.addColorStop(0.55, grade.title[1]);
    grad.addColorStop(1, grade.title[2]);
    ctx.strokeStyle = '#14081f';
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.strokeText(title, band.x + band.w * 0.05, band.y + band.h * 0.72);
    ctx.fillStyle = grad;
    ctx.fillText(title, band.x + band.w * 0.05, band.y + band.h * 0.72);
  },
  chrome(ctx, title, size, band) {
    const metal = ctx.createLinearGradient(0, band.y + band.h * 0.28, 0, band.y + band.h * 0.8);
    metal.addColorStop(0, '#f8f9ff');
    metal.addColorStop(0.35, '#c3cede');
    metal.addColorStop(0.55, '#7f93b8');
    metal.addColorStop(0.75, '#e8eefc');
    metal.addColorStop(1, '#5d7290');
    ctx.strokeStyle = '#101828';
    ctx.lineWidth = Math.max(3, size * 0.07);
    ctx.strokeText(title, band.x + band.w * 0.05, band.y + band.h * 0.72);
    ctx.fillStyle = metal;
    ctx.fillText(title, band.x + band.w * 0.05, band.y + band.h * 0.72);
  },
  'neon-outline'(ctx, title, size, band, grade) {
    ctx.strokeStyle = grade.sub;
    ctx.shadowColor = grade.sub;
    ctx.shadowBlur = size * 0.22;
    ctx.lineWidth = Math.max(2, size * 0.045);
    ctx.strokeText(title, band.x + band.w * 0.05, band.y + band.h * 0.72);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, size * 0.02);
    ctx.strokeText(title, band.x + band.w * 0.05, band.y + band.h * 0.72);
  },
};

// One decor stamp, drawn at relative cover coords (0..1), rotated in place.
function paintStamp(ctx, st, w, h) {
  const cx = st.x * w;
  const cy = st.y * h;
  const s = st.size * w;
  const ink = '#14081f';
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(((st.rot || 0) * Math.PI) / 180);
  ctx.lineJoin = 'round';
  if (st.type === 'sun') {
    ctx.strokeStyle = '#ffd319';
    ctx.lineWidth = s * 0.07;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * s * 0.36, Math.sin(a) * s * 0.36);
      ctx.lineTo(Math.cos(a) * s * 0.58, Math.sin(a) * s * 0.58);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffd319';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = s * 0.045;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2);
    ctx.stroke();
  } else if (st.type === 'palm') {
    ctx.shadowColor = 'rgba(20,8,31,0.8)';
    ctx.shadowBlur = s * 0.06;
    paintPalm(ctx, 0, s * 0.45, s * 0.9, '#2af598');
    ctx.shadowBlur = 0;
  } else if (st.type === 'bolt') {
    ctx.beginPath();
    ctx.moveTo(s * 0.12, -s * 0.55);
    ctx.lineTo(s * 0.52, -s * 0.55);
    ctx.lineTo(s * 0.08, s * 0.02);
    ctx.lineTo(s * 0.38, s * 0.02);
    ctx.lineTo(-s * 0.28, s * 0.55);
    ctx.lineTo(-s * 0.06, -s * 0.06);
    ctx.lineTo(-s * 0.36, -s * 0.06);
    ctx.closePath();
    ctx.fillStyle = '#ffe259';
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = s * 0.045;
    ctx.stroke();
  } else {
    // Sparkle: four curved points, white fill with a cyan glow.
    ctx.shadowColor = '#7df9ff';
    ctx.shadowBlur = s * 0.18;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.55);
    ctx.quadraticCurveTo(s * 0.08, -s * 0.08, s * 0.55, 0);
    ctx.quadraticCurveTo(s * 0.08, s * 0.08, 0, s * 0.55);
    ctx.quadraticCurveTo(-s * 0.08, s * 0.08, -s * 0.55, 0);
    ctx.quadraticCurveTo(-s * 0.08, -s * 0.08, 0, -s * 0.55);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = ink;
    ctx.lineWidth = s * 0.04;
    ctx.stroke();
  }
  ctx.restore();
}

// Index of the topmost stamp under a canvas point, or -1 when none is hit.
export function stampAt(state, x, y, w, h) {
  const stamps = state.stamps || [];
  for (let i = stamps.length - 1; i >= 0; i--) {
    const st = stamps[i];
    const dx = x - st.x * w;
    const dy = y - st.y * h;
    if (Math.hypot(dx, dy) <= st.size * w * 0.55) return i;
  }
  return -1;
}

// ---- the cover itself -----------------------------------------------------

// Paints the whole cover for `state` onto `canvas` (canvas size = export size).
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES.find((entry) => entry.id === state.grade) ?? GRADES[0];
  const geo = layoutGeometry(state.layout, w, h);
  const overlay = !!geo.overlay;
  const band = geo.band;

  // Sky gradient the poster sits on, plus a soft sun disc up top.
  const sky = ctx.createLinearGradient(0, 0, w, h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const sunR = w * 0.2;
  const sun = ctx.createRadialGradient(w * 0.82, h * 0.16, sunR * 0.1, w * 0.82, h * 0.16, sunR);
  sun.addColorStop(0, 'rgba(255,240,170,0.95)');
  sun.addColorStop(0.6, 'rgba(255,150,80,0.75)');
  sun.addColorStop(1, 'rgba(255,150,80,0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(w * 0.82, h * 0.16, sunR, 0, Math.PI * 2);
  ctx.fill();

  // Photo panels: white frame, the photo, a pink wash, an ink edge.
  geo.panels.forEach((rect, i) => {
    const panel = state.panels[i] ?? { photo: i % 4, zoom: 1, panX: 0, panY: 0 };
    const img = state.photos[panel.photo]?.img ?? null;
    const frame = w * 0.006;
    if (rect.rot) {
      // Tilted snapshot: a polaroid-style card, rotated, with a drop shadow.
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((rect.rot * Math.PI) / 180);
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = w * 0.03;
      ctx.shadowOffsetY = w * 0.012;
      ctx.fillStyle = '#fdf6ec';
      ctx.fillRect(-rect.w / 2 - w * 0.012, -rect.h / 2 - w * 0.012, rect.w + w * 0.024, rect.h + w * 0.024);
      ctx.restore();
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((rect.rot * Math.PI) / 180);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      paintPhoto(ctx, img, { x: 0, y: 0, w: rect.w, h: rect.h }, panel, grade);
      ctx.restore();
    } else if (overlay) {
      // Loading Screen: the hero photo runs edge to edge, no frame at all.
      paintPhoto(ctx, img, rect, panel, grade);
    } else {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = w * 0.012;
      ctx.shadowOffsetY = w * 0.006;
      ctx.fillStyle = '#fdf6ec';
      ctx.fillRect(rect.x - frame, rect.y - frame, rect.w + frame * 2, rect.h + frame * 2);
      ctx.restore();
      paintPhoto(ctx, img, rect, panel, grade);
      ctx.strokeStyle = 'rgba(20,8,32,0.85)';
      ctx.lineWidth = Math.max(2, w * 0.004);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
    paintWash(ctx, rect);
  });

  // Title band: a dark ink slab with halftone dots and palm silhouettes —
  // or, on the Loading Screen, a sunset scrim over the photo itself.
  if (overlay) {
    const scrim = ctx.createLinearGradient(0, band.y - band.h * 0.55, 0, band.y + band.h);
    scrim.addColorStop(0, 'rgba(20,8,31,0)');
    scrim.addColorStop(0.45, 'rgba(20,8,31,0.55)');
    scrim.addColorStop(1, 'rgba(20,8,31,0.88)');
    ctx.fillStyle = scrim;
    ctx.fillRect(band.x, band.y - band.h * 0.55, band.w, band.h * 1.55);
  } else {
    ctx.fillStyle = '#14081f';
    ctx.fillRect(band.x, band.y - w * 0.008, band.w, band.h + w * 0.008);
    const bandGrad = ctx.createLinearGradient(band.x, band.y, band.x, band.y + band.h);
    bandGrad.addColorStop(0, 'rgba(255,46,136,0.22)');
    bandGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bandGrad;
    ctx.fillRect(band.x, band.y, band.w, band.h);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    const dotGap = Math.max(14, w * 0.02);
    for (let dx = band.x + dotGap; dx < band.x + band.w; dx += dotGap) {
      for (let dy = band.y + dotGap * 0.7; dy < band.y + band.h * 0.32; dy += dotGap) {
        ctx.beginPath();
        ctx.arc(dx, dy, Math.max(1.5, w * 0.0022), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    paintPalm(ctx, band.x + band.w * 0.93, band.y + band.h * 0.92, band.h * 0.85, 'rgba(0,0,0,0.5)');
    paintPalm(ctx, band.x + band.w * 0.86, band.y + band.h * 0.96, band.h * 0.6, 'rgba(0,0,0,0.45)');
  }

  // Badge ribbon, tilted a little, at the top of the band.
  const badgeText = (state.badge || 'PALM SHORES').toUpperCase();
  ctx.save();
  ctx.translate(band.x + band.w * 0.055, band.y + band.h * 0.2);
  ctx.rotate((-3 * Math.PI) / 180);
  ctx.font = `bold ${Math.round(band.h * 0.13)}px "Bebas Neue", sans-serif`;
  const badgeW = ctx.measureText(`★ ${badgeText} ★`).width + band.h * 0.28;
  ctx.fillStyle = grade.accent;
  ctx.fillRect(-band.h * 0.14, -band.h * 0.16, badgeW, band.h * 0.3);
  ctx.fillStyle = '#14081f';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`★ ${badgeText} ★`, 0, -band.h * 0.01);
  ctx.restore();

  // The title itself, in the style the user picked.
  const title = (state.title || 'NEON COAST').toUpperCase();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  const titleSize = fitSize(ctx, title, band.w * 0.88, band.h * 0.44, 'Anton, sans-serif');
  ctx.font = `${titleSize}px Anton, sans-serif`;
  const painter = TITLE_PAINT[state.titleStyle || 'sunset'] ?? TITLE_PAINT.sunset;
  painter(ctx, title, titleSize, band, grade);

  // Script subtitle with a neon glow, bottom-left of the band.
  const sub = state.subtitle || '';
  if (sub) {
    const subSize = fitSize(ctx, sub, band.w * 0.6, band.h * 0.17, 'Pacifico, cursive');
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = grade.sub;
    ctx.shadowColor = grade.sub;
    ctx.shadowBlur = band.h * 0.12;
    ctx.fillText(sub, band.x + band.w * 0.055, band.y + band.h * 0.88);
    ctx.shadowBlur = 0;
  }

  // Star heat meter, bottom-right of the band.
  const starR = band.h * 0.075;
  const starX0 = band.x + band.w * 0.97 - 5 * starR * 2.4;
  for (let s = 0; s < 5; s++) {
    paintStar(ctx, starX0 + s * starR * 2.4, band.y + band.h * 0.9, starR, s < state.stars ? '#ffd319' : 'rgba(255,255,255,0.22)');
  }

  // Decor stamps the user dropped on the cover, above everything else.
  (state.stamps || []).forEach((st) => paintStamp(ctx, st, w, h));

  // Grain and a vignette over the whole thing, then a thin white frame.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = ctx.createPattern(grain(ctx), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,2,18,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(3, w * 0.006);
  ctx.strokeRect(w * 0.008, w * 0.008, w - w * 0.016, h - w * 0.016);
}

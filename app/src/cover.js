// Neon Coast Cover Studio — the cover engine.
// Draws a GTA-poster-style multi-panel cover on any canvas: photo panels with
// per-panel crop and zoom, a Vice City sunset / neon colour grade, a halftone
// title block in Anton with a Pacifico script subtitle, a badge ribbon, a star
// heat meter, film grain and a vignette. Everything here is drawn by hand on
// a 2D canvas — no Rockstar artwork, logo or font is used anywhere.

export const LAYOUTS = [
  { id: 'vice-grid', name: 'Vice Grid', panels: 3, blurb: 'Hero + two stacked' },
  { id: 'tilted', name: 'Tilted Snaps', panels: 3, blurb: 'Overlapping snapshots' },
  { id: 'hero-strip', name: 'Hero Strip', panels: 4, blurb: 'Full-bleed + film strip' },
  { id: 'nine', name: 'Nine Panel', panels: 9, blurb: '3 x 3 poster grid' },
  { id: 'duo', name: 'Split Duo', panels: 2, blurb: 'Two tall halves' },
  { id: 'story', name: 'Story Stack', panels: 3, blurb: 'Tall hero + pair' },
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

/** A fresh cover state: four photo slots, panels assigned round-robin. */
export function defaultState() {
  return {
    layout: 'vice-grid',
    grade: 'sunset',
    title: 'NEON COAST',
    subtitle: 'chasing the sunset',
    badge: 'PALM SHORES',
    stars: 5,
    size: '1080x1080',
    photos: [],
    panels: [],
  };
}

/** Rebuilds the panel list for a layout, keeping each photo assignment. */
export function panelsForLayout(layout, previous) {
  const def = LAYOUTS.find((l) => l.id === layout) ?? LAYOUTS[0];
  const out = [];
  for (let i = 0; i < def.panels; i++) {
    const old = previous[i] ?? previous[i % Math.max(1, previous.length)] ?? null;
    out.push({
      photo: old ? old.photo : i % 4,
      zoom: old ? old.zoom : 1,
      panX: old ? old.panX : 0,
      panY: old ? old.panY : 0,
    });
  }
  return out;
}

/** Panel rectangles for a layout, in canvas pixels. Title band is separate. */
export function layoutGeometry(layout, w, h) {
  const g = Math.round(w * 0.018);
  const bandH = Math.round(h * 0.3);
  const top = h - bandH;
  const P = (x, y, pw, ph, rot = 0) => ({ x, y, w: pw, h: ph, rot });
  switch (layout) {
    case 'tilted': {
      const pw = w * 0.46, ph = top * 0.82;
      return {
        band: { x: 0, y: top, w, h: bandH },
        panels: [
          P(w * 0.04, top * 0.06, pw, ph, -6),
          P(w * 0.3, top * 0.1, pw, ph, 3),
          P(w * 0.56, top * 0.05, pw * 0.82, ph, -2),
        ],
      };
    }
    case 'hero-strip': {
      const stripH = Math.round(top * 0.24);
      const sw = (w - g * 4) / 3;
      return {
        band: { x: 0, y: top, w, h: bandH },
        panels: [
          P(0, 0, w, top - stripH - g),
          P(g, top - stripH, sw, stripH),
          P(g * 2 + sw, top - stripH, sw, stripH),
          P(g * 3 + sw * 2, top - stripH, sw, stripH),
        ],
      };
    }
    case 'nine': {
      const cw = (w - g * 4) / 3, ch = (top - g * 4) / 3;
      const panels = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        panels.push(P(g + c * (cw + g), g + r * (ch + g), cw, ch));
      }
      return { band: { x: 0, y: top, w, h: bandH }, panels };
    }
    case 'duo': {
      const hw = (w - g * 3) / 2;
      return {
        band: { x: 0, y: top, w, h: bandH },
        panels: [P(g, g, hw, top - g * 2), P(g * 2 + hw, g, hw, top - g * 2)],
      };
    }
    case 'story': {
      const rw = w * 0.36, rh = (top - g * 3) / 2;
      return {
        band: { x: 0, y: top, w, h: bandH },
        panels: [
          P(g, g, w - rw - g * 2, top - g * 2),
          P(w - rw - g, g, rw, rh),
          P(w - rw - g, g * 2 + rh, rw, rh),
        ],
      };
    }
    case 'vice-grid':
    default: {
      const heroW = Math.round(w * 0.62), sideW = w - heroW - g * 2;
      const sideH = Math.round((top - g * 3) / 2);
      return {
        band: { x: 0, y: top, w, h: bandH },
        panels: [
          P(g, g, heroW, top - g * 2),
          P(g * 2 + heroW, g, sideW, sideH),
          P(g * 2 + heroW, g * 2 + sideH, sideW, sideH),
        ],
      };
    }
  }
}

let noiseCanvas = null;
function grainPattern(ctx) {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 128; noiseCanvas.height = 128;
  const n = noiseCanvas.getContext('2d');
  const img = n.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 28;
  }
  n.putImageData(img, 0, 0);
  return noiseCanvas;
}

function drawPhotoInto(ctx, img, rect, panel, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!img) {
    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    grad.addColorStop(0, '#3b1d5a'); grad.addColorStop(1, '#12081f');
    ctx.fillStyle = grad; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `bold ${Math.round(rect.w * 0.07)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.restore();
    return;
  }
  const zoom = panel.zoom || 1;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale, ph = img.naturalHeight * scale;
  const ox = rect.x + (rect.w - pw) / 2 + (panel.panX || 0) * rect.w * 0.28;
  const oy = rect.y + (rect.h - ph) / 2 + (panel.panY || 0) * rect.h * 0.28;
  ctx.filter = grade.filter;
  ctx.drawImage(img, ox, oy, pw, ph);
  ctx.filter = 'none';
  ctx.restore();
}

function gradeWash(ctx, rect, grade, w, h) {
  ctx.save();
  ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
  const wash = ctx.createLinearGradient(rect.x, rect.y + rect.h * 0.4, rect.x, rect.y + rect.h);
  wash.addColorStop(0, 'rgba(255,46,136,0)');
  wash.addColorStop(1, 'rgba(255,46,136,0.28)');
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = s * 0.09; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.55, x + s * 0.05, y - s * 0.95); ctx.stroke();
  const topX = x + s * 0.05, topY = y - s * 0.95;
  for (let i = 0; i < 6; i++) {
    const a = (-160 + i * 52) * Math.PI / 180;
    ctx.beginPath(); ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * s * 0.45, topY + Math.sin(a) * s * 0.45 - s * 0.12, topX + Math.cos(a) * s * 0.62, topY + Math.sin(a) * s * 0.62 + s * 0.28);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStar(ctx, x, y, r, color) {
  ctx.save(); ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function fitFont(ctx, text, maxWidth, startSize, family, weight = '') {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/** Draws the whole cover for `state` onto `canvas` (canvas size = export size). */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const grade = GRADES.find((g) => g.id === state.grade) ?? GRADES[0];
  const geo = layoutGeometry(state.layout, w, h);

  // Sky: the sunset gradient the whole poster sits on.
  const sky = ctx.createLinearGradient(0, 0, w, h);
  sky.addColorStop(0, grade.sky[0]); sky.addColorStop(0.55, grade.sky[1]); sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

  // Sun disc peeking behind the panels.
  const sunR = w * 0.2;
  const sun = ctx.createRadialGradient(w * 0.82, h * 0.16, sunR * 0.1, w * 0.82, h * 0.16, sunR);
  sun.addColorStop(0, 'rgba(255,240,170,0.95)'); sun.addColorStop(0.6, 'rgba(255,150,80,0.75)'); sun.addColorStop(1, 'rgba(255,150,80,0)');
  ctx.fillStyle = sun;
  ctx.beginPath(); ctx.arc(w * 0.82, h * 0.16, sunR, 0, Math.PI * 2); ctx.fill();

  // Photo panels, each with its own crop, grade wash and inked frame.
  geo.panels.forEach((rect, i) => {
    const panel = state.panels[i] ?? { photo: i % 4, zoom: 1, panX: 0, panY: 0 };
    const img = state.photos[panel.photo]?.img ?? null;
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot * Math.PI / 180);
      ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = w * 0.03; ctx.shadowOffsetY = w * 0.012;
      ctx.fillStyle = '#fdf6ec';
      ctx.fillRect(-rect.w / 2 - w * 0.012, -rect.h / 2 - w * 0.012, rect.w + w * 0.024, rect.h + w * 0.024);
      ctx.restore();
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot * Math.PI / 180);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      drawPhotoInto(ctx, img, { x: 0, y: 0, w: rect.w, h: rect.h }, panel, grade);
      ctx.restore();
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = w * 0.012; ctx.shadowOffsetY = w * 0.006;
      ctx.fillStyle = '#fdf6ec';
      ctx.fillRect(rect.x - w * 0.006, rect.y - w * 0.006, rect.w + w * 0.012, rect.h + w * 0.012);
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      drawPhotoInto(ctx, img, rect, panel, grade);
      ctx.strokeStyle = 'rgba(20,8,32,0.85)'; ctx.lineWidth = Math.max(2, w * 0.004);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
    gradeWash(ctx, rect, grade, w, h);
  });

  // Title band: dark ink slab with halftone dots and palm silhouettes.
  const band = geo.band;
  ctx.fillStyle = '#14081f';
  ctx.fillRect(band.x, band.y - w * 0.008, band.w, band.h + w * 0.008);
  const bandGrad = ctx.createLinearGradient(band.x, band.y, band.x, band.y + band.h);
  bandGrad.addColorStop(0, 'rgba(255,46,136,0.22)'); bandGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bandGrad; ctx.fillRect(band.x, band.y, band.w, band.h);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  const dotGap = Math.max(14, w * 0.02);
  for (let dx = band.x + dotGap; dx < band.x + band.w; dx += dotGap) {
    for (let dy = band.y + dotGap * 0.7; dy < band.y + band.h * 0.32; dy += dotGap) {
      ctx.beginPath(); ctx.arc(dx, dy, Math.max(1.5, w * 0.0022), 0, Math.PI * 2); ctx.fill();
    }
  }
  drawPalm(ctx, band.x + band.w * 0.93, band.y + band.h * 0.92, band.h * 0.85, 'rgba(0,0,0,0.5)');
  drawPalm(ctx, band.x + band.w * 0.86, band.y + band.h * 0.96, band.h * 0.6, 'rgba(0,0,0,0.45)');

  // Badge ribbon, tilted, top of the band.
  const badgeText = (state.badge || 'PALM SHORES').toUpperCase();
  ctx.save();
  ctx.translate(band.x + band.w * 0.055, band.y + band.h * 0.2);
  ctx.rotate(-3 * Math.PI / 180);
  ctx.font = `bold ${Math.round(band.h * 0.13)}px "Bebas Neue", sans-serif`;
  const badgeW = ctx.measureText(`★ ${badgeText} ★`).width + band.h * 0.28;
  ctx.fillStyle = grade.accent;
  ctx.fillRect(-band.h * 0.14, -band.h * 0.16, badgeW, band.h * 0.3);
  ctx.fillStyle = '#14081f';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(`★ ${badgeText} ★`, 0, -band.h * 0.01);
  ctx.restore();

  // Title in Anton with a sunset gradient fill and ink outline.
  const title = (state.title || 'NEON COAST').toUpperCase();
  const titleSize = fitFont(ctx, title, band.w * 0.88, band.h * 0.44, 'Anton, sans-serif');
  const titleGrad = ctx.createLinearGradient(0, band.y + band.h * 0.3, 0, band.y + band.h * 0.86);
  titleGrad.addColorStop(0, grade.title[0]); titleGrad.addColorStop(0.55, grade.title[1]); titleGrad.addColorStop(1, grade.title[2]);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.font = `${titleSize}px Anton, sans-serif`;
  ctx.strokeStyle = '#14081f'; ctx.lineWidth = Math.max(3, titleSize * 0.09);
  ctx.strokeText(title, band.x + band.w * 0.05, band.y + band.h * 0.72);
  ctx.fillStyle = titleGrad;
  ctx.fillText(title, band.x + band.w * 0.05, band.y + band.h * 0.72);

  // Script subtitle with a neon glow, and the star heat meter.
  const sub = state.subtitle || '';
  if (sub) {
    const subSize = fitFont(ctx, sub, band.w * 0.6, band.h * 0.17, 'Pacifico, cursive');
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = grade.sub;
    ctx.shadowColor = grade.sub; ctx.shadowBlur = band.h * 0.12;
    ctx.fillText(sub, band.x + band.w * 0.055, band.y + band.h * 0.88);
    ctx.shadowBlur = 0;
  }
  const starR = band.h * 0.075;
  const starX0 = band.x + band.w * 0.97 - 5 * starR * 2.4;
  for (let s = 0; s < 5; s++) {
    drawStar(ctx, starX0 + s * starR * 2.4, band.y + band.h * 0.9, starR, s < state.stars ? '#ffd319' : 'rgba(255,255,255,0.22)');
  }

  // Grain + vignette over everything.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = ctx.createPattern(grainPattern(ctx), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(10,2,18,0.42)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(3, w * 0.006);
  ctx.strokeRect(w * 0.008, w * 0.008, w - w * 0.016, h - w * 0.016);
}

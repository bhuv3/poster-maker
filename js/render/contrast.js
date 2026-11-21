// Readable text: draws the art into a small hidden canvas, looks at what's behind each piece of text, and picks
// a color that stands out there: a palette color, else a darker or lighter shade of one. If nothing can, the art
// fades into the paper behind the text (or a box, or nothing, as chosen).
const Contrast = (() => {
  const PX = 0.7;        // canvas pixels per mm (coarse is plenty for judging color)
  const LARGE = 3;       // minimum contrast ratio for big text (WCAG large text)
  const SMALL = 4.5;     // minimum for the subtitle and small line
  const FADE = 0.88;     // how much paper the fade lays over the art

  // WCAG contrast ratio between two [r, g, b] colors (1 to 21).
  function ratio(a, b) {
    const la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function lum(c) {
    const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  // Text shapes recolored to read well over the art, plus anything placed behind them (fade or box).
  // fallback: 'fade' (default), 'paper' box, 'color' box, or 'none'.
  function fit(words, art, ctx, fallback) {
    const texts = words.filter(w => w.t === 'text');
    if (!texts.length) return words;
    const pal = ctx.palette;
    const canvas = raster(art.concat(words.filter(w => w.role === 'band')), ctx.L, pal.bg);
    const { plain, shades } = choices(pal);
    const behind = [];
    let titleColor = null;
    for (const role of ['title', 'subtitle', 'small']) {
      const items = texts.filter(w => (w.role || 'title') === role);
      if (!items.length) continue;
      const rects = items.map(textRect);
      let samples = rects.flatMap(r => sample(canvas, r, ctx.L));
      if (!samples.length) continue;
      const need = role === 'title' ? LARGE : SMALL;
      const fine = fineness(canvas, rects, ctx.L) > 0.3;
      let pick = choose(samples, need, titleColor ? [titleColor] : [], plain, shades, fine);
      if (!pick && fallback !== 'none') {
        const back = fallback === 'paper' || fallback === 'color' ? boxFor(rects, items[0].size, role, fallback, pal) : fadeFor(rects, items, ctx, behind.length);
        behind.push(...back.shapes);
        samples = back.under(samples);
        pick = choose(samples, need, titleColor ? [titleColor] : [], plain, shades, false);
      }
      if (!pick) pick = best(samples, plain);
      if (role === 'title') titleColor = pick;
      for (const w of items) w.s = { fill: pick.hex };
    }
    if (!behind.length) return words;
    const at = words.findIndex(w => w.t === 'text');
    return [...words.slice(0, at), ...behind, ...words.slice(at)];
  }

  // Colors to try: the palette's own, then shades of them from barely changed to strongly darker or lighter.
  function choices(pal) {
    const hexes = [...new Set([pal.ink, pal.bg, ...pal.colors])];
    const dark = Palettes.mix(pal.ink, '#000000', 0.5), light = Palettes.mix(pal.bg, '#ffffff', 0.6);
    const shades = [];
    for (const t of [0.25, 0.45, 0.65, 0.85]) for (const h of hexes) shades.push(Palettes.mix(h, dark, t), Palettes.mix(h, light, t));
    const rgb = h => ({ hex: h, rgb: Palettes.rgb(h) });
    return { plain: hexes.map(rgb), shades: shades.filter(h => !hexes.includes(h)).map(rgb) };
  }

  // A color that reads over these samples, or null. Text reads when at least 90% of the area behind it
  // contrasts (a big shape the same color as the text, even under a tenth of it, makes letters vanish).
  // Over a fine texture (thin lines, small dots) it's enough to contrast with the overall tone, since
  // the texture blurs together at reading distance. Big shapes don't blur, so they don't get that allowance.
  // Preferred colors (the title's, for smaller text) come first; then the palette by contrast; then the mildest shade.
  function choose(samples, need, preferred, plain, shades, fine) {
    const mean = samples.reduce((m, s) => [m[0] + s[0], m[1] + s[1], m[2] + s[2]], [0, 0, 0]).map(v => v / samples.length);
    const ok = c => {
      const r = samples.map(s => ratio(c.rgb, s)).sort((x, y) => x - y);
      const p10 = r[Math.floor(r.length * 0.1)], p50 = r[Math.floor(r.length * 0.5)];
      return p10 >= need || (fine && p50 >= need && ratio(c.rgb, mean) >= need);
    };
    const hit = preferred.find(ok);
    if (hit) return hit;
    const good = plain.filter(ok);
    if (good.length) return good.reduce((a, b) => (ratio(b.rgb, mean) > ratio(a.rgb, mean) ? b : a));
    return shades.find(ok) || null;
  }

  // The palette color with the most contrast against the overall tone (last resort).
  function best(samples, plain) {
    const mean = samples.reduce((m, s) => [m[0] + s[0], m[1] + s[1], m[2] + s[2]], [0, 0, 0]).map(v => v / samples.length);
    return plain.reduce((a, b) => (ratio(b.rgb, mean) > ratio(a.rgb, mean) ? b : a));
  }

  // A soft fade of paper color from the nearest page edge in to behind the text: the art dissolves where the
  // words sit. Returns the shapes and how it changes what's behind the text.
  function fadeFor(rects, items, ctx, n) {
    const f = ctx.full, pal = ctx.palette, size = items[0].size;
    const x0 = Math.min(...rects.map(r => r.x)), y0 = Math.min(...rects.map(r => r.y));
    const x1 = Math.max(...rects.map(r => r.x + r.w)), y1 = Math.max(...rects.map(r => r.y + r.h));
    const pad = size * 0.9 + 6 * ctx.unit, id = 'fade' + n, vertical = !!items[0].rot;
    let rect, dir, stops;
    if (vertical) {
      rect = { x: f.x, y: f.y, w: x1 + pad - f.x, h: f.h };
      dir = 'x1="1" y1="0" x2="0" y2="0"';
      stops = [[0, 0], [Math.min(0.6, pad / rect.w * 1.6), FADE], [1, FADE]];
    } else {
      const lower = (y0 + y1) / 2 > f.y + f.h / 2, middle = Math.abs((y0 + y1) / 2 - (f.y + f.h / 2)) < f.h * 0.12;
      if (middle) {
        rect = { x: f.x, y: y0 - pad, w: f.w, h: y1 - y0 + pad * 2 };
        dir = 'x1="0" y1="0" x2="0" y2="1"';
        const e = Math.min(0.45, pad / rect.h);
        stops = [[0, 0], [e, FADE], [1 - e, FADE], [1, 0]];
      } else if (lower) {
        rect = { x: f.x, y: y0 - pad, w: f.w, h: f.y + f.h - (y0 - pad) };
        dir = 'x1="0" y1="0" x2="0" y2="1"';
        stops = [[0, 0], [Math.min(0.6, pad / rect.h), FADE], [1, FADE]];
      } else {
        rect = { x: f.x, y: f.y, w: f.w, h: y1 + pad - f.y };
        dir = 'x1="0" y1="1" x2="0" y2="0"';
        stops = [[0, 0], [Math.min(0.6, pad / rect.h), FADE], [1, FADE]];
      }
    }
    const grad = stops.map(([o, a]) => `<stop offset="${Geom.num(o)}" stop-color="${pal.bg}" stop-opacity="${a}"/>`).join('');
    const bg = Palettes.rgb(pal.bg);
    return {
      shapes: [Shapes.def(`<linearGradient id="{id}${id}" ${dir}>${grad}</linearGradient>`),
        { ...Shapes.rect(rect.x, rect.y, rect.w, rect.h, { fill: `url(#{id}${id})` }), role: 'fade' }],
      under: samples => samples.map(s => s.map((v, i) => v + (bg[i] - v) * FADE)),
    };
  }

  // A box behind one piece of text. 'paper': the paper color. 'color': the palette color that pairs best.
  function boxFor(rects, size, role, fallback, pal) {
    const x0 = Math.min(...rects.map(r => r.x)), y0 = Math.min(...rects.map(r => r.y));
    const x1 = Math.max(...rects.map(r => r.x + r.w)), y1 = Math.max(...rects.map(r => r.y + r.h));
    const pad = size * (role === 'title' ? 0.22 : 0.45);
    const colors = [...new Set([pal.ink, pal.bg, ...pal.colors])];
    let back = pal.bg;
    if (fallback === 'color') {
      let top = -1;
      for (const b of colors) {
        if (b === pal.bg) continue;
        for (const fg of colors) { const r = ratio(Palettes.rgb(b), Palettes.rgb(fg)); if (fg !== b && r > top) { top = r; back = b; } }
      }
    }
    const rgb = Palettes.rgb(back);
    return {
      shapes: [{ ...Shapes.rect(x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + pad * 2 + size * 0.2, { fill: back }), role: 'textbox' }],
      under: samples => samples.map(() => rgb),
    };
  }

  // The rectangle a text shape covers (rotated text runs upward from its anchor).
  function textRect(w) {
    const len = TextLayer.measure(w.str, w.family, w.weight, w.tracking, w.italic) * w.size;
    const left = w.anchor === 'middle' ? -len / 2 : w.anchor === 'end' ? -len : 0;
    return w.rot ? { x: w.x - w.size * 0.72, y: w.y - len - left, w: w.size * 0.72, h: len }
      : { x: w.x + left, y: w.y - w.size * 0.72, w: len, h: w.size * 0.72 };
  }

  // How busy the art is behind the text: the share of neighboring pixels (about 1.4 mm apart) whose brightness
  // differs clearly. Fine lines and dots score high; big flat shapes score low.
  function fineness(canvas, rects, L) {
    const { data, w, h } = canvas;
    const bright = i => (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11) / 255;
    let edges = 0, total = 0;
    for (const r of rects) {
      const x0 = Math.max(0, Math.floor((r.x - L.sheet.x) * PX)), x1 = Math.min(w - 2, Math.ceil((r.x + r.w - L.sheet.x) * PX));
      const y0 = Math.max(0, Math.floor((r.y - L.sheet.y) * PX)), y1 = Math.min(h - 2, Math.ceil((r.y + r.h - L.sheet.y) * PX));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = (y * w + x) * 4;
        if (Math.abs(bright(i) - bright(i + 4)) > 0.12 || Math.abs(bright(i) - bright(i + w * 4)) > 0.12) edges++;
        total++;
      }
    }
    return total ? edges / total : 0;
  }

  // RGB colors of the canvas pixels inside a rectangle (mm).
  function sample(canvas, r, L) {
    const { data, w, h } = canvas, out = [];
    const x0 = Math.max(0, Math.floor((r.x - L.sheet.x) * PX)), x1 = Math.min(w - 1, Math.ceil((r.x + r.w - L.sheet.x) * PX));
    const y0 = Math.max(0, Math.floor((r.y - L.sheet.y) * PX)), y1 = Math.min(h - 1, Math.ceil((r.y + r.h - L.sheet.y) * PX));
    const step = Math.max(1, Math.floor(Math.sqrt((x1 - x0 + 1) * (y1 - y0 + 1) / 1500)));
    for (let y = y0; y <= y1; y += step) for (let x = x0; x <= x1; x += step) {
      const i = (y * w + x) * 4;
      out.push([data[i], data[i + 1], data[i + 2]]);
    }
    return out;
  }

  // Shapes drawn into a small canvas (filters skipped), returning its pixels.
  function raster(shapes, L, bg) {
    const w = Math.max(1, Math.ceil(L.sheet.w * PX)), h = Math.max(1, Math.ceil(L.sheet.h * PX));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.scale(PX, PX);
    g.translate(-L.sheet.x, -L.sheet.y);
    for (const sh of shapes) draw(g, sh);
    return { data: g.getImageData(0, 0, w, h).data, w, h };
  }

  // One shape onto the canvas.
  function draw(g, sh) {
    if (sh.t === 'def') return;
    const s = sh.s || {};
    g.save();
    if (s.opacity !== undefined) g.globalAlpha *= s.opacity;
    if (sh.t === 'group') {
      transform(g, sh.transform);
      sh.children.forEach(ch => draw(g, ch));
      g.restore();
      return;
    }
    if (sh.t === 'text') {
      g.font = `${sh.italic ? 'italic ' : ''}${sh.weight || 400} ${sh.size}px ${sh.family}`;
      g.textAlign = sh.anchor === 'middle' ? 'center' : sh.anchor === 'end' ? 'right' : 'left';
      g.translate(sh.x, sh.y);
      if (sh.rot) g.rotate(sh.rot * Math.PI / 180);
      if (s.fill && s.fill !== 'none') { g.fillStyle = s.fill; g.fillText(sh.str, 0, 0); }
      if (s.stroke) { g.strokeStyle = s.stroke; g.lineWidth = s.sw || 0.3; g.strokeText(sh.str, 0, 0); }
      g.restore();
      return;
    }
    const p = pathOf(sh);
    if (p && s.fill && s.fill !== 'none') { g.fillStyle = s.fill; g.fill(p, s.rule === 'evenodd' ? 'evenodd' : 'nonzero'); }
    if (p && s.stroke && s.stroke !== 'none') { g.strokeStyle = s.stroke; g.lineWidth = s.sw || 0.3; g.lineJoin = s.join || 'miter'; g.lineCap = s.cap || 'butt'; g.stroke(p); }
    g.restore();
  }

  // Path2D for a shape.
  function pathOf(sh) {
    if (sh.t === 'path') return new Path2D(sh.d);
    const p = new Path2D();
    if (sh.t === 'rect') p.rect(sh.x, sh.y, sh.w, sh.h);
    else if (sh.t === 'circle') p.arc(sh.cx, sh.cy, Math.max(0, sh.r), 0, Math.PI * 2);
    else if (sh.t === 'poly' && sh.pts.length) {
      p.moveTo(sh.pts[0][0], sh.pts[0][1]);
      for (let i = 1; i < sh.pts.length; i++) p.lineTo(sh.pts[i][0], sh.pts[i][1]);
      if (sh.closed) p.closePath();
    } else return null;
    return p;
  }

  // Applies an SVG transform list ("translate(x y) rotate(a cx cy) scale(s)") to the canvas.
  function transform(g, t) {
    const re = /(translate|rotate|scale)\(([^)]*)\)/g;
    let m;
    while ((m = re.exec(t || ''))) {
      const v = m[2].split(/[\s,]+/).filter(Boolean).map(Number);
      if (m[1] === 'translate') g.translate(v[0] || 0, v[1] || 0);
      else if (m[1] === 'scale') g.scale(v[0], v[1] === undefined ? v[0] : v[1]);
      else {
        const a = (v[0] || 0) * Math.PI / 180;
        if (v.length >= 3) { g.translate(v[1], v[2]); g.rotate(a); g.translate(-v[1], -v[2]); } else g.rotate(a);
      }
    }
  }

  return { fit, ratio };
})();

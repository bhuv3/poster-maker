// Halftone: a screen of dots whose size follows a picture (a sun, a gradient, noise, or the title), like old print.
(() => {
  Styles.register({
    id: 'halftone',
    name: 'Halftone',
    icon: 'halftone',
    animated: true,
    params: [
      { key: 'source', label: 'Picture', type: 'select', value: 'sun', options: [['sun', 'Big circle'], ['gradient', 'Gradient'], ['noise', 'Clouds'], ['rings', 'Ripples'], ['title', 'The title']] },
      { key: 'cell', label: 'Dot spacing', type: 'range', min: 1.5, max: 20, step: 0.5, value: 5 },
      { key: 'angle', label: 'Screen angle', type: 'range', min: 0, max: 90, step: 1, value: 15 },
      { key: 'shape', label: 'Dots', type: 'choice', value: 'circle', options: [['circle', 'Circles'], ['square', 'Squares'], ['line', 'Lines']] },
      { key: 'contrast', label: 'Contrast', type: 'range', min: 0.3, max: 3, step: 0.05, value: 1.2 },
      { key: 'duotone', label: 'Second color screen', type: 'check', value: true },
      { key: 'invert', label: 'Invert', type: 'check', value: false },
    ],

    // Halftoning the title makes it the art, so the text layer leaves the title out.
    ownsTitle: p => p.source === 'title',

    generate(rng, p, ctx) {
      const { palette, unit } = ctx;
      const accents = Palettes.visible(palette);
      const value = source(p, ctx, rng);
      const out = [screen(p, ctx, value, p.angle, accents[0], 1)];
      if (p.duotone && accents.length > 1) {
        const second = (x, y) => value(x + 7 * unit, y - 5 * unit) * 0.85;
        out.unshift(screen(p, ctx, second, p.angle + 30, accents[1], 0.9));
      }
      return out;
    },
  });

  // One screen of dots at an angle. value(x, y) is 0 (no dot) to 1 (full dot).
  function screen(p, ctx, value, angle, color, opacity) {
    const { full, unit, w, h } = ctx;
    const cell = Math.max(1.2, p.cell * unit / Math.sqrt(Math.max(0.3, ctx.quality)));
    const a = angle * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const cx = w / 2, cy = h / 2, R = Math.hypot(full.w, full.h) / 2;
    let d = '';
    const n = Geom.num;
    for (let v = -R; v <= R; v += cell) for (let u = -R; u <= R; u += cell) {
      const x = cx + u * ca - v * sa, y = cy + u * sa + v * ca;
      if (x < full.x - cell || y < full.y - cell || x > full.x + full.w + cell || y > full.y + full.h + cell) continue;
      let t = Math.max(0, Math.min(1, value(x, y)));
      t = Math.pow(t, 1 / p.contrast);
      if (p.invert) t = 1 - t;
      if (t < 0.04) continue;
      if (p.shape === 'square') {
        const s = cell * 0.95 * Math.sqrt(t);
        d += `M${n(x - s / 2)} ${n(y - s / 2)}h${n(s)}v${n(s)}h${n(-s)}Z`;
      } else if (p.shape === 'line') {
        const th = cell * 0.9 * t, dx = ca * cell / 2, dy = sa * cell / 2, ox = -sa * th / 2, oy = ca * th / 2;
        d += `M${n(x - dx + ox)} ${n(y - dy + oy)}L${n(x + dx + ox)} ${n(y + dy + oy)}L${n(x + dx - ox)} ${n(y + dy - oy)}L${n(x - dx - ox)} ${n(y - dy - oy)}Z`;
      } else {
        const r = cell * 0.56 * Math.sqrt(t);
        d += `M${n(x - r)} ${n(y)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0`;
      }
    }
    return Shapes.path(d, { fill: color, opacity, blend: opacity < 1 ? 'multiply' : undefined });
  }

  // The picture the dots follow, as value(x, y) from 0 to 1.
  function source(p, ctx, rng) {
    const { box, noise, time } = ctx;
    const cx = box.x + box.w * rng.range(0.35, 0.65), cy = box.y + box.h * rng.range(0.28, 0.5);
    const R = Math.min(box.w, box.h) * rng.range(0.32, 0.45);
    const phase = time * Math.PI * 2;
    if (p.source === 'sun') return (x, y) => 1 - Math.min(1, Math.hypot(x - cx, y - cy) / R) ** 3 * 0.9 - Math.max(0, (Math.hypot(x - cx, y - cy) - R) / (R * 0.4));
    if (p.source === 'gradient') {
      const a = rng.range(0, Math.PI * 2), ux = Math.cos(a), uy = Math.sin(a), half = Math.hypot(box.w, box.h) / 2;
      return (x, y) => 0.5 + ((x - box.x - box.w / 2) * ux + (y - box.y - box.h / 2) * uy) / (2 * half) * 1.4 + 0.08 * Math.sin(phase);
    }
    if (p.source === 'rings') return (x, y) => 0.5 + 0.5 * Math.sin(Math.hypot(x - cx, y - cy) / (R * 0.12) - phase);
    if (p.source === 'title') return titleValue(ctx);
    const f = 1 / (120 * ctx.unit);
    return ctx.animating
      ? (x, y) => 0.5 + noise.fbm3(x * f, y * f + Math.sin(phase) * 0.5, Math.cos(phase) * 0.5, 4) * 0.9
      : (x, y) => 0.5 + noise.fbm2(x * f, y * f, 4) * 0.9;
  }

  // The title drawn large and blurred in an offscreen canvas; dots grow where the letters are.
  function titleValue(ctx) {
    const b = ctx.box, font = TextLayer.fontFor(ctx.text, ctx.seeds);
    const lines = (ctx.text.title || 'POSTER').split('\n').filter(l => l.trim()).map(l => font.upper ? l.toUpperCase() : l);
    const px = 2, W = Math.ceil(b.w * px), H = Math.ceil(b.h * px);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const widest = Math.max(...lines.map(l => TextLayer.measure(l, font.family, font.weight, 0, font.italic)));
    const size = Math.min(W * 0.96 / widest, H * 0.96 / (lines.length * 0.95));
    g.filter = `blur(${Math.round(size * 0.04)}px)`;
    g.font = `${font.italic ? 'italic ' : ''}${font.weight} ${size}px ${font.family}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 0.95));
    const data = g.getImageData(0, 0, W, H).data;
    return (x, y) => {
      const ix = Math.round((x - b.x) * px), iy = Math.round((y - b.y) * px);
      return ix < 0 || iy < 0 || ix >= W || iy >= H ? 0 : data[(iy * W + ix) * 4 + 3] / 255;
    };
  }
})();

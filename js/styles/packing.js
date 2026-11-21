// Circle packing: circles from large to small, never touching, filling the page, a circle, a ring, or the title's letters.
(() => {
  const STEPS = 48;   // radius steps from biggest to smallest

  Styles.register({
    id: 'packing',
    name: 'Circle packing',
    icon: 'circles',
    params: [
      { key: 'count', label: 'Circles', type: 'range', min: 50, max: 5000, step: 50, value: 1400 },
      { key: 'maxR', label: 'Largest', type: 'range', min: 4, max: 120, step: 1, value: 42 },
      { key: 'minR', label: 'Smallest', type: 'range', min: 0.5, max: 12, step: 0.1, value: 1.2 },
      { key: 'gap', label: 'Gap', type: 'range', min: 0, max: 6, step: 0.1, value: 1 },
      { key: 'mask', label: 'Fill', type: 'select', value: 'page', options: [['page', 'The page'], ['circle', 'A big circle'], ['ring', 'A ring'], ['title', 'The title’s letters']] },
      { key: 'look', label: 'Look', type: 'choice', value: 'filled', options: [['filled', 'Filled'], ['outline', 'Outline'], ['rings', 'Rings'], ['mixed', 'Mixed']] },
      { key: 'colorBy', label: 'Color by', type: 'choice', value: 'random', options: [['random', 'Random'], ['size', 'Size'], ['ink', 'Ink only']] },
      { key: 'textRoom', label: 'Leave room for the title', type: 'check', value: true },
    ],

    // The title becomes the art when circles fill its letters, so the text layer leaves it out.
    ownsTitle: p => p.mask === 'title',

    generate(rng, p, ctx) {
      const { unit, palette } = ctx;
      const inside = maskFor(p, ctx);
      const maxR = p.maxR * unit, minR = Math.min(p.minR * unit, maxR), gap = p.gap * unit;
      const cellSize = Math.max(minR * 4, 2);
      const g = Sampling.grid(cellSize);
      const area = ctx.box, circles = [];
      const limit = Math.round(p.count * ctx.quality);
      for (let s = 0; s < STEPS && circles.length < limit; s++) {
        const r = maxR * Math.pow(minR / maxR, s / (STEPS - 1));
        const tries = Math.round((40 + s * 30) * Math.max(0.3, ctx.quality));
        for (let k = 0; k < tries && circles.length < limit; k++) {
          const x = area.x + rng.next() * area.w, y = area.y + rng.next() * area.h;
          if (!inside(x, y, r) || overlaps(g, x, y, r, gap, cellSize)) continue;
          const c = { x, y, r };
          circles.push(c);
          addToGrid(g, c, gap, cellSize);
        }
      }
      return circles.map(c => drawCircle(c, p, ctx, minR, maxR, rng));
    },
  });

  // A test inside(x, y, r): the whole circle fits in the chosen shape.
  function maskFor(p, ctx) {
    const b = ctx.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = Math.min(b.w, b.h) / 2;
    const inBox = (x, y, r) => x - r >= b.x && y - r >= b.y && x + r <= b.x + b.w && y + r <= b.y + b.h;
    if (p.mask === 'circle') return withText(p, ctx, (x, y, r) => Math.hypot(x - cx, y - cy) + r <= R);
    if (p.mask === 'ring') return withText(p, ctx, (x, y, r) => { const d = Math.hypot(x - cx, y - cy); return d + r <= R && d - r >= R * 0.48; });
    return withText(p, ctx, p.mask === 'title' ? titleMask(ctx, inBox) : inBox);
  }

  // Wraps a shape test so circles also stay off the title (when asked to).
  function withText(p, ctx, shape) {
    const t = p.textRoom && ctx.textBox;
    return t ? (x, y, r) => shape(x, y, r) && !(x + r > t.x && x - r < t.x + t.w && y + r > t.y && y - r < t.y + t.h) : shape;
  }

  // Draws the title big in an offscreen canvas and tests circles against its pixels.
  function titleMask(ctx, inBox) {
    const b = ctx.box, font = TextLayer.fontFor(ctx.text, ctx.seeds);
    const lines = (ctx.text.title || 'POSTER').split('\n').filter(l => l.trim()).map(l => font.upper ? l.toUpperCase() : l);
    const px = 3;                                  // canvas pixels per mm
    const W = Math.ceil(b.w * px), H = Math.ceil(b.h * px);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const widest = Math.max(...lines.map(l => TextLayer.measure(l, font.family, font.weight, 0, font.italic)));
    const size = Math.min(W * 0.98 / widest, H * 0.98 / (lines.length * 0.95));
    g.font = `${font.italic ? 'italic ' : ''}${font.weight} ${size}px ${font.family}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 0.95));
    const data = g.getImageData(0, 0, W, H).data;
    const on = (x, y) => {
      const ix = Math.round((x - b.x) * px), iy = Math.round((y - b.y) * px);
      return ix >= 0 && iy >= 0 && ix < W && iy < H && data[(iy * W + ix) * 4 + 3] > 128;
    };
    return (x, y, r) => inBox(x, y, r) && on(x, y) && on(x + r, y) && on(x - r, y) && on(x, y + r) && on(x, y - r)
      && on(x + r * 0.7, y + r * 0.7) && on(x - r * 0.7, y - r * 0.7) && on(x + r * 0.7, y - r * 0.7) && on(x - r * 0.7, y + r * 0.7);
  }

  // A circle goes into every grid cell its box touches, so lookups only check close neighbors.
  function addToGrid(g, c, gap, cell) {
    const reach = c.r + gap;
    for (let x = Math.floor((c.x - reach) / cell); x <= Math.floor((c.x + reach) / cell); x++) {
      for (let y = Math.floor((c.y - reach) / cell); y <= Math.floor((c.y + reach) / cell); y++) g.add(x * cell + cell / 2, y * cell + cell / 2, c);
    }
  }

  // True if a circle at (x, y, r) would come within gap of a placed one.
  function overlaps(g, x, y, r, gap, cell) {
    for (const c of g.near(x, y, r)) if (Math.hypot(c.x - x, c.y - y) < c.r + r + gap) return true;
    return false;
  }

  // One packed circle in the chosen look and color.
  function drawCircle(c, p, ctx, minR, maxR, rng) {
    const { palette, colorRng, unit } = ctx;
    const accents = Palettes.visible(palette);
    const t = Math.log(c.r / minR) / Math.log(maxR / minR || 2);
    const color = p.colorBy === 'ink' ? palette.ink : p.colorBy === 'size' ? accents[Math.min(accents.length - 1, Math.floor(t * accents.length))] : colorRng.pick(accents);
    const look = p.look === 'mixed' ? rng.pick(['filled', 'outline', 'rings']) : p.look;
    if (look === 'filled') return Shapes.circle(c.x, c.y, c.r, { fill: color });
    const sw = Math.max(0.2 * unit, c.r * 0.08);
    if (look === 'outline') return Shapes.circle(c.x, c.y, c.r - sw / 2, { stroke: color, sw });
    const rings = [];
    for (let r = c.r - sw / 2; r > sw; r -= sw * 2.6) rings.push(Shapes.circle(c.x, c.y, r, { stroke: color, sw }));
    return Shapes.group(rings);
  }
})();

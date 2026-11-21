// Memphis: playful 80s confetti: squiggles, zigzags, triangles, dots, half circles, and stripes scattered about.
(() => {
  const KINDS = ['squiggle', 'zigzag', 'triangle', 'dots', 'half', 'ring', 'cross', 'stripes', 'pill', 'circle'];

  Styles.register({
    id: 'memphis',
    name: 'Memphis',
    icon: 'confetti',
    params: [
      { key: 'count', label: 'Pieces', type: 'range', min: 6, max: 120, step: 1, value: 38 },
      { key: 'size', label: 'Piece size', type: 'range', min: 6, max: 80, step: 1, value: 30 },
      { key: 'spread', label: 'Size variety', type: 'range', min: 0, max: 1, step: 0.05, value: 0.5 },
      { key: 'weight', label: 'Line weight', type: 'range', min: 0.5, max: 6, step: 0.1, value: 2.6 },
      { key: 'outline', label: 'Black outlines', type: 'check', value: true },
      { key: 'pattern', label: 'Dot pattern behind', type: 'check', value: true },
      { key: 'textRoom', label: 'Leave room for the title', type: 'check', value: true },
    ],

    generate(rng, p, ctx) {
      const { box, full, unit, palette } = ctx;
      const accents = Palettes.visible(palette);
      const S = p.size * unit, out = [];
      if (p.pattern) out.push(...dotPattern(full, unit, palette.ink));
      const spots = Sampling.poisson(rng, box, S * 0.9, p.count * 3);
      const t = p.textRoom && ctx.textBox;
      const free = spots.filter(([x, y]) => !t || !(x + S / 2 > t.x && x - S / 2 < t.x + t.w && y + S / 2 > t.y && y - S / 2 < t.y + t.h));
      for (const [x, y] of rng.shuffle(free).slice(0, p.count)) {
        const size = S * (1 - p.spread * 0.6 * rng.next());
        const color = ctx.colorRng.pick(accents), kind = rng.pick(KINDS), rot = rng.int(0, 7) * 45;
        const piece = make(kind, size, color, p, unit, palette.ink, rng);
        out.push(Shapes.group(piece, `translate(${Geom.num(x)} ${Geom.num(y)}) rotate(${rot})`));
      }
      return out;
    },
  });

  // One piece centered on the origin.
  function make(kind, s, color, p, unit, ink, rng) {
    const sw = p.weight * unit, edge = p.outline ? { stroke: ink, sw: sw * 0.6, join: 'round' } : {};
    const S = Shapes, h = s / 2;
    switch (kind) {
      case 'squiggle': {
        const pts = [];
        for (let i = 0; i <= 40; i++) pts.push([-h + s * i / 40, Math.sin(i / 40 * Math.PI * 4) * s * 0.12]);
        return [S.poly(pts, { stroke: color, sw, cap: 'round', join: 'round' })];
      }
      case 'zigzag': {
        const pts = [];
        for (let i = 0; i <= 6; i++) pts.push([-h + s * i / 6, i % 2 ? -s * 0.12 : s * 0.12]);
        return [S.poly(pts, { stroke: color, sw, cap: 'round', join: 'round' })];
      }
      case 'triangle': return [S.poly([[0, -h], [h, h * 0.75], [-h, h * 0.75]], { fill: color, ...edge }, true)];
      case 'dots': {
        const out = [], n = 4, step = s / n;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) out.push(S.circle(-h + (i + 0.5) * step, -h + (j + 0.5) * step, step * 0.18, { fill: color }));
        return out;
      }
      case 'half': return [S.path(S.arcData(0, h * 0.3, h, Math.PI, 2 * Math.PI, true), { fill: color, ...edge })];
      case 'ring': return [S.circle(0, 0, h * 0.7, { stroke: color, sw: s * 0.16 })];
      case 'cross': return [S.line(-h * 0.6, 0, h * 0.6, 0, { stroke: color, sw, cap: 'round' }), S.line(0, -h * 0.6, 0, h * 0.6, { stroke: color, sw, cap: 'round' })];
      case 'stripes': {
        const out = [S.rect(-h, -h * 0.5, s, s * 0.5 * 2, { fill: color, ...edge })];
        for (let i = 1; i < 5; i++) out.push(S.line(-h, -h * 0.5 + s * i / 5, h, -h * 0.5 + s * i / 5, { stroke: ink, sw: sw * 0.4 }));
        return out;
      }
      case 'pill': return [S.rect(-h, -s * 0.16, s, s * 0.32, { fill: color, ...edge }, s * 0.16)];
      default: return [S.circle(0, 0, h * 0.55, { fill: color, ...edge })];
    }
  }

  // A light dot grid over the whole page.
  function dotPattern(full, unit, ink) {
    const step = 7 * unit, r = 0.45 * unit, n = Geom.num;
    let d = '';
    for (let y = full.y + step / 2; y < full.y + full.h; y += step) for (let x = full.x + step / 2; x < full.x + full.w; x += step) {
      d += `M${n(x - r)} ${n(y)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0`;
    }
    return [Shapes.path(d, { fill: ink, opacity: 0.18 })];
  }
})();

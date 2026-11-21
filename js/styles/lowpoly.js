// Low poly: the page cut into triangles (Delaunay), each shaded from a smooth color field across the palette.
(() => {
  Styles.register({
    id: 'lowpoly',
    name: 'Low poly',
    icon: 'triangle',
    params: [
      { key: 'spacing', label: 'Triangle size', type: 'range', min: 4, max: 60, step: 1, value: 16 },
      { key: 'field', label: 'Color flow', type: 'select', value: 'noise', options: [['noise', 'Clouds'], ['linear', 'Sweep'], ['radial', 'Glow']] },
      { key: 'scale', label: 'Cloud size', type: 'range', min: 0.3, max: 4, step: 0.05, value: 1.2 },
      { key: 'jitter', label: 'Shade variation', type: 'range', min: 0, max: 0.4, step: 0.01, value: 0.08 },
      { key: 'lines', label: 'Show edges', type: 'check', value: false },
      { key: 'paper', label: 'Include the paper color', type: 'check', value: true },
    ],

    generate(rng, p, ctx) {
      const { full, unit, palette } = ctx;
      const r = Math.max(2, p.spacing * unit / Math.sqrt(Math.max(0.3, ctx.quality)));
      const pts = Sampling.poisson(rng, Geom.inset(full, -r), r, 6000);
      for (const [x, y] of [[full.x - r, full.y - r], [full.x + full.w + r, full.y - r], [full.x - r, full.y + full.h + r], [full.x + full.w + r, full.y + full.h + r]]) pts.push([x, y]);
      const tris = delaunay(pts);
      const ramp = p.paper ? [palette.bg, ...Palettes.visible(palette)] : Palettes.visible(palette);
      const value = field(p, ctx, rng);
      return tris.map(([a, b, c]) => {
        const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3;
        const t = Math.max(0, Math.min(0.999, value(cx, cy) + (rng.next() - 0.5) * p.jitter));
        const color = gradient(ramp, t);
        return Shapes.poly([a, b, c], p.lines ? { fill: color, stroke: palette.ink, sw: 0.25 * unit, join: 'round' } : { fill: color, stroke: color, sw: 0.25 * unit, join: 'round' }, true);
      });
    },
  });

  // Where on the ramp each spot is (0–1).
  function field(p, ctx, rng) {
    const { box, noise, unit } = ctx;
    if (p.field === 'linear') {
      const a = rng.range(0, Math.PI * 2), ux = Math.cos(a), uy = Math.sin(a), half = Math.hypot(box.w, box.h) / 2;
      return (x, y) => 0.5 + ((x - box.x - box.w / 2) * ux + (y - box.y - box.h / 2) * uy) / (2 * half);
    }
    if (p.field === 'radial') {
      const cx = box.x + box.w * rng.range(0.3, 0.7), cy = box.y + box.h * rng.range(0.3, 0.6), R = Math.hypot(box.w, box.h) * 0.6;
      return (x, y) => Math.hypot(x - cx, y - cy) / R;
    }
    const f = p.scale / (200 * unit);
    return (x, y) => 0.5 + noise.fbm2(x * f, y * f, 3) * 0.8;
  }

  // Bowyer–Watson Delaunay triangulation. Points [[x, y]] → triangles [[a, b, c]].
  function delaunay(points) {
    const big = 1e6;
    const s0 = [-big, -big], s1 = [big, -big], s2 = [0, big];
    let tris = [circum([s0, s1, s2])];
    for (const p of points) {
      const bad = [], keep = [];
      for (const t of tris) ((p[0] - t.cx) ** 2 + (p[1] - t.cy) ** 2 < t.r2 ? bad : keep).push(t);
      const edges = new Map();
      for (const t of bad) for (const [a, b] of [[t.v[0], t.v[1]], [t.v[1], t.v[2]], [t.v[2], t.v[0]]]) {
        const k = edgeKey(a, b);
        edges.set(k, edges.has(k) ? null : [a, b]);
      }
      for (const e of edges.values()) if (e) keep.push(circum([e[0], e[1], p]));
      tris = keep;
    }
    return tris.filter(t => !t.v.some(v => v === s0 || v === s1 || v === s2)).map(t => t.v);
  }

  // A triangle with its circumcircle (center and squared radius).
  function circum(v) {
    const [a, b, c] = v;
    const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])) || 1e-9;
    const a2 = a[0] ** 2 + a[1] ** 2, b2 = b[0] ** 2 + b[1] ** 2, c2 = c[0] ** 2 + c[1] ** 2;
    const cx = (a2 * (b[1] - c[1]) + b2 * (c[1] - a[1]) + c2 * (a[1] - b[1])) / d;
    const cy = (a2 * (c[0] - b[0]) + b2 * (a[0] - c[0]) + c2 * (b[0] - a[0])) / d;
    return { v, cx, cy, r2: (a[0] - cx) ** 2 + (a[1] - cy) ** 2 };
  }

  function edgeKey(a, b) {
    const ka = a[0] + ',' + a[1], kb = b[0] + ',' + b[1];
    return ka < kb ? ka + '|' + kb : kb + '|' + ka;
  }

  // Color at t (0–1) along a list of colors.
  function gradient(colors, t) {
    if (colors.length === 1) return colors[0];
    const x = t * (colors.length - 1), i = Math.floor(x);
    return Palettes.mix(colors[i], colors[Math.min(colors.length - 1, i + 1)], x - i);
  }
})();

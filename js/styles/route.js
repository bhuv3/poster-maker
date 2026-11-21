// Route: your own run, ride, or walk from a GPX file, drawn as a bold line with echoes. Without a file it draws
// a made-up loop so the style is never empty.
(() => {
  Styles.register({
    id: 'route',
    name: 'Route',
    icon: 'route',
    dataImport: 'gpx',
    params: [
      { key: 'weight', label: 'Line weight', type: 'range', min: 0.3, max: 8, step: 0.1, value: 2.4 },
      { key: 'echoes', label: 'Echo lines', type: 'range', min: 0, max: 30, step: 1, value: 8 },
      { key: 'spacing', label: 'Echo spacing', type: 'range', min: 0.6, max: 10, step: 0.1, value: 2.4 },
      { key: 'look', label: 'Echoes', type: 'choice', value: 'both', options: [['both', 'Both sides'], ['outside', 'One side'], ['glow', 'Glow']] },
      { key: 'fill', label: 'Fit', type: 'range', min: 0.4, max: 1, step: 0.02, value: 0.8 },
      { key: 'rotate', label: 'Rotate', type: 'range', min: -180, max: 180, step: 5, value: 0 },
      { key: 'markers', label: 'Start and finish dots', type: 'check', value: true },
      { key: 'textRoom', label: 'Leave room for the title', type: 'check', value: true },
    ],

    generate(rng, p, ctx) {
      const { unit, palette } = ctx;
      const raw = ctx.data && ctx.data.points && ctx.data.points.length > 1 ? project(ctx.data.points) : demoRoute(ctx.noise);
      const pts = fit(rotate(raw, p.rotate), p, ctx);
      const accents = Palettes.visible(palette);
      const main = accents[0], echo = accents[1 % accents.length], out = [];
      const sw = p.weight * unit, gap = p.spacing * unit;
      for (let k = p.echoes; k >= 1; k--) {
        const fade = 1 - k / (p.echoes + 1);
        if (p.look === 'glow') { out.push(Shapes.poly(pts, { stroke: echo, sw: sw + k * gap * 2, opacity: 0.08 + 0.1 * fade, join: 'round', cap: 'round' })); continue; }
        const s = { stroke: echo, sw: Math.max(0.2 * unit, sw * 0.25), opacity: 0.35 + 0.6 * fade, join: 'round' };
        out.push(Shapes.poly(offset(pts, k * gap), s));
        if (p.look === 'both') out.push(Shapes.poly(offset(pts, -k * gap), s));
      }
      out.push(Shapes.poly(pts, { stroke: main, sw, join: 'round', cap: 'round' }));
      if (p.markers) {
        const a = pts[0], b = pts[pts.length - 1];
        out.push(Shapes.circle(a[0], a[1], sw * 1.6, { fill: palette.ink }), Shapes.circle(b[0], b[1], sw * 1.6, { fill: palette.bg, stroke: palette.ink, sw: sw * 0.6 }));
      }
      return out;
    },
  });

  // Longitude/latitude → flat x/y (equirectangular, scaled at the route's middle latitude). North is up.
  function project(points) {
    const lat0 = points.reduce((s, q) => s + q[1], 0) / points.length * Math.PI / 180;
    return points.map(([lon, lat]) => [lon * Math.cos(lat0), -lat]);
  }

  function rotate(pts, deg) {
    if (!deg) return pts;
    const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return pts.map(([x, y]) => [x * c - y * s, x * s + y * c]);
  }

  // Scales and centers the route in the free part of the page (away from the title when asked).
  function fit(pts, p, ctx) {
    const area = TextLayer.freeArea(ctx, p.textRoom);
    const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.min(area.w / (x1 - x0 || 1), area.h / (y1 - y0 || 1)) * p.fill;
    const cx = area.x + area.w / 2, cy = area.y + area.h / 2, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    return Geom.smooth(pts.map(([x, y]) => [cx + (x - mx) * k, cy + (y - my) * k]), 1);
  }

  // A polyline moved sideways by d (positive: to the right of travel).
  function offset(pts, d) {
    return pts.map((q, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const len = Math.hypot(nx, ny) || 1;
      return [q[0] + nx / len * d, q[1] + ny / len * d];
    });
  }

  // A wandering loop from noise, used until a GPX file is loaded.
  function demoRoute(noise) {
    const pts = [];
    for (let i = 0; i <= 400; i++) {
      const a = i / 400 * Math.PI * 2;
      const r = 1 + 0.45 * noise.noise2(Math.cos(a) * 1.3 + 5, Math.sin(a) * 1.3) + 0.15 * noise.noise2(Math.cos(a) * 4, Math.sin(a) * 4 + 7);
      pts.push([Math.cos(a) * r * 1.2, Math.sin(a) * r]);
    }
    return pts;
  }
})();

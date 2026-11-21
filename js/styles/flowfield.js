// Flow field: lines that follow a smooth noise field and keep their distance, like ink drawn with a steady hand.
(() => {
  Styles.register({
    id: 'flowfield',
    name: 'Flow field',
    icon: 'wind',
    animated: true,
    params: [
      { key: 'count', label: 'Lines', type: 'range', min: 50, max: 3000, step: 50, value: 900 },
      { key: 'scale', label: 'Field size', type: 'range', min: 0.3, max: 5, step: 0.1, value: 1.4 },
      { key: 'turns', label: 'Curl', type: 'range', min: 0.25, max: 4, step: 0.05, value: 1.2 },
      { key: 'octaves', label: 'Detail', type: 'range', min: 1, max: 5, step: 1, value: 2 },
      { key: 'spacing', label: 'Spacing', type: 'range', min: 0.4, max: 8, step: 0.1, value: 1.8 },
      { key: 'length', label: 'Max length', type: 'range', min: 10, max: 600, step: 10, value: 220 },
      { key: 'weight', label: 'Line weight', type: 'range', min: 0.1, max: 3, step: 0.05, value: 0.55 },
      { key: 'taper', label: 'Brush taper', type: 'check', value: true },
      { key: 'colors', label: 'Color', type: 'choice', value: 'field', options: [['ink', 'Ink'], ['field', 'Regions'], ['random', 'Mixed']] },
      { key: 'bleed', label: 'Run off the edges', type: 'check', value: true },
      { key: 'textRoom', label: 'Leave room for the title', type: 'check', value: false },
    ],

    generate(rng, p, ctx) {
      const { unit, palette, noise } = ctx;
      const area = p.bleed ? ctx.full : ctx.box;
      const step = 0.9 * unit, spacing = p.spacing * unit, freq = p.scale / (300 * unit);
      const angle = fieldAngle(noise, freq, p, ctx.time, ctx.animating);
      const g = Sampling.grid(Math.max(spacing, 0.5));
      const count = Math.round(p.count * ctx.quality);
      const maxSteps = Math.round(p.length * unit / step);
      const accents = Palettes.visible(palette);
      const keepOut = p.textRoom ? ctx.textBox : null;
      const lines = [];
      for (let i = 0; i < count * 3 && lines.length < count; i++) {
        const sx = area.x + rng.next() * area.w, sy = area.y + rng.next() * area.h;
        if (crowded(g, sx, sy, spacing, -1) || (keepOut && Geom.inRect(sx, sy, keepOut))) continue;
        const id = lines.length;
        const fwd = trace(sx, sy, 1, angle, step, maxSteps, area, g, spacing, id, keepOut);
        const back = trace(sx, sy, -1, angle, step, maxSteps, area, g, spacing, id, keepOut);
        const pts = back.reverse().concat([[sx, sy]], fwd);
        if (pts.length < 6) continue;
        for (const q of pts) g.add(q[0], q[1], { x: q[0], y: q[1], id });
        lines.push(pts);
      }
      const colorFor = pts => p.colors === 'ink' ? palette.ink : p.colors === 'random' ? ctx.colorRng.pick(accents)
        : accents[Math.floor((noise.noise2(pts[0][0] * freq * 0.5 + 40, pts[0][1] * freq * 0.5) * 0.5 + 0.5) * accents.length * 0.999)];
      return lines.map(pts => {
        const c = colorFor(pts), w = p.weight * unit * (0.7 + rng.next() * 0.6);
        const simple = Geom.simplify(pts, 0.04 * unit);
        return p.taper && ctx.mode !== 'plotter' ? Shapes.poly(taper(simple, w), { fill: c }, true) : Shapes.poly(simple, { stroke: c, sw: w, cap: 'round', join: 'round' });
      });
    },
  });

  // Field direction at a point. With time, the field drifts along a loop in noise space (for animation).
  function fieldAngle(noise, freq, p, time, animating) {
    const r = 0.6, dy = Math.sin(time * Math.PI * 2) * r, dz = Math.cos(time * Math.PI * 2) * r;
    return animating
      ? (x, y) => noise.fbm3(x * freq, y * freq + dy, dz, p.octaves) * Math.PI * 2 * p.turns
      : (x, y) => noise.fbm2(x * freq, y * freq, p.octaves) * Math.PI * 2 * p.turns;
  }

  // Follows the field from (x, y) until it leaves the area, gets too close to another line, or runs out of steps.
  function trace(x, y, dir, angle, step, maxSteps, area, g, spacing, id, keepOut) {
    const pts = [];
    for (let k = 0; k < maxSteps / 2; k++) {
      const a = angle(x, y);
      x += Math.cos(a) * step * dir; y += Math.sin(a) * step * dir;
      if (!Geom.inRect(x, y, area) || crowded(g, x, y, spacing, id) || (keepOut && Geom.inRect(x, y, keepOut))) break;
      pts.push([x, y]);
    }
    return pts;
  }

  // True when another line passes within spacing of (x, y).
  function crowded(g, x, y, spacing, id) {
    const s2 = spacing * spacing;
    for (const q of g.near(x, y, spacing)) if (q.id !== id && (q.x - x) ** 2 + (q.y - y) ** 2 < s2) return true;
    return false;
  }

  // A polyline turned into a closed outline that swells in the middle and thins at both ends, like a brush stroke.
  function taper(pts, w) {
    const left = [], right = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const len = Math.hypot(nx, ny) || 1;
      nx /= len; ny /= len;
      const t = i / (n - 1), half = w * 0.5 * (0.25 + 0.75 * Math.sin(Math.PI * t));
      left.push([pts[i][0] + nx * half, pts[i][1] + ny * half]);
      right.push([pts[i][0] - nx * half, pts[i][1] - ny * half]);
    }
    return left.concat(right.reverse());
  }
})();

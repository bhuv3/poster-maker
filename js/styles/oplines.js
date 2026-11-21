// Op-art lines: hundreds of parallel lines bent by noise, a lens, waves, or ripples, with optional moiré and zebra bands.
(() => {
  Styles.register({
    id: 'oplines',
    name: 'Op-art lines',
    icon: 'lines',
    animated: true,
    params: [
      { key: 'count', label: 'Lines', type: 'range', min: 20, max: 400, step: 5, value: 150 },
      { key: 'mode', label: 'Bend', type: 'choice', value: 'lens', options: [['noise', 'Noise'], ['lens', 'Lens'], ['waves', 'Waves'], ['ripple', 'Ripple']] },
      { key: 'amp', label: 'Strength', type: 'range', min: 0, max: 60, step: 1, value: 18 },
      { key: 'scale', label: 'Frequency', type: 'range', min: 0.3, max: 6, step: 0.1, value: 1.6 },
      { key: 'weight', label: 'Line weight', type: 'range', min: 0.1, max: 3, step: 0.05, value: 0.7 },
      { key: 'zebra', label: 'Fill every other band', type: 'check', value: false },
      { key: 'moire', label: 'Moiré layer', type: 'check', value: false },
      { key: 'moireAngle', label: 'Moiré angle', type: 'range', min: 1, max: 30, step: 0.5, value: 4 },
      { key: 'angle', label: 'Angle', type: 'range', min: 0, max: 180, step: 5, value: 0 },
      { key: 'colors', label: 'Color', type: 'choice', value: 'ink', options: [['ink', 'Ink'], ['gradient', 'Gradient'], ['alternate', 'Alternate']] },
    ],

    generate(rng, p, ctx) {
      const { palette, w, h } = ctx;
      const accents = Palettes.visible(palette);
      const bend = bender(rng, p, ctx);
      const turn = a => `rotate(${a} ${w / 2} ${h / 2})`;
      const out = [Shapes.group(layer(p, ctx, bend, accents, palette.ink, 1), turn(p.angle))];
      if (p.moire) {
        const second = layer({ ...p, zebra: false }, ctx, bend, accents.slice().reverse(), accents[accents.length - 1] || palette.ink, 0.85);
        out.push(Shapes.group(second, turn(p.angle + p.moireAngle)));
      }
      return out;
    },
  });

  // One set of horizontal lines (or zebra bands) over a square that still covers the page when turned to any angle.
  function layer(p, ctx, bend, accents, ink, opacity) {
    const { full, unit, w, h } = ctx;
    const side = Math.hypot(full.w, full.h), x0 = w / 2 - side / 2, top = h / 2 - side / 2;
    const n = Math.round(p.count * Math.max(0.4, ctx.quality) * side / full.h);
    const step = Math.max(0.6, 1.2 * unit / Math.max(0.5, ctx.quality));
    const lines = [];
    for (let i = 0; i <= n; i++) {
      const y0 = top + side * i / n, pts = [];
      for (let x = x0; x <= x0 + side + step; x += step) pts.push([x, y0 + bend(x, y0)]);
      lines.push(Geom.simplify(pts, 0.03 * unit));
    }
    const color = i => p.colors === 'gradient' ? gradient(accents, i / n) : p.colors === 'alternate' ? accents[i % accents.length] : ink;
    if (p.zebra) {
      const out = [];
      for (let i = 0; i < n; i += 2) out.push(Shapes.poly(lines[i].concat(lines[i + 1].slice().reverse()), { fill: color(i), opacity }, true));
      return out;
    }
    return lines.map((pts, i) => Shapes.poly(pts, { stroke: color(i), sw: p.weight * unit, opacity, join: 'round' }));
  }

  // The vertical offset of a line at (x, y) for the chosen bend.
  function bender(rng, p, ctx) {
    const { box, unit, noise, time } = ctx;
    const amp = p.amp * unit, freq = p.scale / (100 * unit), phase = time * Math.PI * 2;
    if (p.mode === 'noise') {
      const r = 0.7, dy = Math.sin(phase) * r, dz = Math.cos(phase) * r;
      return ctx.animating ? (x, y) => amp * noise.fbm3(x * freq * 0.5, y * freq * 0.5 + dy, dz, 3) * 2
        : (x, y) => amp * noise.fbm2(x * freq * 0.5, y * freq * 0.5, 3) * 2;
    }
    const cx = box.x + box.w * rng.range(0.3, 0.7), cy = box.y + box.h * rng.range(0.25, 0.6);
    const R = Math.min(box.w, box.h) * rng.range(0.28, 0.42);
    if (p.mode === 'lens') {
      return (x, y) => {
        const d = Math.hypot(x - cx, y - cy) / R;
        if (d >= 1) return 0;
        const k = (1 - d * d) ** 2;
        return (y - cy) * k * (amp / (20 * unit)) * (1 + 0.2 * Math.sin(phase));
      };
    }
    if (p.mode === 'waves') return (x, y) => amp * 0.5 * Math.sin(x * freq * 4 + y * freq * 1.5 + phase);
    return (x, y) => {
      const d = Math.hypot(x - cx, y - cy);
      return amp * 0.6 * Math.sin(d * freq * 5 - phase) * Math.exp(-d / (R * 1.2));
    };
  }

  // Color at t (0–1) along the accents.
  function gradient(colors, t) {
    if (colors.length === 1) return colors[0];
    const x = Math.min(0.9999, t) * (colors.length - 1), i = Math.floor(x);
    return Palettes.mix(colors[i], colors[i + 1], x - i);
  }
})();

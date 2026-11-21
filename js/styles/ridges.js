// Ridgelines: stacked mountain lines that hide the ones behind them, like the famous pulsar plot album cover.
(() => {
  Styles.register({
    id: 'ridges',
    name: 'Ridgelines',
    icon: 'ridges',
    animated: true,
    params: [
      { key: 'rows', label: 'Lines', type: 'range', min: 12, max: 140, step: 1, value: 64 },
      { key: 'height', label: 'Peak height', type: 'range', min: 2, max: 80, step: 1, value: 26 },
      { key: 'focus', label: 'Peaks in the middle', type: 'range', min: 0, max: 1, step: 0.05, value: 0.75 },
      { key: 'scale', label: 'Roughness', type: 'range', min: 0.5, max: 8, step: 0.1, value: 3 },
      { key: 'width', label: 'Width', type: 'range', min: 0.3, max: 1, step: 0.02, value: 0.72 },
      { key: 'depth', label: 'Area height', type: 'range', min: 0.2, max: 1, step: 0.02, value: 0.62 },
      { key: 'weight', label: 'Line weight', type: 'range', min: 0.1, max: 3, step: 0.05, value: 0.6 },
      { key: 'colors', label: 'Color', type: 'choice', value: 'ink', options: [['ink', 'Ink'], ['gradient', 'Gradient'], ['filled', 'Filled']] },
      { key: 'textRoom', label: 'Leave room for the title', type: 'check', value: true },
    ],

    generate(rng, p, ctx) {
      const { unit, palette, noise } = ctx;
      const area = TextLayer.freeArea(ctx, p.textRoom);
      const w = area.w * p.width, h = area.h * p.depth;
      const x0 = area.x + (area.w - w) / 2, top = area.y + (area.h - h) / 2 + p.height * unit;
      const rows = Math.max(4, Math.round(p.rows * Math.max(0.5, ctx.quality)));
      const gap = (h - p.height * unit) / (rows - 1), step = Math.max(0.6, w / 220);
      const accents = Palettes.visible(palette), out = [];
      const loop = ctx.time * Math.PI * 2;
      for (let i = 0; i < rows; i++) {
        const base = top + i * gap, pts = [];
        const rowSeed = rng.next() * 100;
        for (let x = x0; x <= x0 + w + 0.01; x += step) {
          const t = Math.min(1, (x - x0) / w);
          const env = Math.pow(Math.max(0, Math.sin(Math.PI * t)), 1 + p.focus * 6) * (1 - p.focus) + Math.exp(-(((t - 0.5) / 0.16) ** 2)) * p.focus;
          const n = ctx.animating ? noise.noise3(t * p.scale + rowSeed, Math.sin(loop) * 0.4, Math.cos(loop) * 0.4) : noise.noise2(t * p.scale + rowSeed, i * 0.13);
          const bump = Math.max(0, n * 0.5 + 0.5) ** 2 * 2 + noise.noise2(t * p.scale * 6, i) * 0.06;
          pts.push([x, base - env * bump * p.height * unit]);
        }
        const color = p.colors === 'gradient' ? Palettes.mix(accents[0], accents[accents.length - 1], i / (rows - 1)) : palette.ink;
        const fill = p.colors === 'filled' ? Palettes.mix(palette.bg, accents[i % accents.length], 0.85) : palette.bg;
        const body = pts.concat([[x0 + w, base + gap * 1.5], [x0, base + gap * 1.5]]);
        out.push(Shapes.poly(body, { fill }, true));
        out.push(Shapes.poly(pts, { stroke: color, sw: p.weight * unit, join: 'round', cap: 'round' }));
      }
      return out;
    },
  });
})();

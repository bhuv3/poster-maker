// Harmonograph: the looping curves a pendulum-driven pen draws as it slowly runs down.
(() => {
  Styles.register({
    id: 'harmonograph',
    name: 'Harmonograph',
    icon: 'spiral',
    animated: true,
    params: [
      { key: 'ratio', label: 'Frequency ratio', type: 'select', value: '3:2', options: [['1:1', '1 : 1'], ['2:1', '2 : 1'], ['3:2', '3 : 2'], ['4:3', '4 : 3'], ['5:4', '5 : 4'], ['3:1', '3 : 1']] },
      { key: 'detune', label: 'Detune', type: 'range', min: 0, max: 0.03, step: 0.001, value: 0.006 },
      { key: 'damping', label: 'Fade', type: 'range', min: 0.0005, max: 0.01, step: 0.0005, value: 0.003 },
      { key: 'length', label: 'Drawing time', type: 'range', min: 100, max: 1500, step: 50, value: 700 },
      { key: 'pens', label: 'Pens', type: 'range', min: 1, max: 5, step: 1, value: 2 },
      { key: 'weight', label: 'Line weight', type: 'range', min: 0.1, max: 2, step: 0.05, value: 0.35 },
      { key: 'size', label: 'Size', type: 'range', min: 0.3, max: 1, step: 0.02, value: 0.8 },
      { key: 'textRoom', label: 'Leave room for the title', type: 'check', value: true },
    ],

    generate(rng, p, ctx) {
      const { unit, palette } = ctx;
      const area = TextLayer.freeArea(ctx, p.textRoom);
      const [fa, fb] = p.ratio.split(':').map(Number);
      const cx = area.x + area.w / 2, cy = area.y + area.h / 2, R = Math.min(area.w, area.h) / 2 * p.size;
      const accents = Palettes.visible(palette), out = [];
      for (let pen = 0; pen < p.pens; pen++) {
        const ph = [rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28)].map(v => v + ctx.time * Math.PI * 2 * (pen + 1));
        // Two pendulums, each swinging in both directions a quarter turn apart (so the pen circles rather than
        // scribbling back and forth). The small detune makes the figure slowly turn as it fades.
        const d = p.detune * (1 + pen * 0.6), k = 0.05, A = 0.75, q = Math.PI / 2 + (ph[2] - Math.PI) * 0.15;
        const pts = [], steps = Math.round(p.length * 12 * Math.max(0.3, ctx.quality));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps * p.length, e = Math.exp(-p.damping * t);
          const x = (Math.sin(fa * t * k + ph[0]) + A * Math.sin(fb * t * k + ph[1])) / (1 + A) * e;
          const y = (Math.sin((fa + d) * t * k + ph[0] + q) + A * Math.sin(fb * t * k + ph[1] + q)) / (1 + A) * e;
          pts.push([cx + x * R, cy + y * R]);
        }
        out.push(Shapes.poly(Geom.simplify(pts, 0.03 * unit), { stroke: accents[pen % accents.length], sw: p.weight * unit, join: 'round', cap: 'round', opacity: p.pens > 1 ? 0.9 : 1 }));
      }
      return out;
    },
  });
})();

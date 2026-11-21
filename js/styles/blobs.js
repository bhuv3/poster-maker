// Grainy gradient: soft blurred color blobs with film grain, the look of modern gig and gallery posters.
(() => {
  Styles.register({
    id: 'blobs',
    name: 'Grainy gradient',
    icon: 'blobs',
    animated: true,
    params: [
      { key: 'count', label: 'Blobs', type: 'range', min: 2, max: 14, step: 1, value: 6 },
      { key: 'size', label: 'Blob size', type: 'range', min: 0.15, max: 1, step: 0.01, value: 0.5 },
      { key: 'blur', label: 'Softness', type: 'range', min: 0, max: 1, step: 0.02, value: 0.6 },
      { key: 'grain', label: 'Grain', type: 'range', min: 0, max: 1, step: 0.05, value: 0.45 },
      { key: 'shape', label: 'Blob shape', type: 'choice', value: 'round', options: [['round', 'Round'], ['wobbly', 'Wobbly'], ['bars', 'Bars']] },
      { key: 'crisp', label: 'Sharp shape on top', type: 'choice', value: 'none', options: [['none', 'None'], ['circle', 'Circle'], ['ring', 'Ring'], ['arch', 'Arch']] },
    ],

    generate(rng, p, ctx) {
      const { full, box, palette, unit, noise } = ctx;
      const accents = Palettes.visible(palette);
      const span = Math.min(full.w, full.h), sd = p.blur * span * 0.09;
      const phase = ctx.time * Math.PI * 2, out = [];
      out.push(Shapes.def(`<filter id="{id}blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${Geom.num(sd)}"/></filter>`));
      const blobs = [];
      for (let i = 0; i < p.count; i++) {
        const drift = 0.06 * span;
        const x = full.x + rng.next() * full.w + Math.cos(phase + i) * drift * ctx.animating;
        const y = full.y + rng.next() * full.h + Math.sin(phase * (i % 2 ? 1 : -1) + i) * drift * ctx.animating;
        const r = span * p.size * rng.range(0.45, 1);
        const color = accents[(i + ctx.colorRng.int(0, 9)) % accents.length];
        blobs.push(blob(p.shape, x, y, r, rng, noise, i, color));
      }
      const g = Shapes.group(blobs);
      if (sd > 0.01) g.filter = 'blur';
      out.push(g);
      if (p.crisp !== 'none') out.push(crisp(p.crisp, box, palette, accents, unit));
      if (p.grain > 0) out.push(...grain(p.grain, full, ctx.seeds.detail));
      return out;
    },
  });

  // One soft shape: a circle, a wobbly blob, or a tall bar.
  function blob(shape, x, y, r, rng, noise, i, color) {
    if (shape === 'bars') return Shapes.rect(x - r * 0.25, y - r, r * 0.5, r * 2, { fill: color }, r * 0.25);
    if (shape === 'round') return Shapes.circle(x, y, r, { fill: color });
    const pts = [];
    for (let k = 0; k < 48; k++) {
      const a = k / 48 * Math.PI * 2, rr = r * (1 + 0.35 * noise.noise2(Math.cos(a) + i * 7, Math.sin(a)));
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    return Shapes.poly(Geom.smooth(pts, 1), { fill: color }, true);
  }

  // A clean shape over the blur, for contrast.
  function crisp(kind, box, palette, accents, unit) {
    const cx = box.x + box.w / 2, cy = box.y + box.h * 0.4, r = Math.min(box.w, box.h) * 0.3;
    if (kind === 'ring') return Shapes.circle(cx, cy, r, { stroke: palette.ink, sw: 1.6 * unit });
    if (kind === 'arch') {
      const d = `M${Geom.num(cx - r)} ${Geom.num(cy + r)}V${Geom.num(cy)}A${Geom.num(r)} ${Geom.num(r)} 0 0 1 ${Geom.num(cx + r)} ${Geom.num(cy)}V${Geom.num(cy + r)}Z`;
      return Shapes.path(d, { fill: palette.ink });
    }
    return Shapes.circle(cx, cy, r, { fill: palette.ink });
  }

  // Film grain: fine noise over everything, mixed softly so colors stay.
  function grain(amount, full, seed) {
    const n = Geom.num;
    return [
      Shapes.def(`<filter id="{id}grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="2" seed="${seed % 997}" stitchTiles="stitch"/>`
        + '<feColorMatrix type="saturate" values="0"/></filter>'),
      Shapes.group([Shapes.rect(full.x, full.y, full.w, full.h, { fill: '#808080' })], '', { opacity: 0.12 + amount * 0.4, blend: 'overlay' }),
    ].map((s, i) => (i === 1 ? { ...s, filter: 'grain' } : s));
  }
})();

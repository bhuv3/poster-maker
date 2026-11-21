// Sunburst: rays fanning out from a point, with optional rings: 70s record sleeves and old travel posters.
(() => {
  Styles.register({
    id: 'sunburst',
    name: 'Sunburst',
    icon: 'sun',
    animated: true,
    params: [
      { key: 'rays', label: 'Rays', type: 'range', min: 6, max: 120, step: 2, value: 32 },
      { key: 'origin', label: 'From', type: 'select', value: 'horizon', options: [['horizon', 'The horizon'], ['center', 'The center'], ['corner', 'A corner'], ['random', 'Anywhere']] },
      { key: 'twist', label: 'Twist', type: 'range', min: -1, max: 1, step: 0.05, value: 0 },
      { key: 'rings', label: 'Rings', type: 'range', min: 0, max: 12, step: 1, value: 5 },
      { key: 'sun', label: 'Sun size', type: 'range', min: 0, max: 0.6, step: 0.01, value: 0.22 },
      { key: 'colors', label: 'Ray colors', type: 'choice', value: 'two', options: [['two', 'Two'], ['all', 'All'], ['fade', 'Fade']] },
    ],

    generate(rng, p, ctx) {
      const { full, box, palette, unit } = ctx;
      const accents = Palettes.visible(palette);
      const [ox, oy] = origin(p.origin, rng, box);
      const R = Math.hypot(Math.max(ox - full.x, full.x + full.w - ox), Math.max(oy - full.y, full.y + full.h - oy)) * 1.05;
      const spin = ctx.time * (Math.PI * 2 / p.rays) * 2, out = [];
      const twist = p.twist * Math.PI / 2;
      for (let i = 0; i < p.rays; i += 2) {
        const a0 = i / p.rays * Math.PI * 2 + spin, a1 = (i + 1) / p.rays * Math.PI * 2 + spin;
        const color = p.colors === 'two' ? accents[(i / 2) % Math.min(2, accents.length)] : p.colors === 'all' ? accents[(i / 2) % accents.length]
          : Palettes.mix(accents[0], palette.bg, 0.15 + 0.6 * (i / p.rays));
        out.push(Shapes.poly(ray(ox, oy, R, a0, a1, twist), { fill: color }, true));
      }
      const sunR = p.sun * Math.min(box.w, box.h);
      for (let k = p.rings; k >= 1; k--) {
        const r = sunR + (R - sunR) * (k / (p.rings + 1)) ** 1.6 * 0.6;
        out.push(Shapes.circle(ox, oy, r, { stroke: palette.bg, sw: Math.max(0.8 * unit, r * 0.035) }));
      }
      if (sunR > 0) {
        out.push(Shapes.circle(ox, oy, sunR * 1.12, { fill: palette.bg }));
        out.push(Shapes.circle(ox, oy, sunR, { fill: accents[accents.length - 1] === accents[0] ? palette.ink : accents[accents.length - 1] }));
      }
      return out;
    },
  });

  // Where the rays start.
  function origin(kind, rng, box) {
    if (kind === 'center') return [box.x + box.w / 2, box.y + box.h * 0.42];
    if (kind === 'corner') return [rng.chance(0.5) ? box.x : box.x + box.w, rng.chance(0.5) ? box.y : box.y + box.h];
    if (kind === 'random') return [box.x + rng.next() * box.w, box.y + rng.next() * box.h * 0.7];
    return [box.x + box.w / 2, box.y + box.h * 0.62];
  }

  // A wedge from the center out to R. Twist bends it into a spiral arm.
  function ray(ox, oy, R, a0, a1, twist) {
    const steps = twist ? 24 : 1, side = (a, k) => {
      const t = k / steps, r = R * t, b = a + twist * t;
      return [ox + Math.cos(b) * r, oy + Math.sin(b) * r];
    };
    const left = [], right = [];
    for (let k = 0; k <= steps; k++) { left.push(side(a0, k)); right.push(side(a1, k)); }
    return left.concat(right.reverse());
  }
})();

// Risograph finish: one layer per ink color, multiplied together, each nudged slightly off register, with grain.
const Riso = (() => {
  const n = Geom.num;

  // Shapes split by ink color, lightest ink first (riso prints light to dark). Groups are flattened, keeping transforms.
  function split(shapes) {
    const inks = new Map();
    const visit = (sh, transform) => {
      if (sh.t === 'group' && !sh.filter) { sh.children.forEach(c => visit(c, (transform ? transform + ' ' : '') + (sh.transform || ''))); return; }
      const color = sh.t === 'group' ? Shapes.colorOf(sh.children[0] || {}) : Shapes.colorOf(sh);
      if (!color) return;
      if (!inks.has(color)) inks.set(color, []);
      inks.get(color).push(transform ? Shapes.group([sh], transform) : sh);
    };
    shapes.forEach(sh => visit(sh, ''));
    return [...inks].map(([color, list]) => ({ color, shapes: list }))
      .sort((a, b) => Palettes.luminance(b.color) - Palettes.luminance(a.color));
  }

  // The grain filter. Speckles knock small holes into the ink, more where the noise is bright.
  function defs(id, o, L) {
    const g = o.grain || 0, v = L.sheet;
    return `<filter id="${id}g" x="${n(v.x)}" y="${n(v.y)}" width="${n(v.w)}" height="${n(v.h)}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">`
      + `<feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="${(o.seed || 1) % 997}" result="noise"/>`
      + `<feColorMatrix in="noise" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${n(-4.5 * g)} 0 0 0 ${n(1 + 2 * g)}" result="mask"/>`
      + `<feComposite in="SourceGraphic" in2="mask" operator="in"/></filter>`;
  }

  // The ink layers as SVG markup: multiplied, off register, and grainy.
  function layers(shapes, id, o) {
    const rng = Random.create(o.seed || 1), m = o.misregister || 0;
    return split(shapes).map(({ color, shapes: list }) => {
      const dx = rng.range(-m, m), dy = rng.range(-m, m);
      return `<g style="mix-blend-mode:multiply" transform="translate(${n(dx)} ${n(dy)})"${o.grain ? ` filter="url(#${id}g)"` : ''} data-ink="${color}">`
        + list.map(Svg.shape).join('') + '</g>';
    }).join('');
  }

  return { split, defs, layers };
})();

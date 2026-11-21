// Rainbows: nested arcs in retro color bands, set on a loose grid and turned every which way.
(() => {
  Styles.register({
    id: 'rainbows',
    name: 'Rainbows',
    icon: 'rainbow',
    params: [
      { key: 'count', label: 'Rainbows', type: 'range', min: 1, max: 12, step: 1, value: 4 },
      { key: 'bands', label: 'Bands', type: 'range', min: 2, max: 12, step: 1, value: 5 },
      { key: 'gap', label: 'Gap', type: 'range', min: 0, max: 0.6, step: 0.02, value: 0.08 },
      { key: 'turns', label: 'Turned', type: 'choice', value: 'mixed', options: [['up', 'All up'], ['pairs', 'Facing'], ['mixed', 'Mixed']] },
      { key: 'core', label: 'Hollow middle', type: 'range', min: 0, max: 0.8, step: 0.02, value: 0.2 },
      { key: 'outline', label: 'Outlined', type: 'check', value: false },
      { key: 'textRoom', label: 'Leave room for the title', type: 'check', value: true },
    ],

    generate(rng, p, ctx) {
      const { palette, unit } = ctx;
      const area = TextLayer.freeArea(ctx, p.textRoom);
      const cols = Math.max(1, Math.round(Math.sqrt(p.count * area.w / area.h))), rows = Math.ceil(p.count / cols);
      const cw = area.w / cols, ch = area.h / rows;
      const accents = Palettes.visible(palette), out = [];
      const start = ctx.colorRng.int(0, accents.length - 1);
      for (let i = 0; i < p.count; i++) {
        const c = i % cols, r = Math.floor(i / cols);
        const dir = p.turns === 'up' ? 0 : p.turns === 'pairs' ? (r % 2 ? 2 : 0) : rng.int(0, 3);
        // A rainbow is 2R wide and R tall; turned sideways it's R wide and 2R tall. Center its box in the cell.
        const R = (dir % 2 ? Math.min(ch / 2, cw) : Math.min(cw / 2, ch)) * 0.94;
        const a = dir * Math.PI / 2, ox = R / 2 * Math.sin(a), oy = -R / 2 * Math.cos(a);
        const cx = area.x + (c + 0.5) * cw - ox, cy = area.y + (r + 0.5) * ch - oy;
        out.push(Shapes.group(rainbow(R, p, accents, start + i, palette, unit), `translate(${Geom.num(cx)} ${Geom.num(cy)}) rotate(${dir * 90})`));
      }
      return out;
    },
  });

  // One rainbow at the origin, opening upward: bands from outside in.
  function rainbow(R, p, accents, offset, palette, unit) {
    const out = [], inner = R * p.core, bw = (R - inner) / p.bands;
    for (let k = 0; k < p.bands; k++) {
      const ro = R - k * bw, ri = ro - bw * (1 - p.gap);
      const color = accents[(k + offset) % accents.length];
      const d = band(ro, ri);
      out.push(Shapes.path(d, p.outline ? { stroke: color, sw: Math.max(0.4 * unit, bw * 0.08) } : { fill: color }));
    }
    return out;
  }

  // A half ring between radii ri and ro, flat side down.
  function band(ro, ri) {
    const n = Geom.num;
    return `M${n(-ro)} 0A${n(ro)} ${n(ro)} 0 0 1 ${n(ro)} 0L${n(ri)} 0A${n(ri)} ${n(ri)} 0 0 0 ${n(-ri)} 0Z`;
  }
})();

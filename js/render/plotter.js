// Pen-plotter conversion: strokes only, one pen per color, paths ordered so the pen travels as little as possible.
const Plotter = (() => {
  const PEN = 0.35;   // pen width in mm

  // Shapes → stroke-only shapes, grouped by color and ordered by nearest neighbor within each color.
  function convert(shapes, ctx) {
    const pens = new Map();
    const visit = (sh, transform) => {
      if (sh.t === 'group') { sh.children.forEach(c => visit(c, (transform ? transform + ' ' : '') + (sh.transform || ''))); return; }
      const color = Shapes.colorOf(sh);
      if (!color) return;
      const s = { stroke: color, sw: PEN, cap: 'round', join: 'round' };
      const item = { shape: { ...sh, s }, transform, ends: ends(sh) };
      if (!pens.has(color)) pens.set(color, []);
      pens.get(color).push(item);
    };
    shapes.forEach(sh => visit(sh, ''));
    const out = [];
    for (const items of pens.values()) for (const it of order(items)) out.push(it.transform ? Shapes.group([it.shape], it.transform) : it.shape);
    return out;
  }

  // Start and end points of a shape (approximate for arcs and text).
  function ends(sh) {
    if (sh.t === 'poly' && sh.pts.length) return [sh.pts[0], sh.closed ? sh.pts[0] : sh.pts[sh.pts.length - 1]];
    if (sh.t === 'circle') return [[sh.cx + sh.r, sh.cy], [sh.cx + sh.r, sh.cy]];
    if (sh.t === 'rect') return [[sh.x, sh.y], [sh.x, sh.y]];
    if (sh.t === 'text') return [[sh.x, sh.y], [sh.x, sh.y]];
    const m = /M\s*(-?[\d.]+)[ ,](-?[\d.]+)/.exec(sh.d || '');
    const p = m ? [+m[1], +m[2]] : [0, 0];
    return [p, p];
  }

  // Greedy nearest-neighbor order. Open polylines may be drawn backwards when that saves travel.
  function order(items) {
    const left = items.slice(), out = [];
    let at = [0, 0];
    while (left.length) {
      let best = 0, bestD = Infinity, flip = false;
      for (let i = 0; i < left.length; i++) {
        const [a, b] = left[i].ends;
        const da = (a[0] - at[0]) ** 2 + (a[1] - at[1]) ** 2, db = (b[0] - at[0]) ** 2 + (b[1] - at[1]) ** 2;
        if (da < bestD) { bestD = da; best = i; flip = false; }
        if (db < bestD && left[i].shape.t === 'poly' && !left[i].shape.closed) { bestD = db; best = i; flip = true; }
      }
      const it = left.splice(best, 1)[0];
      if (flip) { it.shape = { ...it.shape, pts: it.shape.pts.slice().reverse() }; it.ends = [it.ends[1], it.ends[0]]; }
      out.push(it);
      at = it.ends[1];
    }
    return out;
  }

  // Total pen-up travel in mm for shapes in order (to show how much ordering saved).
  function travel(shapes) {
    let at = [0, 0], d = 0;
    for (const sh of shapes) { const [a, b] = ends(sh.t === 'group' ? sh.children[0] : sh); d += Math.hypot(a[0] - at[0], a[1] - at[1]); at = b; }
    return d;
  }

  return { convert, travel };
})();

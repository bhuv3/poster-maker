// Swiss / Bauhaus: a strict grid filled with circles, quarter circles, bars, and stripes in a few flat colors.
(() => {
  Styles.register({
    id: 'swiss',
    name: 'Swiss',
    icon: 'grid',
    params: [
      { key: 'columns', label: 'Columns', type: 'range', min: 2, max: 8, step: 1, value: 4 },
      { key: 'density', label: 'Density', type: 'range', min: 0.15, max: 1, step: 0.05, value: 0.55 },
      { key: 'mix', label: 'Shapes', type: 'choice', value: 'mixed', options: [['mixed', 'Mixed'], ['round', 'Round'], ['bars', 'Bars']] },
      { key: 'gutter', label: 'Gutter', type: 'range', min: 0, max: 14, step: 1, value: 4 },
      { key: 'outlines', label: 'Outlined shapes', type: 'range', min: 0, max: 1, step: 0.05, value: 0.15 },
      { key: 'hero', label: 'Big circle behind', type: 'check', value: true },
      { key: 'gridLines', label: 'Show grid lines', type: 'check', value: false },
      { key: 'tilt', label: 'Tilt', type: 'range', min: -45, max: 45, step: 5, value: 0 },
      { key: 'textRoom', label: 'Leave room for the title', type: 'check', value: true },
    ],

    generate(rng, p, ctx) {
      const { box, unit, palette } = ctx;
      const crng = ctx.colorRng;
      const accents = Palettes.visible(palette);
      const g = p.gutter * unit, cols = p.columns;
      const cw = (box.w - (cols - 1) * g) / cols;
      const rows = Math.max(2, Math.round((box.h + g) / (cw + g)));
      const ch = (box.h - (rows - 1) * g) / rows;
      const cell = (c, r) => ({ x: box.x + c * (cw + g), y: box.y + r * (ch + g) });
      const area = (c, r, sc, sr) => ({ ...cell(c, r), w: sc * cw + (sc - 1) * g, h: sr * ch + (sr - 1) * g });
      const used = new Uint8Array(cols * rows);
      reserveText(used, cols, rows, p, ctx);
      const out = [];
      const color = () => crng.pick(accents);
      const style = c => crng.chance(p.outlines) ? { stroke: c, sw: 2.2 * unit } : { fill: c };

      if (p.gridLines) out.push(...gridLines(cols, rows, cell, cw, ch, g, box, palette.ink, unit));
      if (p.hero) out.push(hero(rng, cols, rows, area, color(), used));

      const free = (c, r, sc, sr) => {
        if (c + sc > cols || r + sr > rows) return false;
        for (let y = r; y < r + sr; y++) for (let x = c; x < c + sc; x++) if (used[y * cols + x]) return false;
        return true;
      };
      const take = (c, r, sc, sr) => { for (let y = r; y < r + sr; y++) for (let x = c; x < c + sc; x++) used[y * cols + x] = 1; };
      const target = Math.round(p.density * (used.length - used.reduce((a, b) => a + b, 0)));
      let filled = 0;
      for (const idx of rng.shuffle([...used.keys()])) {
        if (filled >= target) break;
        const c = idx % cols, r = Math.floor(idx / cols);
        if (used[idx]) continue;
        const kind = pickKind(rng, p.mix);
        const [sc, sr] = pickSpan(rng, kind).find(([a, b]) => free(c, r, a, b)) || [1, 1];
        take(c, r, sc, sr);
        filled += sc * sr;
        out.push(...shapeFor(kind, area(c, r, sc, sr), rng, color(), style, palette.ink, unit));
      }
      if (!p.tilt) return out;
      return [Shapes.group(out, `rotate(${p.tilt} ${ctx.w / 2} ${ctx.h / 2})`)];
    },
  });

  // Marks the rows the title will sit on as taken, so shapes stay clear of it.
  function reserveText(used, cols, rows, p, ctx) {
    const t = ctx.text;
    if (!p.textRoom || !t.show || !t.title) return;
    const n = Math.max(1, Math.round(rows * 0.3));
    const place = t.placement;
    const from = place.startsWith('top') ? 0 : place === 'center' ? Math.floor((rows - n) / 2) : place === 'vertical' || place === 'auto' ? -1 : rows - n;
    if (from < 0) return;
    for (let r = from; r < from + n; r++) for (let c = 0; c < cols; c++) used[r * cols + c] = 1;
  }

  // Which shape to draw next, weighted by the Shapes choice.
  function pickKind(rng, mix) {
    const kinds = ['circle', 'quarter', 'half', 'bar', 'square', 'stripes', 'ring', 'triangle', 'dots'];
    const weights = {
      mixed: [3, 3, 2, 3, 1, 1.5, 1, 1, 1],
      round: [5, 4, 3, 0.5, 0, 0.5, 2, 0, 1],
      bars: [0.5, 0.5, 0.5, 6, 2, 2, 0, 1, 0.5],
    }[mix] || [1, 1, 1, 1, 1, 1, 1, 1, 1];
    return rng.weighted(kinds, weights);
  }

  // Cell spans to try for a shape, biggest first ([columns, rows]).
  function pickSpan(rng, kind) {
    if (kind === 'bar') return rng.chance(0.6) ? [[rng.int(2, 4), 1], [2, 1], [1, 1]] : [[1, rng.int(2, 4)], [1, 2], [1, 1]];
    if (kind === 'half') return rng.chance(0.5) ? [[2, 1], [1, 1]] : [[1, 2], [1, 1]];
    const s = rng.weighted([1, 2, 3], [5, 3, 1]);
    return [[s, s], [Math.max(1, s - 1), Math.max(1, s - 1)], [1, 1]];
  }

  // Shapes for one grid area.
  function shapeFor(kind, a, rng, color, style, ink, unit) {
    const cx = a.x + a.w / 2, cy = a.y + a.h / 2, r = Math.min(a.w, a.h) / 2;
    const S = Shapes;
    switch (kind) {
      case 'circle': return [S.circle(cx, cy, r, style(color))];
      case 'ring': return [S.circle(cx, cy, r * 0.82, { stroke: color, sw: r * 0.32 })];
      case 'square': return [S.rect(a.x, a.y, a.w, a.h, style(color))];
      case 'bar': return [S.rect(a.x, a.y, a.w, a.h, style(color))];
      case 'quarter': {
        const corner = rng.int(0, 3), R = Math.min(a.w, a.h);
        const px = corner % 2 ? a.x + a.w : a.x, py = corner > 1 ? a.y + a.h : a.y;
        const start = [0, Math.PI / 2, -Math.PI / 2, Math.PI][corner];
        return [S.path(S.arcData(px, py, R, start, start + Math.PI / 2, true), style(color))];
      }
      case 'half': {
        const wide = a.w >= a.h, R = wide ? Math.min(a.w / 2, a.h) : Math.min(a.h / 2, a.w), flip = rng.chance(0.5);
        if (wide) {
          const y = flip ? a.y : a.y + a.h;
          return [S.path(S.arcData(cx, y, R, flip ? 0 : Math.PI, flip ? Math.PI : 2 * Math.PI, true), style(color))];
        }
        const x = flip ? a.x : a.x + a.w;
        return [S.path(S.arcData(x, cy, R, flip ? -Math.PI / 2 : Math.PI / 2, flip ? Math.PI / 2 : 3 * Math.PI / 2, true), style(color))];
      }
      case 'triangle': {
        const k = rng.int(0, 3);
        const pts = [[a.x, a.y], [a.x + a.w, a.y], [a.x + a.w, a.y + a.h], [a.x, a.y + a.h]];
        pts.splice(k, 1);
        return [S.poly(pts, style(color), true)];
      }
      case 'stripes': {
        const n = rng.int(4, 9), out = [], vertical = rng.chance(0.5), sw = (vertical ? a.w : a.h) / n * 0.45;
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          out.push(vertical ? S.line(a.x + t * a.w, a.y, a.x + t * a.w, a.y + a.h, { stroke: color, sw })
            : S.line(a.x, a.y + t * a.h, a.x + a.w, a.y + t * a.h, { stroke: color, sw }));
        }
        return out;
      }
      case 'dots': {
        const n = rng.int(3, 5), out = [], step = Math.min(a.w, a.h) / n;
        for (let y = 0; y < Math.floor(a.h / step); y++) for (let x = 0; x < Math.floor(a.w / step); x++) {
          out.push(S.circle(a.x + (x + 0.5) * step, a.y + (y + 0.5) * step, step * 0.22, { fill: ink }));
        }
        return out;
      }
      default: return [];
    }
  }

  // A big circle across several cells, drawn first so other shapes sit on top of it. It stays off the title rows.
  function hero(rng, cols, rows, area, color, used) {
    const s = Math.min(cols, rows, rng.int(2, 3));
    const clear = (c, r) => { for (let y = r; y < r + s; y++) if (used[y * cols + c]) return false; return true; };
    const spots = [];
    for (let r = 0; r <= rows - s; r++) for (let c = 0; c <= cols - s; c++) if (clear(c, r)) spots.push([c, r]);
    const [c, r] = spots.length ? rng.pick(spots) : [rng.int(0, cols - s), rng.int(0, rows - s)];
    const a = area(c, r, s, s);
    return Shapes.circle(a.x + a.w / 2, a.y + a.h / 2, Math.min(a.w, a.h) / 2, { fill: color });
  }

  // Thin lines along the grid, like a designer's layout sheet.
  function gridLines(cols, rows, cell, cw, ch, g, box, ink, unit) {
    const out = [], s = { stroke: ink, sw: 0.25 * unit, opacity: 0.25 };
    for (let c = 0; c < cols; c++) {
      const x = cell(c, 0).x;
      out.push(Shapes.line(x, box.y, x, box.y + box.h, s), Shapes.line(x + cw, box.y, x + cw, box.y + box.h, s));
    }
    for (let r = 0; r < rows; r++) {
      const y = cell(0, r).y;
      out.push(Shapes.line(box.x, y, box.x + box.w, y, s), Shapes.line(box.x, y + ch, box.x + box.w, y + ch, s));
    }
    return out;
  }
})();

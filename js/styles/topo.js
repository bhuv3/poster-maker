// Topographic: contour lines of an imaginary landscape (marching squares on fractal noise), as lines or colored bands.
(() => {
  Styles.register({
    id: 'topo',
    name: 'Topographic',
    icon: 'topo',
    animated: true,
    params: [
      { key: 'levels', label: 'Contours', type: 'range', min: 4, max: 60, step: 1, value: 18 },
      { key: 'scale', label: 'Terrain size', type: 'range', min: 0.3, max: 4, step: 0.05, value: 0.9 },
      { key: 'octaves', label: 'Detail', type: 'range', min: 1, max: 6, step: 1, value: 3 },
      { key: 'warp', label: 'Warp', type: 'range', min: 0, max: 1.5, step: 0.05, value: 0.25 },
      { key: 'look', label: 'Look', type: 'choice', value: 'lines', options: [['lines', 'Lines'], ['bands', 'Bands'], ['both', 'Both']] },
      { key: 'weight', label: 'Line weight', type: 'range', min: 0.1, max: 2, step: 0.05, value: 0.45 },
      { key: 'index', label: 'Bold every', type: 'range', min: 0, max: 10, step: 1, value: 5, hint: '0 turns bold index contours off' },
      { key: 'peaks', label: 'Mark the peaks', type: 'check', value: false },
    ],

    generate(rng, p, ctx) {
      const { unit, palette } = ctx;
      const cell = Math.max(1.2, 2.2 * unit / Math.sqrt(ctx.quality));
      const field = heightField(p, ctx, cell);
      const accents = Palettes.visible(palette);
      const ramp = [palette.bg, ...accents];
      const out = [];
      const levels = [];
      for (let k = 1; k <= p.levels; k++) levels.push({ k, t: k / (p.levels + 1), loops: contour(field, k / (p.levels + 1)) });
      if (p.look !== 'lines') {
        for (const { k, loops } of levels) {
          if (!loops.length) continue;
          const d = loops.map(l => Geom.pathData(Geom.simplify(l, 0.08 * unit), true)).join('');
          out.push(Shapes.path(d, { fill: gradient(ramp, k / p.levels), rule: 'evenodd' }));
        }
      }
      if (p.look !== 'bands') {
        for (const { k, loops } of levels) {
          const bold = p.index && k % p.index === 0;
          const s = { stroke: palette.ink, sw: p.weight * unit * (bold ? 2.2 : 1), join: 'round', opacity: p.look === 'both' ? 0.75 : 1 };
          for (const l of loops) out.push(Shapes.poly(Geom.smooth(Geom.simplify(l, 0.06 * unit), 2), s, true));
        }
      }
      if (p.peaks) out.push(...peaks(field, palette.ink, unit, ctx));
      return out;
    },
  });

  // Heights on a grid covering the page plus a border. The border is pushed low so every contour closes off-page.
  function heightField(p, ctx, cell) {
    const { full, unit, noise, time } = ctx;
    const pad = 3;
    const nx = Math.ceil(full.w / cell) + pad * 2 + 1, ny = Math.ceil(full.h / cell) + pad * 2 + 1;
    const x0 = full.x - pad * cell, y0 = full.y - pad * cell;
    const f = p.scale / (180 * unit), warp = p.warp * 1.2;
    const r = 0.5, dy = Math.sin(time * Math.PI * 2) * r, dz = Math.cos(time * Math.PI * 2) * r;
    const sample = ctx.animating
      ? (x, y) => noise.fbm3(x + warp * noise.noise3(x * 0.7 + 9, y * 0.7, dz), y + dy + warp * noise.noise3(x * 0.7, y * 0.7 + 9, dz), dz, p.octaves)
      : (x, y) => noise.fbm2(x + warp * noise.noise2(x * 0.7 + 9, y * 0.7), y + warp * noise.noise2(x * 0.7, y * 0.7 + 9), p.octaves);
    const v = new Float32Array(nx * ny);
    let lo = Infinity, hi = -Infinity;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const val = sample((x0 + i * cell) * f, (y0 + j * cell) * f);
      v[j * nx + i] = val;
      if (i > 0 && j > 0 && i < nx - 1 && j < ny - 1) { lo = Math.min(lo, val); hi = Math.max(hi, val); }
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const edge = i === 0 || j === 0 || i === nx - 1 || j === ny - 1;
      v[j * nx + i] = edge ? -1 : (v[j * nx + i] - lo) / (hi - lo || 1);
    }
    return { v, nx, ny, x0, y0, cell };
  }

  // Closed loops where the height crosses t (marching squares, then joining segments end to end).
  function contour(field, t) {
    const { v, nx, ny, x0, y0, cell } = field;
    const pts = new Map(), next = new Map();
    // Edge ids: horizontal edge (i,j)-(i+1,j) is 2·idx, vertical edge (i,j)-(i,j+1) is 2·idx+1.
    const point = (e) => {
      if (pts.has(e)) return;
      const idx = e >> 1, i = idx % nx, j = (idx - i) / nx;
      const a = v[idx], b = e & 1 ? v[idx + nx] : v[idx + 1];
      const s = (t - a) / (b - a);
      pts.set(e, e & 1 ? [x0 + i * cell, y0 + (j + s) * cell] : [x0 + (i + s) * cell, y0 + j * cell]);
    };
    const link = (a, b) => { point(a); point(b); next.set(a, b); };
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const idx = j * nx + i;
      const tl = v[idx] > t, tr = v[idx + 1] > t, br = v[idx + nx + 1] > t, bl = v[idx + nx] > t;
      const code = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
      if (code === 0 || code === 15) continue;
      const top = 2 * idx, left = 2 * idx + 1, bottom = 2 * (idx + nx), right = 2 * (idx + 1) + 1;
      // Each segment keeps the high side on its right, so loops chain one way round.
      switch (code) {
        case 1: link(left, bottom); break;
        case 2: link(bottom, right); break;
        case 3: link(left, right); break;
        case 4: link(right, top); break;
        case 5: if (centerHigh(v, idx, nx, t)) { link(left, top); link(right, bottom); } else { link(right, top); link(left, bottom); } break;
        case 6: link(bottom, top); break;
        case 7: link(left, top); break;
        case 8: link(top, left); break;
        case 9: link(top, bottom); break;
        case 10: if (centerHigh(v, idx, nx, t)) { link(top, right); link(bottom, left); } else { link(top, left); link(bottom, right); } break;
        case 11: link(top, right); break;
        case 12: link(right, left); break;
        case 13: link(right, bottom); break;
        case 14: link(bottom, left); break;
      }
    }
    const loops = [], seen = new Set();
    for (const start of next.keys()) {
      if (seen.has(start)) continue;
      const loop = [];
      for (let e = start; e !== undefined && !seen.has(e); e = next.get(e)) { seen.add(e); loop.push(pts.get(e)); }
      if (loop.length > 2) loops.push(loop);
    }
    return loops;
  }

  // True when a saddle cell's middle is above t (decides how its two segments pair up).
  function centerHigh(v, idx, nx, t) { return (v[idx] + v[idx + 1] + v[idx + nx] + v[idx + nx + 1]) / 4 > t; }

  // Small triangles on the highest points.
  function peaks(field, ink, unit, ctx) {
    const { v, nx, ny, x0, y0, cell } = field, out = [], s = 1.6 * unit;
    for (let j = 2; j < ny - 2; j++) for (let i = 2; i < nx - 2; i++) {
      const h = v[j * nx + i];
      if (h < 0.82) continue;
      let top = true;
      for (let dj = -2; dj <= 2 && top; dj++) for (let di = -2; di <= 2; di++) if ((di || dj) && v[(j + dj) * nx + i + di] >= h) { top = false; break; }
      if (!top) continue;
      const x = x0 + i * cell, y = y0 + j * cell;
      if (!Geom.inRect(x, y, ctx.full)) continue;
      out.push(Shapes.poly([[x, y - s], [x + s * 0.9, y + s * 0.6], [x - s * 0.9, y + s * 0.6]], { fill: ink }, true));
    }
    return out;
  }

  // Color at t (0–1) along a list of colors.
  function gradient(colors, t) {
    const x = Math.max(0, Math.min(0.9999, t)) * (colors.length - 1), i = Math.floor(x);
    return Palettes.mix(colors[i], colors[i + 1], x - i);
  }
})();

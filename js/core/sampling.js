// Point sampling and a spatial grid for fast "anything near here?" checks.
const Sampling = (() => {
  // A grid of buckets, cell mm wide. add(x, y, item) and near(x, y, r) → items within reach (not exact).
  function grid(cell) {
    const buckets = new Map();
    const key = (cx, cy) => (cx + 50000) * 100000 + (cy + 50000);
    return {
      add(x, y, item) {
        const k = key(Math.floor(x / cell), Math.floor(y / cell));
        let b = buckets.get(k);
        if (!b) buckets.set(k, b = []);
        b.push(item);
      },
      near(x, y, r) {
        const out = [];
        const x0 = Math.floor((x - r) / cell), x1 = Math.floor((x + r) / cell);
        const y0 = Math.floor((y - r) / cell), y1 = Math.floor((y + r) / cell);
        for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
          const b = buckets.get(key(cx, cy));
          if (b) for (const it of b) out.push(it);
        }
        return out;
      },
    };
  }

  // Bridson's Poisson-disc sampling: points in rect at least r apart, at most max of them.
  function poisson(rng, rect, r, max = Infinity, k = 20) {
    const cell = r / Math.SQRT2;
    const g = grid(cell);
    const pts = [], active = [];
    const ok = (x, y) => x >= rect.x && y >= rect.y && x <= rect.x + rect.w && y <= rect.y + rect.h
      && g.near(x, y, r).every(p => (p[0] - x) ** 2 + (p[1] - y) ** 2 >= r * r);
    const add = (x, y) => { const p = [x, y]; pts.push(p); active.push(p); g.add(x, y, p); };
    add(rect.x + rng.next() * rect.w, rect.y + rng.next() * rect.h);
    while (active.length && pts.length < max) {
      const idx = Math.floor(rng.next() * active.length), [px, py] = active[idx];
      let found = false;
      for (let t = 0; t < k; t++) {
        const a = rng.next() * Math.PI * 2, d = r * (1 + rng.next());
        const x = px + Math.cos(a) * d, y = py + Math.sin(a) * d;
        if (ok(x, y)) { add(x, y); found = true; break; }
      }
      if (!found) active.splice(idx, 1);
    }
    return pts;
  }

  return { grid, poisson };
})();

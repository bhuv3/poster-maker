// Seeded random numbers. Everything visual uses these, so a seed always gives the same poster.
const Random = (() => {
  // Mulberry32: a fast generator returning numbers in [0, 1).
  function mulberry(seed) {
    let a = seed | 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Any values → a 32-bit number (FNV-1a). Used to split one seed into several.
  function hash(...parts) {
    let h = 2166136261;
    for (const part of parts) {
      const s = String(part);
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      h ^= 0x9e; h = Math.imul(h, 16777619);
    }
    return (h >>> 0) % 1000000000;
  }

  // A generator with helpers: next, range, int, pick, chance, gaussian, shuffle, weighted.
  function create(seed) {
    const next = mulberry(seed);
    const r = {
      next,
      range: (a, b) => a + (b - a) * next(),
      int: (a, b) => Math.floor(a + (b - a + 1) * next()),
      pick: list => list[Math.floor(next() * list.length)],
      chance: p => next() < p,
      gaussian: (mean = 0, sd = 1) => mean + sd * Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next()),
      shuffle: list => {
        const out = list.slice();
        for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
        return out;
      },
      weighted: (items, weights) => {
        let total = 0;
        for (const w of weights) total += w;
        let t = next() * total;
        for (let i = 0; i < items.length; i++) { t -= weights[i]; if (t <= 0) return items[i]; }
        return items[items.length - 1];
      },
    };
    return r;
  }

  // A fresh seed for a new poster (the only place Math.random is used).
  function newSeed() { return 1 + Math.floor(Math.random() * 999999998); }

  return { create, hash, newSeed };
})();

// Mutate grid: the current poster in the middle, eight variations around it. Click one to breed from it;
// click the middle one to keep it.
const Mutate = (() => {
  const QUALITY = 0.55;
  let center = null, cells = [], timer = null;

  // Opens the grid around a poster.
  function open(state) {
    center = Poster.clone(state);
    const el = Overlay.open(`<header class="sheet-head"><h2>Mutate</h2><span class="hint">Click a variation to breed from it. Click the middle one to use it.</span>
      <button class="icon-btn" data-close aria-label="Close">${Icons.svg('x')}</button></header>
      <div class="mutate-grid" id="mutateGrid"></div>
      <footer class="sheet-foot"><span class="spacer"></span><button class="ghost" id="mutReroll">${Icons.svg('dice', 16)}New variations</button>
      <button class="primary" id="mutUse">${Icons.svg('check', 16)}Use the middle one</button></footer>`, { wide: true, label: 'Mutate', onClose: () => clearTimeout(timer) });
    el.querySelector('#mutReroll').addEventListener('click', () => fill());
    el.querySelector('#mutUse').addEventListener('click', use);
    fill();
  }

  // Makes eight new variations and draws the grid (one cell per frame, so the window stays responsive).
  function fill() {
    const rng = Random.create(Random.newSeed());
    cells = [...Array(9).keys()].map(i => i === 4 ? center : vary(center, rng));
    const grid = document.getElementById('mutateGrid');
    const L = Pages.layout(center.page);
    grid.style.maxWidth = `calc((100vh - 190px) / 3 * ${(L.sheet.w / L.sheet.h).toFixed(4)} * 3 + 28px)`;   // three rows fit on screen
    grid.innerHTML = cells.map((c, i) => `<button class="mutate-cell ${i === 4 ? 'center' : ''}" data-i="${i}" style="aspect-ratio:${L.sheet.w} / ${L.sheet.h}" aria-label="${i === 4 ? 'Current poster' : 'Variation ' + (i + (i > 4 ? 0 : 1))}"></button>`).join('');
    grid.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => pick(+b.dataset.i)));
    clearTimeout(timer);
    const draw = i => {
      if (i >= 9 || !document.getElementById('mutateGrid')) return;
      grid.children[i].innerHTML = Composer.build(cells[i], { quality: QUALITY }).svg;
      timer = setTimeout(() => draw(i + 1), 0);
    };
    draw(0);
  }

  // A variation: new detail, sometimes a new layout or colors, and a few settings nudged. Locks are respected.
  function vary(state, rng) {
    const s = Poster.clone(state), def = Styles.get(s.style);
    const p = { ...Poster.params(s, def) };
    if (!s.locks.layout) {
      s.seeds.detail = Random.newSeed();
      if (rng.chance(0.4)) s.seeds.layout = Random.newSeed();
      const ranges = def.params.filter(x => x.type === 'range');
      for (const x of rng.shuffle(ranges).slice(0, rng.int(1, 3))) {
        const span = (x.max - x.min) * 0.2, v = p[x.key] + rng.range(-span, span);
        p[x.key] = Math.round(Math.max(x.min, Math.min(x.max, v)) / x.step) * x.step;
      }
      const choices = def.params.filter(x => x.type === 'choice' || x.type === 'select');
      if (choices.length && rng.chance(0.25)) { const x = rng.pick(choices); p[x.key] = rng.pick(x.options)[0]; }
      s.params[s.style] = p;
    }
    if (!s.locks.palette && rng.chance(0.35)) s.seeds.color = Random.newSeed();
    return s;
  }

  // Breeds from a variation, or keeps the middle one.
  function pick(i) {
    if (i === 4) { use(); return; }
    center = cells[i];
    fill();
  }

  function use() {
    const chosen = center;
    Overlay.close();
    App.set(chosen);
  }

  return { open };
})();

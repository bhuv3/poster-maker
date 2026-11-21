// Left rail: one card per style with a live preview. Each preview is the very poster you'd get by clicking it
// (same page, text, seeds, and settings), drawn at full detail and shrunk to a small image.
const Rail = (() => {
  const $ = id => document.getElementById(id);
  const WIDTH = 320;         // preview image width in pixels (sharp on 2× screens)
  const keys = new Map();    // style id → what its preview was drawn from
  const urls = new Map();    // style id → its current image URL (freed when replaced)
  let timer = null, queue = [], generation = 0;

  // Builds the cards once. Previews fill in afterwards.
  function init() {
    $('rail').innerHTML = Styles.all().map((s, i) => `<button class="style-card" data-style="${s.id}" title="${s.name} (${i + 1})">
      <span class="style-thumb" id="thumb-${s.id}"></span>
      <span class="style-name">${Icons.svg(s.icon || 'grid', 14)}${s.name}</span><kbd>${i + 1}</kbd></button>`).join('');
    $('rail').querySelectorAll('[data-style]').forEach(b => b.addEventListener('click', () => App.setStyle(b.dataset.style)));
  }

  // Highlights the current style and redraws previews whose poster changed, a moment after changes stop.
  function update(state) {
    $('rail').querySelectorAll('[data-style]').forEach(b => b.classList.toggle('active', b.dataset.style === state.style));
    const L = Pages.layout(state.page);
    $('rail').style.setProperty('--thumb-ratio', `${L.sheet.w} / ${L.sheet.h}`);
    clearTimeout(timer);
    const gen = ++generation;
    timer = setTimeout(() => {
      queue = Styles.all().map(s => s.id).filter(id => keys.get(id) !== previewKey(state, id));
      drawNext(state, gen);
    }, 300);
  }

  // Everything a style's preview depends on: the whole poster as it would be with that style picked.
  function previewKey(state, id) { return JSON.stringify({ ...state, style: id, locks: null, anim: null }); }

  // Draws the next queued preview as an image, then moves on. Stops if the poster changed meanwhile.
  async function drawNext(state, gen) {
    const id = queue.shift();
    if (!id || gen !== generation) return;
    try {
      const r = Composer.build({ ...state, style: id });
      const h = Math.round(WIDTH * r.ctx.L.sheet.h / r.ctx.L.sheet.w);
      const blob = await Exporter.rasterize(r.svg, WIDTH, h, 'image/png');
      if (gen !== generation) return;
      const url = URL.createObjectURL(blob);
      $('thumb-' + id).innerHTML = `<img src="${url}" alt="">`;
      if (urls.has(id)) URL.revokeObjectURL(urls.get(id));
      urls.set(id, url);
      keys.set(id, previewKey(state, id));
    } catch (e) { console.warn('Preview failed for ' + id, e); }
    timer = setTimeout(() => drawNext(state, gen), 16);
  }

  return { init, update };
})();

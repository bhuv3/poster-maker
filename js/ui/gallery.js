// Saved posters in this browser: each keeps its full state and a small thumbnail. Export and import as JSON.
const Gallery = (() => {
  const KEY = 'gallery';
  const THUMB_W = 240;

  function list() { return Prefs.get(KEY, []); }

  // Saves a poster with a thumbnail. False when storage is full.
  async function add(state) {
    const r = Composer.build(state, { exportSize: true });
    let thumb = '';
    try { thumb = await Exporter.thumbnail(r.svg, r.ctx.L.sheet, THUMB_W); } catch (e) { /* saved without a picture */ }
    const title = (state.text.title || '').replace(/\n/g, ' ').trim() || 'Untitled';
    const item = { id: Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), title, style: state.style, date: Date.now(), state, thumb };
    return Prefs.set(KEY, [item, ...list()]);
  }

  function remove(id) { Prefs.set(KEY, list().filter(i => i.id !== id)); }

  // Opens the gallery overlay.
  function open() {
    const items = list();
    const grid = items.length ? `<div class="gallery-grid">${items.map(card).join('')}</div>`
      : '<p class="empty">Nothing saved yet. Press S (or Save) to keep the poster you’re looking at.</p>';
    const el = Overlay.open(`<header class="sheet-head"><h2>Gallery <span class="hint">${items.length} saved</span></h2>
        <button class="ghost small" id="galImport">${Icons.svg('upload', 14)}Import</button>
        <button class="ghost small" id="galExport" ${items.length ? '' : 'disabled'}>${Icons.svg('download', 14)}Export all</button>
        <button class="icon-btn" data-close aria-label="Close">${Icons.svg('x')}</button></header>${grid}`, { wide: true, label: 'Gallery' });
    el.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', e => {
      if (e.target.closest('[data-del]')) return;
      const item = list().find(i => i.id === b.dataset.open);
      Overlay.close();
      if (item) App.set(Poster.upgrade(item.state));
    }));
    el.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); remove(b.dataset.del); open(); }));
    el.querySelector('#galExport').addEventListener('click', exportAll);
    el.querySelector('#galImport').addEventListener('click', importFile);
  }

  // One saved poster.
  function card(i) {
    const style = Styles.get(i.style).name, date = new Date(i.date).toLocaleDateString();
    return `<div class="gallery-item" data-open="${i.id}" role="button" tabindex="0" title="Open">
      ${i.thumb ? `<img src="${i.thumb}" alt="">` : '<div class="thumb-missing"></div>'}
      <span class="gallery-meta"><b>${Controls.esc(i.title)}</b>${style} · #${i.state.seeds.layout} · ${date}</span>
      <button class="icon-btn gallery-del" data-del="${i.id}" title="Delete" aria-label="Delete">${Icons.svg('trash', 16)}</button></div>`;
  }

  // Downloads every saved poster as one JSON file.
  function exportAll() {
    const data = JSON.stringify({ app: 'poster-maker', version: 1, items: list() });
    Exporter.download(new Blob([data], { type: 'application/json' }), `poster-gallery-${new Date().toISOString().slice(0, 10)}.json`);
  }

  // Adds the posters from a gallery JSON file (skips ones already here).
  function importFile() {
    const input = document.getElementById('fileInput');
    input.value = '';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      try {
        const data = JSON.parse(await input.files[0].text());
        const have = new Set(list().map(i => i.id));
        const fresh = (data.items || []).filter(i => i && i.id && i.state && !have.has(i.id));
        const ok = Prefs.set(KEY, [...fresh, ...list()]);
        Toast.show(ok ? `Imported ${fresh.length} poster${fresh.length === 1 ? '' : 's'}` : 'Not enough room in this browser');
        open();
      } catch (e) { Toast.show('That file isn’t a poster gallery'); }
    };
    input.click();
  }

  return { add, open, list };
})();

// Right panel: the current style's settings, palette, text, page, and print finish, as collapsible sections.
const Panel = (() => {
  const $ = id => document.getElementById(id);
  const open = new Set(Prefs.get('openSections', ['style', 'palette', 'text']));

  const TEXT = [
    { key: 'show', label: 'Show text', type: 'check' },
    { key: 'title', label: 'Title', type: 'textarea', rows: 2 },
    { key: 'subtitle', label: 'Subtitle', type: 'text' },
    { key: 'small', label: 'Small line', type: 'text' },
    { key: 'placement', label: 'Placement', type: 'select', options: TextLayer.PLACEMENTS },
    { key: 'font', label: 'Font', type: 'select', options: [], hint: 'Surprise me picks a new font with every new poster' },
    { key: 'case', label: 'Capitals', type: 'choice', options: [['auto', 'Font’s choice'], ['asis', 'As typed'], ['upper', 'ALL CAPS']] },
    { key: 'size', label: 'Title size', type: 'range', min: 0.3, max: 1.6, step: 0.05 },
    { key: 'color', label: 'Color', type: 'choice', options: [['auto', 'Auto'], ['ink', 'Ink'], ['accent', 'Accent'], ['paper', 'Paper']], hint: 'Auto picks the palette color (or a shade of one) that reads best over the art' },
    { key: 'fallback', label: 'When no color can stand out', type: 'choice', options: [['fade', 'Fade the art'], ['paper', 'Paper box'], ['color', 'Color box'], ['none', 'Leave it']],
      when: s => s.text.color === 'auto' },
    { key: 'band', label: 'Paper band behind text', type: 'check' },
  ];
  const PAGE = [
    { key: 'size', label: 'Paper', type: 'select', options: Pages.SIZES.map(s => [s.id, `${s.name} · ${Math.round(s.w)} × ${Math.round(s.h)} mm`]) },
    { key: 'orientation', label: 'Orientation', type: 'choice', options: [['portrait', 'Portrait'], ['landscape', 'Landscape']] },
    { key: 'margin', label: 'Margin', type: 'range', min: 0, max: 60, step: 1, unit: ' mm' },
    { key: 'bleed', label: 'Bleed', type: 'choice', options: [[0, 'None'], [3, '3 mm'], [5, '5 mm']], hint: 'Extra art past the trim edge for professional printing' },
    { key: 'cropMarks', label: 'Crop marks', type: 'check' },
  ];
  const FINISH = [
    { key: 'mode', label: 'Finish', type: 'choice', options: [['none', 'Flat'], ['riso', 'Risograph'], ['plotter', 'Pen plotter']] },
    { key: 'misregister', label: 'Misregistration', type: 'range', min: 0, max: 3, step: 0.1, unit: ' mm', when: s => s.finish.mode === 'riso' },
    { key: 'grain', label: 'Grain', type: 'range', min: 0, max: 1, step: 0.05, when: s => s.finish.mode === 'riso' },
  ];
  const ANIM = [
    { key: 'seconds', label: 'Loop length', type: 'range', min: 1, max: 12, step: 0.5, unit: ' s' },
    { key: 'fps', label: 'Frames per second', type: 'choice', options: [[24, '24'], [30, '30'], [60, '60']] },
  ];

  // Redraws the whole panel for a state (keeps the scroll position).
  function render(state) {
    TEXT.find(p => p.key === 'font').options = Fonts.options([['auto', 'Surprise me']]);
    const el = $('panel'), scroll = el.scrollTop;
    const def = Styles.get(state.style);
    const finish = FINISH.filter(p => !p.when || p.when(state));
    const text = TEXT.filter(p => !p.when || p.when(state));
    el.innerHTML = section('style', def.name, dataRow(state, def) + Controls.html(def.params, Poster.params(state, def), 'style')
        + `<div class="row-actions"><button class="ghost small" id="resetStyle">${Icons.svg('reset', 14)}Reset ${def.name} settings</button></div>`)
      + section('palette', 'Palette', paletteGrid(state))
      + section('text', 'Text', Controls.html(text, state.text, 'text'))
      + section('page', 'Page', Controls.html(PAGE, state.page, 'page') + `<p class="hint">${pageNote(state)}</p>`)
      + section('finish', 'Print finish', Controls.html(finish, state.finish, 'finish') + finishNote(state))
      + (def.animated ? section('anim', 'Animation', Controls.html(ANIM, state.anim, 'anim')
        + `<div class="row-actions"><button class="ghost small" id="playAnim">${Icons.svg('play', 14)}Preview</button><button class="ghost small" id="recordAnim">${Icons.svg('download', 14)}Export video</button></div>`) : '');
    el.scrollTop = scroll;
    wire(el, state, def, finish, text);
  }

  // For styles drawn from a file (Route): what's loaded, and buttons to load or clear it.
  function dataRow(state, def) {
    if (!def.dataImport) return '';
    const d = state.data;
    return `<p class="hint">${d ? `<b>${Controls.esc(d.name)}</b> · ${d.km} km · ${d.points.length} points` : 'Showing a made-up loop. Load a GPX file from Strava, Garmin, Komoot, or any GPS app.'}</p>
      <div class="row-actions"><button class="ghost small" id="loadGpx">${Icons.svg('upload', 14)}Load a GPX file…</button>
      ${d ? `<button class="ghost small" id="clearGpx">${Icons.svg('x', 14)}Clear</button>` : ''}</div>`;
  }

  // A collapsible section that remembers whether it's open.
  function section(id, title, body) {
    return `<details data-section="${id}" ${open.has(id) ? 'open' : ''}><summary>${Icons.svg('chevronRight', 14)}<span>${title}</span></summary><div class="section-body">${body}</div></details>`;
  }

  // Palette swatches: paper color with its accents on top.
  function paletteGrid(state) {
    const list = state.customPalette ? [state.customPalette, ...Palettes.LIST] : Palettes.LIST;
    const tiles = list.map(p => {
      const id = p === state.customPalette ? 'custom' : p.id;
      return `<button class="pal ${state.palette === id ? 'active' : ''}" data-palette="${id}" title="${p.name}" style="background:${p.bg}">
        ${p.colors.slice(0, 4).map(c => `<span style="background:${c}"></span>`).join('')}</button>`;
    }).join('');
    return `<div class="pal-grid">${tiles}</div>
      <div class="row-actions"><button class="ghost small" id="shuffleColors" title="New color arrangement (C)">${Icons.svg('shuffle', 14)}Shuffle colors</button>
      <button class="ghost small" id="paletteFromImage">${Icons.svg('image', 14)}From an image…</button></div>`;
  }

  function pageNote(state) {
    const L = Pages.layout(state.page);
    return `${Math.round(L.sheet.w)} × ${Math.round(L.sheet.h)} mm file${L.bleed ? `, ${L.bleed} mm bleed` : ''}${L.slug ? ', with crop marks' : ''}.`;
  }

  function finishNote(state) {
    const notes = { riso: 'Each color prints as its own ink layer, slightly off-register, with grain. Export the layers from the Export menu.',
      plotter: 'Strokes only, ordered to keep pen travel short. Fills become outlines.' };
    return notes[state.finish.mode] ? `<p class="hint">${notes[state.finish.mode]}</p>` : '';
  }

  // Connects every control to the poster state.
  function wire(el, state, def, finish, text) {
    el.querySelectorAll('details').forEach(d => d.addEventListener('toggle', () => {
      d.open ? open.add(d.dataset.section) : open.delete(d.dataset.section);
      Prefs.set('openSections', [...open]);
    }));
    Controls.wire(el, { style: def.params, text, page: PAGE, finish, anim: ANIM }, (group, key, value) => {
      App.update(s => {
        if (group === 'style') s.params[s.style] = { ...(s.params[s.style] || {}), [key]: value };
        else s[group][key] = value;
      }, { key: group + ':' + key, quiet: !((group === 'finish' && key === 'mode') || (group === 'text' && key === 'color')) });
    });
    el.querySelectorAll('[data-palette]').forEach(b => b.addEventListener('click', () => App.update(s => { s.palette = b.dataset.palette; })));
    click('resetStyle', () => App.update(s => { delete s.params[s.style]; }));
    click('shuffleColors', () => App.shuffleColors());
    click('paletteFromImage', () => App.paletteFromImage());
    click('playAnim', () => App.toggleAnimation());
    click('loadGpx', () => App.importGpx());
    click('clearGpx', () => App.update(s => { s.data = null; }));
    click('recordAnim', () => App.exportVideo());
  }

  function click(id, fn) { const b = $(id); if (b) b.addEventListener('click', fn); }

  return { render };
})();

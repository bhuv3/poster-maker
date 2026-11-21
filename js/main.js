// Starts the app: holds the poster state, redraws on change, and wires the top bar and keyboard.
const App = (() => {
  const $ = id => document.getElementById(id);
  const SHORTCUTS = [
    ['Space', 'New poster (locked parts stay)'], ['← / →', 'Previous / next poster'], ['1 – 9', 'Pick a style'],
    ['P / L / T', 'Lock palette / layout / text'], ['C', 'Shuffle colors'], ['S', 'Save to gallery'], ['G', 'Open the gallery'],
    ['M', 'Mutate: pick from 9 variations'], ['A', 'Play or stop the animation'], ['F', 'Focus: hide the panels'],
    ['Ctrl/Cmd + E', 'Export SVG'], ['Ctrl/Cmd + Z', 'Undo (same as ←)'], ['Ctrl/Cmd + Shift + Z', 'Redo (same as →)'], ['?', 'This list'],
  ];
  let state = null, queued = false, hashTimer = null;

  function get() { return state; }

  // Applies a change to a copy of the state. opts.key merges quick repeats (slider drags) into one history step;
  // opts.quiet skips rebuilding the panel (the control that changed already shows its value).
  function update(fn, opts = {}) {
    const s = Poster.clone(state);
    fn(s);
    set(s, opts);
  }

  // Makes s the current poster and redraws.
  function set(s, opts = {}) {
    state = s;
    if (!opts.noHistory) History.push(state, opts.key);
    if (!opts.quiet) Panel.render(state);
    Bar.render(state);
    Rail.update(state);
    schedule();
    remember();
  }

  // Redraws on the next frame (several changes in one frame draw once).
  function schedule() {
    if (queued) return;
    queued = true;
    Stage.busy(true);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      queued = false;
      try { Stage.show(Composer.build(state)); } catch (e) { console.error(e); Toast.show('Something went wrong drawing this poster'); }
      Stage.busy(false);
    }));
  }

  // Keeps the URL and this browser's "last poster" up to date (a moment after changes stop).
  function remember() {
    clearTimeout(hashTimer);
    hashTimer = setTimeout(() => {
      history.replaceState(null, '', '#' + Poster.encode(state));
      Prefs.set('last', state);
    }, 400);
  }

  function next() { set(Poster.next(state)); }
  function back() { const s = History.back(); if (s) set(s, { noHistory: true }); }
  function forward() { const s = History.forward(); if (s) set(s, { noHistory: true }); }

  // Jumps to the poster for a typed seed (palette and style stay).
  function setSeed(n) { update(s => { s.seeds = Poster.seedsFrom(n); }); }

  function setStyle(id) { if (id !== state.style) update(s => { s.style = id; }); }

  function toggleLock(part) {
    update(s => { s.locks[part] = !s.locks[part]; }, { quiet: true });
    Toast.show(`${part[0].toUpperCase() + part.slice(1)} ${state.locks[part] ? 'locked' : 'unlocked'}`);
  }

  // New color arrangement; a new palette too unless the palette is locked.
  function shuffleColors() {
    update(s => {
      s.seeds.color = Random.newSeed();
      if (!s.locks.palette && s.palette !== 'custom') s.palette = Random.create(s.seeds.color).pick(Palettes.LIST.filter(p => p.id !== s.palette)).id;
    });
  }

  // Asks for an image and makes a palette from its main colors.
  function paletteFromImage() {
    const input = $('imageInput');
    input.value = '';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const p = await Palettes.fromImage(file);
        update(s => { s.customPalette = p; s.palette = 'custom'; });
        Toast.show('Palette made from your image');
      } catch (e) { Toast.show('Couldn’t read that image'); }
    };
    input.click();
  }

  // Loads a GPX track for the Route style. Long tracks are simplified to keep links and the gallery small.
  function importGpx() {
    const input = $('fileInput');
    input.value = '';
    input.accept = '.gpx,application/gpx+xml,application/xml';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const data = parseGpx(await file.text(), file.name);
        update(s => {
          s.data = data;
          s.style = 'route';
          if (s.text.title === Poster.create().text.title) { s.text.title = data.name; s.text.small = `${data.km} km`; }
        });
        Toast.show(`Loaded ${data.name}, ${data.km} km`);
      } catch (e) { Toast.show('Couldn’t find a track in that file'); }
    };
    input.click();
  }

  // GPX text → { name, km, points: [[lon, lat]] } (at most 600 points).
  function parseGpx(text, filename) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    let nodes = [...doc.getElementsByTagName('trkpt')];
    if (!nodes.length) nodes = [...doc.getElementsByTagName('rtept')];
    let pts = nodes.map(n => [+n.getAttribute('lon'), +n.getAttribute('lat')]).filter(([a, b]) => isFinite(a) && isFinite(b));
    if (pts.length < 2) throw new Error('no track');
    let km = 0;
    for (let i = 1; i < pts.length; i++) km += haversine(pts[i - 1], pts[i]);
    for (let tol = 1e-5; pts.length > 600; tol *= 1.6) pts = Geom.simplify(pts, tol);
    const nameNode = doc.querySelector('trk > name, rte > name, metadata > name');
    const name = (nameNode && nameNode.textContent.trim()) || filename.replace(/\.[^.]+$/, '');
    return { name, km: Math.round(km * 10) / 10, points: pts.map(([a, b]) => [Math.round(a * 1e5) / 1e5, Math.round(b * 1e5) / 1e5]) };
  }

  // Distance in km between two [lon, lat] points.
  function haversine([lon1, lat1], [lon2, lat2]) {
    const r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(a));
  }

  // Saves the current poster to the gallery.
  async function save() {
    const ok = await Gallery.add(state);
    Toast.show(ok ? 'Saved to gallery' : 'Gallery is full. Delete some posters first.');
  }

  // Copies a link that reproduces this poster.
  async function share() {
    const url = location.href.split('#')[0] + '#' + Poster.encode(state);
    try { await navigator.clipboard.writeText(url); Toast.show('Link copied'); }
    catch (e) { history.replaceState(null, '', url); Toast.show('Link is in the address bar'); }
  }

  function toggleAnimation() { Animator.toggle(state); }
  function exportVideo() { Animator.record(state); }

  // Export menu actions by name.
  function exportAs(kind) {
    if (kind === 'svg') Exporter.svg(state);
    else if (kind === 'png150') Exporter.png(state, 150);
    else if (kind === 'png300') Exporter.png(state, 300);
    else if (kind === 'layers') Exporter.layers(state);
    else if (kind === 'plotter') Exporter.plotter(state);
    else if (kind === 'video') exportVideo();
  }

  // Top bar buttons and the export menu.
  function wireTopBar() {
    $('btnSave').addEventListener('click', save);
    $('btnGallery').addEventListener('click', () => Gallery.open());
    $('btnShare').addEventListener('click', share);
    $('btnMutate').addEventListener('click', () => Mutate.open(state));
    $('btnHelp').addEventListener('click', () => Overlay.shortcuts(SHORTCUTS));
    $('btnFocus').addEventListener('click', toggleFocus);
    const menu = $('exportMenu'), btn = $('btnExport');
    const show = on => { menu.hidden = !on; btn.setAttribute('aria-expanded', on); };
    btn.addEventListener('click', e => { e.stopPropagation(); show(menu.hidden); });
    menu.querySelectorAll('[data-export]').forEach(b => b.addEventListener('click', () => { show(false); exportAs(b.dataset.export); }));
    document.addEventListener('click', () => show(false));
    document.querySelectorAll('[data-icon]').forEach(el => el.insertAdjacentHTML('afterbegin', Icons.svg(el.dataset.icon, 16)));
  }

  function toggleFocus() { document.body.classList.toggle('focus'); Stage.fit(); }

  // Keyboard shortcuts (ignored while typing in a field or when an overlay is open).
  function onKey(e) {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || Overlay.isOpen()) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    let done = true;
    if (mod && k === 'z') e.shiftKey ? forward() : back();
    else if (mod && k === 'e') Exporter.svg(state);
    else if (mod) done = false;
    else if (e.key === ' ') next();
    else if (e.key === 'ArrowLeft') back();
    else if (e.key === 'ArrowRight') forward();
    else if (/^[1-9]$/.test(e.key) && Styles.all()[+e.key - 1]) setStyle(Styles.all()[+e.key - 1].id);
    else if (k === 'p') toggleLock('palette');
    else if (k === 'l') toggleLock('layout');
    else if (k === 't') toggleLock('text');
    else if (k === 'c') shuffleColors();
    else if (k === 's') save();
    else if (k === 'g') Gallery.open();
    else if (k === 'm') Mutate.open(state);
    else if (k === 'a') toggleAnimation();
    else if (k === 'f') toggleFocus();
    else if (e.key === '?') Overlay.shortcuts(SHORTCUTS);
    else done = false;
    if (done) e.preventDefault();
  }

  // The poster to start with: from the link, else the last one, else a new one.
  function firstState() {
    const fromLink = location.hash.length > 1 ? Poster.decode(location.hash.slice(1)) : null;
    return fromLink || Poster.upgrade(Prefs.get('last', null)) || Poster.create('swiss');
  }

  function start() {
    Stage.init();
    Rail.init();
    Bar.init();
    wireTopBar();
    window.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', () => {
      const s = Poster.decode(location.hash.slice(1));
      if (s && JSON.stringify(s) !== JSON.stringify(state)) set(s);
    });
    set(firstState());
  }

  return { start, get, update, set, next, back, forward, setSeed, setStyle, toggleLock, shuffleColors, paletteFromImage, save, share,
    toggleAnimation, exportVideo, importGpx, SHORTCUTS };
})();

App.start();

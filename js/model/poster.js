// The poster state: plain JSON that fully describes one poster. History, gallery, and share links all store it.
const Poster = (() => {
  const VERSION = 4;

  // A new poster with fresh seeds.
  function create(style) {
    const n = Random.newSeed();
    return {
      version: VERSION,
      style: style || 'swiss',
      seeds: seedsFrom(n),
      palette: 'bauhaus',
      customPalette: null,
      page: { size: 'a3', orientation: 'portrait', margin: 18, bleed: 0, cropMarks: false },
      text: {
        show: true, title: 'Generative\nPosters', subtitle: 'Made with code, one seed at a time', small: 'No. 001 — ' + new Date().getFullYear(),
        placement: 'bottom-left', font: 'auto', case: 'auto', size: 1, color: 'auto', fallback: 'fade', band: false,
      },
      params: {},
      locks: { palette: false, layout: false, text: false },
      finish: { mode: 'none', misregister: 0.6, grain: 0.5 },
      anim: { seconds: 4, fps: 30 },
      data: null,
    };
  }

  // Every part's seed from one number, so typing a seed reproduces the poster.
  function seedsFrom(n) {
    return { layout: n, detail: Random.hash(n, 'detail'), color: Random.hash(n, 'color'), text: Random.hash(n, 'text') };
  }

  // A style's parameters: its defaults with the poster's changes on top.
  function params(state, def) { return { ...Styles.defaults(def), ...(state.params[def.id] || {}) }; }

  function clone(state) { return JSON.parse(JSON.stringify(state)); }

  // The next poster for Space: new seeds for every unlocked part, and a new palette unless it's locked.
  function next(state) {
    const s = clone(state), n = Random.newSeed(), fresh = seedsFrom(n);
    if (!s.locks.layout) { s.seeds.layout = fresh.layout; s.seeds.detail = fresh.detail; }
    if (!s.locks.text) s.seeds.text = fresh.text;
    if (!s.locks.palette) {
      s.seeds.color = fresh.color;
      if (s.palette !== 'custom') s.palette = Random.create(fresh.color).pick(Palettes.LIST.filter(p => p.id !== s.palette)).id;
    }
    return s;
  }

  // State → URL-safe text (base64 of the JSON).
  function encode(state) {
    const json = JSON.stringify(state);
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // URL-safe text → state, or null when it can't be read. Missing fields get their defaults.
  function decode(text) {
    try {
      const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
      return upgrade(JSON.parse(decodeURIComponent(escape(atob(b64)))));
    } catch (e) { return null; }
  }

  // Fills in anything an older or partial state is missing.
  function upgrade(s) {
    if (!s || typeof s !== 'object' || !s.seeds) return null;
    const base = create(s.style);
    const out = { ...base, ...s };
    for (const k of ['seeds', 'page', 'text', 'locks', 'finish', 'anim']) out[k] = { ...base[k], ...(s[k] || {}) };
    out.params = s.params || {};
    if ((s.version || 1) < 2 && out.text.font === 'grotesk') out.text.font = 'auto';   // the old default becomes "Surprise me"
    if ((s.version || 1) < 3 && out.text.color === 'ink') out.text.color = 'auto';   // the old default becomes Auto
    if ((s.version || 1) < 4 && out.text.fallback === 'paper') out.text.fallback = 'fade';   // fade became the default
    out.version = VERSION;
    return out;
  }

  return { VERSION, create, seedsFrom, params, clone, next, encode, decode, upgrade };
})();

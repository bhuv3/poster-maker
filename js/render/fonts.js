// Poster fonts from what's installed on this computer (macOS and Windows ship many good ones), with fallbacks.
// Only fonts that are actually installed are offered. "Surprise me" picks one from the text seed.
const Fonts = (() => {
  const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
  // upper: looks best in capitals. body: the subtitle's font (defaults to SANS).
  const LIST = [
    { id: 'grotesk', name: 'Helvetica Bold', family: "'Helvetica Neue', Helvetica, Arial, sans-serif", weight: 700, tracking: -0.025 },
    { id: 'black', name: 'Arial Black', family: "'Arial Black', 'Helvetica Neue', Arial, sans-serif", weight: 900, tracking: -0.04 },
    { id: 'futura', name: 'Futura', family: "Futura, 'Futura PT', 'Century Gothic', sans-serif", weight: 700, tracking: 0.01, upper: true },
    { id: 'avenir', name: 'Avenir Heavy', family: "'Avenir Next', Avenir, 'Segoe UI Black', sans-serif", weight: 800, tracking: -0.03 },
    { id: 'avenir-condensed', name: 'Avenir Condensed', family: "'Avenir Next Condensed', 'Bahnschrift Condensed', 'Arial Narrow', sans-serif", weight: 800, tracking: -0.02, upper: true },
    { id: 'din', name: 'DIN Condensed', family: "'DIN Condensed', 'Bahnschrift Condensed', 'Bahnschrift', 'Roboto Condensed', sans-serif", weight: 700, tracking: 0, upper: true },
    { id: 'impact', name: 'Impact', family: "Impact, Haettenschweiler, 'Arial Narrow', sans-serif", weight: 400, tracking: 0.005, upper: true },
    { id: 'condensed', name: 'Arial Narrow', family: "'Arial Narrow', 'Roboto Condensed', sans-serif", weight: 700, tracking: -0.01 },
    { id: 'gill', name: 'Gill Sans', family: "'Gill Sans', 'Gill Sans MT', sans-serif", weight: 700, tracking: 0.02, upper: true },
    { id: 'optima', name: 'Optima', family: "Optima, Candara, sans-serif", weight: 700, tracking: 0 },
    { id: 'light', name: 'Helvetica Light', family: "'Helvetica Neue', Helvetica, Arial, sans-serif", weight: 300, tracking: -0.02 },
    { id: 'didot', name: 'Didot', family: "Didot, 'Bodoni 72', 'Bodoni MT', serif", weight: 700, tracking: -0.02, body: "'Avenir Next', " + SANS },
    { id: 'bodoni', name: 'Bodoni', family: "'Bodoni 72', 'Bodoni MT', Didot, serif", weight: 700, tracking: -0.015, body: "'Avenir Next', " + SANS },
    { id: 'baskerville', name: 'Baskerville Italic', family: "Baskerville, 'Baskerville Old Face', serif", weight: 400, italic: true, tracking: -0.01, body: "Baskerville, Georgia, serif" },
    { id: 'caslon', name: 'Big Caslon', family: "'Big Caslon', 'Book Antiqua', Palatino, serif", weight: 500, tracking: -0.01, body: "Baskerville, Georgia, serif" },
    { id: 'hoefler', name: 'Hoefler Black', family: "'Hoefler Text', Constantia, serif", weight: 900, tracking: -0.02 },
    { id: 'serif', name: 'Georgia', family: "Georgia, 'Times New Roman', serif", weight: 700, tracking: -0.015 },
    { id: 'rockwell', name: 'Rockwell', family: "Rockwell, 'Rockwell Extra Bold', 'Roboto Slab', serif", weight: 700, tracking: -0.01 },
    { id: 'copperplate', name: 'Copperplate', family: "Copperplate, 'Copperplate Gothic Bold', serif", weight: 700, tracking: 0.04, upper: true },
    { id: 'phosphate', name: 'Phosphate', family: "Phosphate, 'Rockwell Extra Bold', Impact, sans-serif", weight: 400, tracking: 0.02, upper: true },
    { id: 'typewriter', name: 'Typewriter', family: "'American Typewriter', 'Courier New', monospace", weight: 700, tracking: -0.02, body: "'American Typewriter', 'Courier New', monospace" },
    { id: 'mono', name: 'Mono', family: "'SF Mono', Menlo, Consolas, 'Courier New', monospace", weight: 700, tracking: -0.04, body: "'SF Mono', Menlo, Consolas, monospace" },
  ];
  const COMMON = ['helvetica neue', 'helvetica', 'arial', 'georgia', 'times new roman', 'courier new', 'sans-serif', 'serif', 'monospace'];
  let installed = null;

  // True if a named family renders differently from the generic fallbacks (so it's really there).
  function has(name) {
    const g = document.createElement('canvas').getContext('2d'), probe = 'mmmmmmmmmmlliWW@#0';
    return ['monospace', 'serif', 'sans-serif'].some(base => {
      g.font = `72px ${base}`; const a = g.measureText(probe).width;
      g.font = `72px "${name}", ${base}`; return g.measureText(probe).width !== a;
    });
  }

  // The fonts this computer can show: the always-there ones, plus any whose own family is installed.
  function available() {
    if (installed) return installed;
    installed = LIST.filter(f => {
      const names = f.family.split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
      const own = names.filter(n => !COMMON.includes(n.toLowerCase()));
      return !own.length || own.some(has);
    });
    return installed;
  }

  // The font a text setting means. "auto" picks one from the seed; unknown ids fall back to Helvetica.
  function resolve(id, seed) {
    if (id === 'auto') return Random.create(seed).pick(available());
    return LIST.find(f => f.id === id) || LIST[0];
  }

  // [value, label] options for a font select.
  function options(extra) { return [...(extra || []), ...available().map(f => [f.id, f.name])]; }

  return { LIST, SANS, available, resolve, options };
})();

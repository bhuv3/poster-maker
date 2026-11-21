// Poster state → shapes → SVG: builds the generator context, runs the style, adds text and finishes.
const Composer = (() => {
  // Everything a style needs. opts.quality (0–1) thins out heavy styles for small previews; opts.time animates.
  function context(state, opts = {}) {
    const L = Pages.layout(state.page);
    const palette = Palettes.resolve(state);
    const s = state.seeds;
    return {
      L, w: L.w, h: L.h, unit: L.unit, box: L.box, full: L.full, palette, seeds: s,
      colorRng: Random.create(s.color), detailRng: Random.create(s.detail), noise: Noise.create(s.detail),
      quality: opts.quality || 1, time: opts.time || 0, animating: opts.time != null, mode: opts.mode || state.finish.mode,
      data: state.data, text: state.text,
    };
  }

  // { svg, shapes, ctx, ms } for a poster. opts: quality, time, noText, exportSize, plotter, riso (override).
  function build(state, opts = {}) {
    const t0 = performance.now();
    const def = Styles.get(state.style);
    const ctx = context(state, opts);
    const p = Poster.params(state, def);
    const text = def.ownsTitle && def.ownsTitle(p) ? { ...state.text, title: '' } : state.text;
    const words = opts.noText ? [] : TextLayer.build(text, ctx);
    ctx.textBox = TextLayer.bounds(words, 5 * ctx.unit);
    const art = def.generate(Random.create(state.seeds.layout), p, ctx);
    const shapes = art.concat(text.color === 'auto' ? Contrast.fit(words, art, ctx, text.fallback) : words);
    const mode = ctx.mode;
    const final = mode === 'plotter' ? Plotter.convert(shapes, ctx) : shapes;
    const riso = mode === 'riso' ? { ...state.finish, seed: state.seeds.color } : null;
    const bg = mode === 'plotter' ? '#ffffff' : ctx.palette.bg;
    const svg = Svg.render(final, ctx.L, bg, { exportSize: opts.exportSize, riso, title: (state.text.title || '').replace(/\n/g, ' ') });
    return { svg, shapes: final, ctx, ms: performance.now() - t0 };
  }

  return { context, build };
})();

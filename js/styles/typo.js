// Typographic: the words are the art: stacked, spun around a center, scattered, or set letter by letter on a grid.
(() => {
  Styles.register({
    id: 'typo',
    name: 'Typographic',
    icon: 'type',
    params: [
      { key: 'source', label: 'Words', type: 'choice', value: 'title', options: [['title', 'The title'], ['custom', 'My own']] },
      { key: 'word', label: 'Your words', type: 'text', value: 'MAKE THINGS' },
      { key: 'mode', label: 'Layout', type: 'select', value: 'stack', options: [['stack', 'Stack'], ['radial', 'Radial'], ['scatter', 'Scatter'], ['grid', 'Letter grid']] },
      { key: 'repeats', label: 'Repeats', type: 'range', min: 3, max: 60, step: 1, value: 12 },
      { key: 'growth', label: 'Size change', type: 'range', min: 0, max: 1, step: 0.05, value: 0.6 },
      { key: 'rotation', label: 'Rotation', type: 'range', min: 0, max: 90, step: 1, value: 0 },
      { key: 'outline', label: 'Outlined', type: 'range', min: 0, max: 1, step: 0.05, value: 0.5 },
      { key: 'font', label: 'Font', type: 'select', value: 'text', options: Fonts.options([['text', 'Same as the text']]) },
      { key: 'upper', label: 'Capitals', type: 'check', value: true },
      { key: 'colors', label: 'Color', type: 'choice', value: 'palette', options: [['ink', 'Ink'], ['palette', 'Palette'], ['gradient', 'Gradient']] },
    ],

    // Using the title as the art replaces the title in the text layer (the subtitle and small line stay).
    ownsTitle: p => p.source === 'title',

    generate(rng, p, ctx) {
      const raw = p.source === 'title' ? (ctx.text.title || '').replace(/\n/g, ' ') : p.word;
      const word = (p.upper ? raw.toUpperCase() : raw).trim() || 'POSTER';
      const font = p.font === 'text' ? TextLayer.fontFor(ctx.text, ctx.seeds) : Fonts.resolve(p.font);
      const paint = painter(p, ctx, rng);
      const make = { stack, radial, scatter, grid }[p.mode] || stack;
      return make(word, font, p, ctx, rng, paint);
    },
  });

  // Returns style(i, n, size): filled or outlined, colored by the Color choice.
  function painter(p, ctx, rng) {
    const accents = Palettes.visible(ctx.palette), ink = ctx.palette.ink;
    return (i, n, size) => {
      const t = n > 1 ? i / (n - 1) : 0;
      const color = p.colors === 'ink' ? ink : p.colors === 'gradient' ? gradient([ink, ...accents], t) : accents[i % accents.length];
      return rng.next() < p.outline ? { stroke: color, sw: Math.max(0.2, size * 0.018), join: 'round' } : { fill: color };
    };
  }

  function text(x, y, str, size, font, extra, style) {
    return Shapes.text(x, y, str, { size, family: font.family, weight: font.weight, tracking: font.tracking, italic: font.italic, ...extra }, style);
  }

  // Rows that fill the page from top to bottom, each fitted to the width; sizes grow down the page.
  function stack(word, font, p, ctx, rng, paint) {
    const b = ctx.box, n = p.repeats, out = [];
    const widthAt1 = TextLayer.measure(word, font.family, font.weight, font.tracking, font.italic);
    const weights = [...Array(n).keys()].map(i => 1 + p.growth * 3 * (i / Math.max(1, n - 1)) ** 2);
    const total = weights.reduce((a, b2) => a + b2, 0);
    let y = b.y;
    weights.forEach((wgt, i) => {
      const rowH = b.h * wgt / total;
      const size = Math.min(rowH / 0.74, b.w / widthAt1);
      y += rowH;
      out.push(text(b.x + b.w / 2, y, word, size, font, { anchor: 'middle', rot: p.rotation ? (rng.next() - 0.5) * p.rotation * 0.2 : 0 }, paint(i, n, size)));
    });
    return out;
  }

  // Copies spun around the center like petals.
  function radial(word, font, p, ctx, rng, paint) {
    const b = ctx.box, cx = b.x + b.w / 2, cy = b.y + b.h / 2, R = Math.min(b.w, b.h) / 2, out = [];
    const size = R * 0.95 / TextLayer.measure(word, font.family, font.weight, font.tracking, font.italic);
    const n = p.repeats;
    for (let i = 0; i < n; i++) {
      const s = size * (1 - p.growth * 0.6 * i / n);
      const a = (360 / n) * i + p.rotation;
      out.push(Shapes.group([text(cx + R * 0.04, cy + s * 0.36, word, s, font, {}, paint(i, n, s))], `rotate(${Geom.num(a)} ${Geom.num(cx)} ${Geom.num(cy)})`));
    }
    return out;
  }

  // Words of many sizes dropped across the page.
  function scatter(word, font, p, ctx, rng, paint) {
    const b = ctx.box, out = [], n = p.repeats;
    const w1 = TextLayer.measure(word, font.family, font.weight, font.tracking, font.italic);
    for (let i = 0; i < n; i++) {
      const size = (b.w / w1) * (0.12 + 0.88 * Math.pow(rng.next(), 1 + p.growth * 3));
      const x = b.x + rng.next() * b.w, y = b.y + size * 0.7 + rng.next() * (b.h - size * 0.7);
      out.push(text(x, y, word, size, font, { anchor: 'middle', rot: (rng.next() - 0.5) * 2 * p.rotation }, paint(i, n, size)));
    }
    return out.sort((a, c) => c.size - a.size);
  }

  // Each letter in its own cell, as big as the cell allows.
  function grid(word, font, p, ctx, rng, paint) {
    const letters = [...word.replace(/\s+/g, '')];
    const b = ctx.box, n = letters.length || 1;
    const cols = Math.max(1, Math.round(Math.sqrt(n * b.w / b.h))), rows = Math.ceil(n / cols);
    const cw = b.w / cols, ch = b.h / rows, out = [];
    letters.forEach((l, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const size = Math.min(ch / 0.74, cw / Math.max(0.3, TextLayer.measure(l, font.family, font.weight, 0, font.italic))) * (1 - p.growth * 0.4 * rng.next());
      const rot = p.rotation ? Math.round((rng.next() - 0.5) * 2 * p.rotation / 90) * 90 : 0;
      const x = b.x + (c + 0.5) * cw, y = b.y + r * ch + ch / 2 + size * 0.36;
      out.push(text(x, y, l, size, font, { anchor: 'middle', rot }, paint(i, n, size)));
    });
    return out;
  }

  // Color at t (0–1) along a list of colors.
  function gradient(colors, t) {
    if (colors.length === 1) return colors[0];
    const x = Math.max(0, Math.min(0.9999, t)) * (colors.length - 1), i = Math.floor(x);
    return Palettes.mix(colors[i], colors[i + 1], x - i);
  }
})();

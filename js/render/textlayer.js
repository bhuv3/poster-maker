// The poster's words: title, subtitle, and a small line, sized to fit and placed on the margins.
const TextLayer = (() => {
  const PLACEMENTS = [['top-left', 'Top left'], ['bottom-left', 'Bottom left'], ['top-center', 'Top center'], ['bottom-center', 'Bottom center'],
    ['center', 'Center'], ['vertical', 'Up the side'], ['auto', 'Surprise me']];
  const LINE = 0.9;        // title line height (× size)
  const CAP = 0.72;        // cap height (× size), for placing the first line
  const widths = new Map();
  let measurer = null;

  // Width of str at font size 1 (canvas measurement, cached).
  function measure(str, family, weight, tracking, italic) {
    const key = family + weight + (italic ? 'i' : '') + '|' + str;
    if (!widths.has(key)) {
      measurer = measurer || document.createElement('canvas').getContext('2d');
      measurer.font = `${italic ? 'italic ' : ''}${weight} 100px ${family}`;
      widths.set(key, measurer.measureText(str).width / 100);
    }
    return widths.get(key) + (tracking || 0) * str.length;
  }

  // The title font for a text setting, with how to set the title's case.
  function fontFor(t, seeds) {
    const f = Fonts.resolve(t.font, Random.hash(seeds.text, 'font'));
    const upper = t.case === 'upper' || (t.case !== 'asis' && f.upper);
    return { ...f, upper, body: f.body || Fonts.SANS };
  }

  // Text shapes for a poster. ctx: the generator context (page, palette, seeds).
  function build(t, ctx) {
    if (!t.show) return [];
    const rng = Random.create(ctx.seeds.text);
    const placement = t.placement === 'auto' ? rng.pick(PLACEMENTS.slice(0, 6))[0] : t.placement;
    const font = fontFor(t, ctx.seeds);
    const color = t.color === 'accent' ? Palettes.visible(ctx.palette)[0] : t.color === 'paper' ? ctx.palette.bg : ctx.palette.ink;
    const box = ctx.box, u = ctx.unit;
    const lines = (t.title || '').split('\n').filter(l => l.trim()).map(l => font.upper ? l.toUpperCase() : l);
    const vertical = placement === 'vertical';
    const room = vertical ? box.h * 0.92 : box.w * (placement.endsWith('center') || placement === 'center' ? 0.92 : 0.86);
    const widest = Math.max(0.01, ...lines.map(l => measure(l, font.family, font.weight, font.tracking, font.italic)));
    const size = lines.length ? Math.min(room / widest, box.h * 0.3 / lines.length) * (t.size || 1) : 0;
    const sub = Math.max(4.2 * u, Math.min(size * 0.2, 9 * u)), small = 3.2 * u;
    const block = { lines, size, sub: t.subtitle ? sub : 0, font, color };
    const shapes = vertical ? verticalBlock(t, block, box, u) : flatBlock(t, block, placement, box, u);
    if (t.band && !vertical && shapes.length) shapes.unshift(band(shapes, ctx, placement));
    if (t.small) shapes.push({ ...smallLine(t.small, small, placement, box, color, font.body), role: 'small' });
    return shapes;
  }

  // Title and subtitle stacked horizontally, top or bottom or centered.
  function flatBlock(t, b, placement, box, u) {
    const { lines, size, sub, font, color } = b;
    const gap = sub ? size * 0.28 : 0;
    const height = size * CAP + (lines.length - 1) * size * LINE + (sub ? gap + sub : 0);
    const top = placement.startsWith('top') ? box.y : placement === 'center' ? box.y + (box.h - height) / 2 : box.y + box.h - height - 6 * u;
    const center = placement.endsWith('center') || placement === 'center';
    const x = center ? box.x + box.w / 2 : box.x, anchor = center ? 'middle' : 'start';
    const out = lines.map((line, i) => Shapes.text(x, top + size * CAP + i * size * LINE, line,
      { size, family: font.family, weight: font.weight, tracking: font.tracking, italic: font.italic, anchor, role: 'title' }, { fill: color }));
    if (sub) out.push(Shapes.text(x, top + height, t.subtitle, { size: sub, family: font.body, weight: 400, anchor, role: 'subtitle' }, { fill: color }));
    return out;
  }

  // Title running up the left margin, rotated a quarter turn.
  function verticalBlock(t, b, box, u) {
    const { lines, size, sub, font, color } = b;
    const out = lines.map((line, i) => Shapes.text(box.x + size * CAP + i * size * LINE, box.y + box.h, line,
      { size, family: font.family, weight: font.weight, tracking: font.tracking, italic: font.italic, rot: -90, role: 'title' }, { fill: color }));
    const x = box.x + size * CAP + (lines.length - 1) * size * LINE + size * 0.3 + sub;
    if (sub) out.push(Shapes.text(x, box.y + box.h, t.subtitle, { size: sub, family: font.body, weight: 400, rot: -90, role: 'subtitle' }, { fill: color }));
    return out;
  }

  // The small line sits in the corner opposite the title block.
  function smallLine(str, size, placement, box, color, family) {
    const top = !placement.startsWith('top');
    const y = top ? box.y + size * CAP : box.y + box.h;
    return Shapes.text(box.x + box.w, y, str, { size, family, weight: 500, anchor: 'end', tracking: 0.04 }, { fill: color });
  }

  // A paper-colored band behind the title block, so text stays readable over busy art.
  function band(shapes, ctx, placement) {
    const pad = 6 * ctx.unit, f = ctx.full;
    const ys = shapes.map(s => [s.y - s.size * 0.85, s.y + s.size * 0.25]).flat();
    const y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
    const top = placement.startsWith('top') ? f.y : y0;
    const bottom = placement.startsWith('bottom') ? f.y + f.h : y1;
    return { ...Shapes.rect(f.x, top, f.w, bottom - top, { fill: ctx.palette.bg }), role: 'band' };
  }

  // Rectangle around the title and subtitle (not the small line), padded, or null when there's no text.
  // Styles use it to keep clear of the words.
  function bounds(shapes, pad) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of shapes) {
      if (s.t !== 'text' || s.role === 'small') continue;
      const w = measure(s.str, s.family, s.weight, s.tracking, s.italic) * s.size;
      const left = s.anchor === 'middle' ? -w / 2 : s.anchor === 'end' ? -w : 0;
      const box = s.rot ? { x: s.x - s.size * 0.75, y: s.y - w - left, w: s.size * 0.97, h: w }
        : { x: s.x + left, y: s.y - s.size * 0.75, w, h: s.size * 0.97 };
      x0 = Math.min(x0, box.x); y0 = Math.min(y0, box.y); x1 = Math.max(x1, box.x + box.w); y1 = Math.max(y1, box.y + box.h);
    }
    return x0 === Infinity ? null : { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
  }

  // The part of the margin box above or below the title (whichever is bigger), for styles that keep clear of it.
  function freeArea(ctx, on) {
    const b = ctx.box, t = on && ctx.textBox;
    if (!t) return b;
    const above = t.y - b.y, below = b.y + b.h - (t.y + t.h);
    if (Math.max(above, below) < b.h * 0.25) return b;   // title fills the page: use it all
    return above > below ? { ...b, h: above } : { ...b, y: t.y + t.h, h: below };
  }

  return { PLACEMENTS, build, measure, bounds, fontFor, freeArea };
})();

// Shapes → SVG markup. The preview and every export use this, so what you see is what you print.
const Svg = (() => {
  const n = Geom.num;
  let counter = 0, current = 'p0';

  // A whole poster as an SVG string. opts: { exportSize (adds mm width/height), riso, title }.
  function render(shapes, L, bg, opts = {}) {
    const id = 'p' + (++counter);
    current = id;
    const v = L.sheet, f = L.full;
    const size = opts.exportSize ? ` width="${n(v.w)}mm" height="${n(v.h)}mm"` : '';
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(v.x)} ${n(v.y)} ${n(v.w)} ${n(v.h)}"${size} preserveAspectRatio="xMidYMid meet">`;
    if (opts.title) out += `<title>${esc(opts.title)}</title>`;
    out += `<defs><clipPath id="${id}c"><rect x="${n(f.x)}" y="${n(f.y)}" width="${n(f.w)}" height="${n(f.h)}"/></clipPath>`;
    if (opts.riso) out += Riso.defs(id, opts.riso, L);
    out += shapes.filter(s => s.t === 'def').map(s => s.markup.replace(/\{id\}/g, id)).join('');
    out += '</defs>';
    if (L.slug) out += `<rect x="${n(v.x)}" y="${n(v.y)}" width="${n(v.w)}" height="${n(v.h)}" fill="#ffffff"/>`;
    out += `<rect x="${n(f.x)}" y="${n(f.y)}" width="${n(f.w)}" height="${n(f.h)}" fill="${bg}"/>`;
    const drawn = shapes.filter(s => s.t !== 'def');
    const body = opts.riso ? Riso.layers(drawn, id, opts.riso) : drawn.map(shape).join('');
    out += `<g clip-path="url(#${id}c)">${body}</g>`;
    if (L.slug) out += cropMarks(L);
    return out + '</svg>';
  }

  // One shape as an SVG element.
  function shape(sh) {
    const a = attrs(sh.s || {});
    switch (sh.t) {
      case 'rect': return `<rect x="${n(sh.x)}" y="${n(sh.y)}" width="${n(sh.w)}" height="${n(sh.h)}"${sh.rx ? ` rx="${n(sh.rx)}"` : ''}${a}/>`;
      case 'circle': return `<circle cx="${n(sh.cx)}" cy="${n(sh.cy)}" r="${n(sh.r)}"${a}/>`;
      case 'path': return `<path d="${sh.d}"${a}/>`;
      case 'poly': return `<path d="${Geom.pathData(sh.pts, sh.closed)}"${a}/>`;
      case 'text': return text(sh, a);
      case 'group': return `<g${sh.transform ? ` transform="${sh.transform}"` : ''}${sh.filter ? ` filter="url(#${current}${sh.filter})"` : ''}${a}>${sh.children.map(shape).join('')}</g>`;
      default: return '';
    }
  }

  // A text element. Rotation turns it around its own anchor point.
  function text(sh, a) {
    const rot = sh.rot ? ` transform="rotate(${n(sh.rot)} ${n(sh.x)} ${n(sh.y)})"` : '';
    const track = sh.tracking ? ` letter-spacing="${n(sh.tracking * sh.size)}"` : '';
    return `<text x="${n(sh.x)}" y="${n(sh.y)}" font-family="${sh.family}" font-size="${n(sh.size)}" font-weight="${sh.weight || 400}"`
      + `${sh.italic ? ' font-style="italic"' : ''}${sh.anchor && sh.anchor !== 'start' ? ` text-anchor="${sh.anchor}"` : ''}${track}${rot}${a}>${esc(sh.str)}</text>`;
  }

  // Style → attribute string.
  function attrs(s) {
    let a = '';
    if (s.fill !== undefined) a += ` fill="${String(s.fill).replace('{id}', current)}"`;
    if (s.stroke && s.stroke !== 'none') {
      a += ` stroke="${s.stroke}" stroke-width="${n(s.sw || 0.3)}"`;
      if (s.cap) a += ` stroke-linecap="${s.cap}"`;
      if (s.join) a += ` stroke-linejoin="${s.join}"`;
      if (s.dash) a += ` stroke-dasharray="${s.dash}"`;
      if (s.paint) a += ` paint-order="${s.paint}"`;
    }
    if (s.fill === undefined) a += ' fill="none"';
    if (s.opacity !== undefined && s.opacity < 1) a += ` opacity="${n(s.opacity)}"`;
    if (s.rule) a += ` fill-rule="${s.rule}"`;
    if (s.blend) a += ` style="mix-blend-mode:${s.blend}"`;
    return a;
  }

  // Crop marks at the trim corners, outside the bleed.
  function cropMarks(L) {
    const g = L.bleed + 2, len = L.slug - 3, w = L.w, h = L.h;
    const marks = [[0, 0, -1, -1], [w, 0, 1, -1], [0, h, -1, 1], [w, h, 1, 1]].map(([x, y, dx, dy]) =>
      `M${n(x + dx * g)} ${n(y)}h${n(dx * len)}M${n(x)} ${n(y + dy * g)}v${n(dy * len)}`).join('');
    return `<path d="${marks}" stroke="#000000" stroke-width="0.25" fill="none"/>`;
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

  return { render, shape, esc };
})();

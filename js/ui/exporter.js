// Downloads: SVG, PNG at a print resolution, one SVG per ink layer, and pen-plotter SVG.
const Exporter = (() => {
  const MAX_PIXELS = 16.7e6;   // Safari's canvas limit; bigger PNGs are scaled down to fit

  // File name like "poster-swiss-123456.svg".
  function name(state, suffix, ext) { return `poster-${state.style}-${state.seeds.layout}${suffix ? '-' + suffix : ''}.${ext}`; }

  // Saves a Blob as a file.
  function download(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // Vector file at real print size.
  function svg(state) {
    const r = Composer.build(state, { exportSize: true });
    download(new Blob([r.svg], { type: 'image/svg+xml' }), name(state, '', 'svg'));
    Toast.show(`Saved ${r.ctx.L.name} SVG`);
  }

  // Pen-plotter file: strokes only, in pen order.
  function plotter(state) {
    const r = Composer.build(state, { exportSize: true, mode: 'plotter' });
    download(new Blob([r.svg], { type: 'image/svg+xml' }), name(state, 'plotter', 'svg'));
    Toast.show('Saved plotter SVG');
  }

  // One SVG per ink color (for risograph or screen printing), each in its own color on white.
  function layers(state) {
    const r = Composer.build(state, { mode: 'none' });
    const inks = Riso.split(r.shapes), defs = r.shapes.filter(s => s.t === 'def');
    inks.forEach(({ color, shapes }, i) => {
      const file = Svg.render(defs.concat(shapes), r.ctx.L, '#ffffff', { exportSize: true, title: `Ink ${i + 1} ${color}` });
      setTimeout(() => download(new Blob([file], { type: 'image/svg+xml' }), name(state, `ink${i + 1}-${color.slice(1)}`, 'svg')), i * 300);
    });
    Toast.show(`Saving ${inks.length} ink layer${inks.length === 1 ? '' : 's'}`);
  }

  // PNG at dpi (scaled down if the browser can't make a canvas that big).
  async function png(state, dpi) {
    Toast.show(`Rendering PNG at ${dpi} DPI…`, 0);
    const r = Composer.build(state, { exportSize: true });
    const L = r.ctx.L;
    let w = Math.round(L.sheet.w / 25.4 * dpi), h = Math.round(L.sheet.h / 25.4 * dpi);
    const k = Math.min(1, Math.sqrt(MAX_PIXELS / (w * h)));
    w = Math.floor(w * k); h = Math.floor(h * k);
    try {
      const blob = await rasterize(r.svg, w, h, 'image/png');
      download(blob, name(state, dpi + 'dpi', 'png'));
      Toast.show(k < 1 ? `Saved PNG (${w} × ${h}; scaled down to fit this browser)` : `Saved PNG ${w} × ${h} px`);
    } catch (e) {
      Toast.show('Couldn’t make the PNG. Try a lower DPI.');
    }
  }

  // SVG string → image Blob of w × h pixels.
  function rasterize(svgText, w, h, type, quality) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob'))), type || 'image/png', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  // Small data URL thumbnail of an SVG (for the gallery).
  async function thumbnail(svgText, sheet, width) {
    const h = Math.round(width * sheet.h / sheet.w);
    const blob = await rasterize(svgText, width, h, 'image/jpeg', 0.82);
    return new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
  }

  return { svg, png, layers, plotter, download, rasterize, thumbnail, name };
})();

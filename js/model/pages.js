// Paper sizes and page geometry, in millimetres.
const Pages = (() => {
  const SIZES = [
    { id: 'a4', name: 'A4', w: 210, h: 297 },
    { id: 'a3', name: 'A3', w: 297, h: 420 },
    { id: 'a2', name: 'A2', w: 420, h: 594 },
    { id: 'letter', name: 'US Letter', w: 215.9, h: 279.4 },
    { id: '18x24', name: '18 × 24 in', w: 457.2, h: 609.6 },
    { id: '50x70', name: '50 × 70 cm', w: 500, h: 700 },
    { id: 'square', name: 'Square 50 cm', w: 500, h: 500 },
  ];
  const SLUG = 12;   // room outside the bleed for crop marks

  // Page geometry for a poster's page settings. unit: scale relative to A3 (short side 297 mm),
  // so a design keeps its proportions on any paper. Margins are given in A3 millimetres.
  function layout(page) {
    const size = SIZES.find(s => s.id === page.size) || SIZES[1];
    const land = page.orientation === 'landscape';
    const w = land ? size.h : size.w, h = land ? size.w : size.h;
    const unit = Math.min(w, h) / 297;
    const b = page.bleed || 0, m = (page.margin || 0) * unit, slug = page.cropMarks ? SLUG : 0;
    return {
      w, h, unit, bleed: b, margin: m, slug, name: size.name,
      trim: { x: 0, y: 0, w, h },
      full: { x: -b, y: -b, w: w + 2 * b, h: h + 2 * b },
      box: { x: m, y: m, w: w - 2 * m, h: h - 2 * m },
      sheet: { x: -b - slug, y: -b - slug, w: w + 2 * (b + slug), h: h + 2 * (b + slug) },
    };
  }

  return { SIZES, layout };
})();

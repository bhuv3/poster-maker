// Truchet tiles: a grid of simple tiles (arcs, diagonals, triangles, quarter circles) that join into mazes and waves.
(() => {
  Styles.register({
    id: 'truchet',
    name: 'Truchet tiles',
    icon: 'truchet',
    params: [
      { key: 'size', label: 'Tile size', type: 'range', min: 4, max: 80, step: 1, value: 20 },
      { key: 'set', label: 'Tiles', type: 'select', value: 'smith', options: [['smith', 'Filled arcs'], ['arcs', 'Arcs'], ['diagonal', 'Diagonals'], ['triangles', 'Triangles'], ['quarters', 'Quarter circles']] },
      { key: 'weight', label: 'Line weight', type: 'range', min: 0.02, max: 0.5, step: 0.01, value: 0.16 },
      { key: 'bias', label: 'Direction bias', type: 'range', min: 0, max: 1, step: 0.05, value: 0.5 },
      { key: 'flow', label: 'Follow a noise field', type: 'range', min: 0, max: 1, step: 0.05, value: 0, hint: 'Higher values group tiles into larger shapes' },
      { key: 'colors', label: 'Color', type: 'choice', value: 'two', options: [['ink', 'Ink'], ['two', 'Two colors'], ['random', 'Mixed']] },
      { key: 'bleed', label: 'Run off the edges', type: 'check', value: true },
    ],

    generate(rng, p, ctx) {
      const { unit, palette, noise } = ctx;
      const s = p.size * unit, area = p.bleed ? ctx.full : ctx.box;
      const cols = Math.ceil(area.w / s), rows = Math.ceil(area.h / s);
      const ox = area.x + (area.w - cols * s) / 2, oy = area.y + (area.h - rows * s) / 2;
      const accents = Palettes.visible(palette);
      const [c1, c2] = p.colors === 'ink' ? [palette.ink, palette.ink] : [accents[0], accents[1 % accents.length] === accents[0] ? palette.ink : accents[1 % accents.length]];
      const freq = 1 / (60 * unit);
      const orient = (i, j) => {
        const n = noise.noise2((ox + i * s) * freq, (oy + j * s) * freq) * 0.5 + 0.5;
        return (rng.next() * (1 - p.flow) + n * p.flow) < p.bias ? 0 : 1;
      };
      const paths = new Map(), shapes = [];
      // Path data per layer and color (layer 1 draws over layer 0), so each color is one compact path.
      const add = (color, d, layer = 0) => { const k = layer + '|' + color; paths.set(k, (paths.get(k) || '') + d); };
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = ox + i * s, y = oy + j * s, o = orient(i, j);
        const color = p.colors === 'random' ? ctx.colorRng.pick(accents) : (i + j) % 2 ? c2 : c1;
        tile(p.set, x, y, s, o, i, j, color, c1, c2, palette, add, shapes, rng);
      }
      const filled = p.set === 'triangles' || p.set === 'quarters' || p.set === 'smith';
      const style = color => filled ? { fill: color } : { stroke: color, sw: p.weight * s, cap: p.set === 'diagonal' ? 'square' : 'butt' };
      return shapes.concat([...paths].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, d]) => Shapes.path(d, style(k.split('|')[1]))));
    },
  });

  // Adds one tile's path data (or shapes) at (x, y), size s, orientation o.
  function tile(set, x, y, s, o, i, j, color, c1, c2, palette, add, shapes, rng) {
    const n = Geom.num, h = s / 2;
    const arc = (cx, cy, a0, a1) => Shapes.arcData(cx, cy, h, a0, a1, false);
    const pie = (cx, cy, r, a0) => Shapes.arcData(cx, cy, r, a0, a0 + Math.PI / 2, true);
    const Q = Math.PI / 2;
    if (set === 'arcs') {
      add(color, o ? arc(x + s, y, Q, 2 * Q) + arc(x, y + s, -Q, 0) : arc(x, y, 0, Q) + arc(x + s, y + s, 2 * Q, 3 * Q));
    } else if (set === 'diagonal') {
      add(color, o ? `M${n(x)} ${n(y)}L${n(x + s)} ${n(y + s)}` : `M${n(x + s)} ${n(y)}L${n(x)} ${n(y + s)}`);
    } else if (set === 'triangles') {
      const k = o * 2 + (rng.next() < 0.5 ? 1 : 0);
      const pts = [[x, y], [x + s, y], [x + s, y + s], [x, y + s]];
      pts.splice(k, 1);
      add(color, Geom.pathData(pts, true));
    } else if (set === 'quarters') {
      const k = o * 2 + (rng.next() < 0.5 ? 1 : 0);
      const corners = [[x, y, 0], [x + s, y, Q], [x + s, y + s, 2 * Q], [x, y + s, 3 * Q]];
      const [cx, cy, a] = corners[k];
      add(color, pie(cx, cy, s, a));
    } else {
      // Filled arcs (Smith tiles): the tile in one color, the two corner caps in the other. Coloring by checkerboard
      // parity and orientation makes the shapes flow continuously across tiles.
      const odd = (i + j + o) % 2 === 1;
      const bg = odd ? c1 : c2, fg = odd ? c2 : c1;
      add(bg, `M${n(x)} ${n(y)}h${n(s)}v${n(s)}h${n(-s)}Z`);
      add(fg, o ? pie(x + s, y, h, Q) + pie(x, y + s, h, -Q) : pie(x, y, h, 0) + pie(x + s, y + s, h, 2 * Q), 1);
    }
  }
})();

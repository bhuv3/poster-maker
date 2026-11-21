// Small geometry helpers. Points are [x, y] arrays in millimetres.
const Geom = (() => {
  const TAU = Math.PI * 2;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

  // Number → short string with at most 2 decimals (keeps SVG files small).
  function num(n) { return String(Math.round(n * 100) / 100); }

  // Points → SVG path data.
  function pathData(pts, closed) {
    if (!pts.length) return '';
    let d = 'M' + num(pts[0][0]) + ' ' + num(pts[0][1]);
    for (let i = 1; i < pts.length; i++) d += 'L' + num(pts[i][0]) + ' ' + num(pts[i][1]);
    return closed ? d + 'Z' : d;
  }

  // Ramer–Douglas–Peucker: drops points closer than tol to the line between their neighbors.
  function simplify(pts, tol) {
    if (pts.length < 3) return pts;
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      let best = -1, bestD = tol;
      for (let i = a + 1; i < b; i++) {
        const d = segmentDistance(pts[i], pts[a], pts[b]);
        if (d > bestD) { bestD = d; best = i; }
      }
      if (best >= 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
    }
    return pts.filter((p, i) => keep[i]);
  }

  // Distance from point p to segment ab.
  function segmentDistance(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const t = len2 ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2, 0, 1) : 0;
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }

  // Chaikin corner cutting: rounder polylines, ends kept in place.
  function smooth(pts, iterations = 1) {
    let out = pts;
    for (let k = 0; k < iterations && out.length > 2; k++) {
      const next = [out[0]];
      for (let i = 0; i < out.length - 1; i++) {
        const [ax, ay] = out[i], [bx, by] = out[i + 1];
        next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
      }
      next.push(out[out.length - 1]);
      out = next;
    }
    return out;
  }

  // Rectangle shrunk by d on every side.
  function inset(r, d) { return { x: r.x + d, y: r.y + d, w: r.w - 2 * d, h: r.h - 2 * d }; }

  function inRect(x, y, r) { return x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h; }

  // Signed area of a closed polygon (positive when clockwise on screen).
  function area(pts) {
    let a = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
    return a / 2;
  }

  // Total length of a polyline.
  function length(pts) {
    let l = 0;
    for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return l;
  }

  return { TAU, lerp, clamp, dist, num, pathData, simplify, segmentDistance, smooth, inset, inRect, area, length };
})();

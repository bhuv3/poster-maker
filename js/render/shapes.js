// Shape records that styles return and Svg draws. All sizes in millimetres.
// Style s: { fill, stroke, sw (stroke width), opacity, cap, join, rule (fill-rule), dash }.
const Shapes = (() => {
  function rect(x, y, w, h, s, rx) { return { t: 'rect', x, y, w, h, rx: rx || 0, s }; }
  function circle(cx, cy, r, s) { return { t: 'circle', cx, cy, r, s }; }
  function path(d, s) { return { t: 'path', d, s }; }
  function poly(pts, s, closed) { return { t: 'poly', pts, closed: !!closed, s }; }
  function line(x1, y1, x2, y2, s) { return { t: 'poly', pts: [[x1, y1], [x2, y2]], closed: false, s }; }

  // Text with its baseline at y. o: { size, family, weight, anchor, rot, tracking, italic }.
  function text(x, y, str, o, s) { return { t: 'text', x, y, str, ...o, s }; }

  // A definition (filter, gradient) that goes in the SVG's <defs>. "{id}" in it becomes this poster's unique id
  // prefix; groups refer to it with group.filter = the rest of the id.
  function def(markup) { return { t: 'def', markup }; }

  // A group with an optional transform ("rotate(…)", "translate(…)").
  function group(children, transform, s) { return { t: 'group', children, transform: transform || '', s: s || {} }; }

  // Path data for a circular arc from angle a0 to a1 (radians). pie: closes through the center.
  function arcData(cx, cy, r, a0, a1, pie) {
    const n = Geom.num;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0, sweep = a1 > a0 ? 1 : 0;
    const arc = `A${n(r)} ${n(r)} 0 ${large} ${sweep} ${n(x1)} ${n(y1)}`;
    return pie ? `M${n(cx)} ${n(cy)}L${n(x0)} ${n(y0)}${arc}Z` : `M${n(x0)} ${n(y0)}${arc}`;
  }

  // The main color of a shape (its fill, else its stroke), used to sort shapes into ink layers.
  function colorOf(sh) {
    if (sh.t === 'def') return null;
    const s = sh.s || {};
    if (s.fill && s.fill !== 'none') return s.fill.startsWith('url(') ? null : s.fill;
    return s.stroke && s.stroke !== 'none' ? s.stroke : null;
  }

  return { rect, circle, path, poly, line, text, group, def, arcData, colorOf };
})();

// The poster on screen: fits the paper to the space between the panels and shows a "drawing" hint when slow.
const Stage = (() => {
  const $ = id => document.getElementById(id);
  const PAD = 32, BAR = 76;   // space around the paper, and room for the floating bar
  let sheet = null;

  function init() {
    new ResizeObserver(fit).observe($('stage'));
  }

  // Puts a built poster on the paper.
  function show(result) {
    $('paper').innerHTML = result.svg;
    sheet = result.ctx.L.sheet;
    fit();
    $('renderTime').textContent = `${Math.round(result.ms)} ms`;
  }

  // Scales the paper to the largest size that fits.
  function fit() {
    if (!sheet) return;
    const r = $('stage').getBoundingClientRect();
    const k = Math.min((r.width - PAD * 2) / sheet.w, (r.height - PAD - BAR) / sheet.h);
    $('paper').style.width = Math.max(10, sheet.w * k) + 'px';
    $('paper').style.height = Math.max(10, sheet.h * k) + 'px';
  }

  // Shows or hides the "Drawing…" hint.
  function busy(on) { $('stage').classList.toggle('busy', on); }

  return { init, show, fit, busy };
})();

// Floating bar under the poster: seed with back/forward, new poster, part locks, and color shuffle.
const Bar = (() => {
  const $ = id => document.getElementById(id);
  const LOCKS = [['palette', 'palette', 'Palette', 'P'], ['layout', 'layout', 'Layout', 'L'], ['text', 'text', 'Text placement and font', 'T']];

  function init() {
    $('seedBar').innerHTML = `
      <button class="icon-btn" id="btnBack" title="Previous (←)" aria-label="Previous">${Icons.svg('left')}</button>
      <label class="seed" title="Seed: type a number to jump to that poster"><span>#</span><input id="seedInput" inputmode="numeric" spellcheck="false" aria-label="Seed"></label>
      <button class="icon-btn" id="btnForward" title="Next (→)" aria-label="Next">${Icons.svg('right')}</button>
      <button class="primary" id="btnNew" title="New poster (Space)">${Icons.svg('dice', 16)}<span>New poster</span><kbd>Space</kbd></button>
      <span class="sep"></span>
      ${LOCKS.map(([k, , label, key]) => `<button class="icon-btn lock" data-lock="${k}" title="Lock ${label.toLowerCase()} (${key})" aria-label="Lock ${label}" aria-pressed="false"></button>`).join('')}
      <span class="sep"></span>
      <button class="icon-btn" id="btnShuffle" title="Shuffle colors (C)" aria-label="Shuffle colors">${Icons.svg('shuffle')}</button>`;
    $('btnBack').addEventListener('click', () => App.back());
    $('btnForward').addEventListener('click', () => App.forward());
    $('btnNew').addEventListener('click', () => App.next());
    $('btnShuffle').addEventListener('click', () => App.shuffleColors());
    $('seedBar').querySelectorAll('[data-lock]').forEach(b => b.addEventListener('click', () => App.toggleLock(b.dataset.lock)));
    const input = $('seedInput');
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { input.blur(); } if (e.key === 'Escape') { input.blur(); } });
    input.addEventListener('change', () => { const n = parseInt(input.value.replace(/\D/g, ''), 10); if (n > 0) App.setSeed(n); });
  }

  // Shows the seed, lock states, and whether back/forward are possible.
  function render(state) {
    const input = $('seedInput');
    if (document.activeElement !== input) input.value = state.seeds.layout;
    $('btnBack').disabled = !History.canBack();
    $('btnForward').disabled = !History.canForward();
    $('seedBar').querySelectorAll('[data-lock]').forEach(b => {
      const [, icon, label] = LOCKS.find(l => l[0] === b.dataset.lock), on = state.locks[b.dataset.lock];
      b.innerHTML = Icons.svg(icon) + `<span class="lock-badge">${Icons.svg(on ? 'lock' : 'unlock', 11)}</span>`;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on);
      b.title = `${on ? 'Unlock' : 'Lock'} ${label.toLowerCase()} (${LOCKS.find(l => l[0] === b.dataset.lock)[3]})`;
    });
  }

  return { init, render };
})();

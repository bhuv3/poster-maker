// Overlays (gallery, mutate grid, shortcuts) and short toast messages.
const Overlay = (() => {
  const root = () => document.getElementById('overlay');
  let onClose = null;

  // Opens an overlay with inner HTML; Escape or the backdrop closes it. Returns the content element.
  function open(html, opts = {}) {
    const r = root();
    r.innerHTML = `<div class="sheet ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${opts.label || ''}">${html}</div>`;
    r.hidden = false;
    onClose = opts.onClose || null;
    r.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    return r.firstElementChild;
  }

  function close() {
    const r = root();
    if (r.hidden) return;
    r.hidden = true;
    r.innerHTML = '';
    const fn = onClose;
    onClose = null;
    if (fn) fn();
  }

  function isOpen() { return !root().hidden; }

  window.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { e.preventDefault(); close(); } });
  document.addEventListener('mousedown', e => { if (e.target === root()) close(); });

  // Keyboard shortcuts list.
  function shortcuts(list) {
    open(`<header class="sheet-head"><h2>Keyboard shortcuts</h2><button class="icon-btn" data-close aria-label="Close">${Icons.svg('x')}</button></header>
      <div class="shortcut-list">${list.map(([k, d]) => `<kbd>${k}</kbd><span>${d}</span>`).join('')}</div>`, { label: 'Keyboard shortcuts' });
  }

  return { open, close, isOpen, shortcuts };
})();

// Short message at the bottom of the screen.
const Toast = (() => {
  let timer = null;

  // Shows text for a moment (ms = 0 keeps it until the next message).
  function show(text, ms = 2200) {
    const el = document.getElementById('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(timer);
    if (ms) timer = setTimeout(() => el.classList.remove('show'), ms);
  }

  return { show };
})();

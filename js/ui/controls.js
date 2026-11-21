// Form controls built from a parameter list: sliders, switches, segmented choices, selects, and text fields.
// Param: { key, label, type: range|check|choice|select|text|textarea, min, max, step, options: [[value, label]], hint }.
const Controls = (() => {
  // HTML rows for params with their current values. group names whose values they are (e.g. "style", "text").
  function html(params, values, group) {
    return params.map(p => row(p, values[p.key], group)).join('');
  }

  // One control row.
  function row(p, v, group) {
    const id = `c-${group}-${p.key}`, data = `data-group="${group}" data-key="${p.key}" data-type="${p.type}"`;
    const hint = p.hint ? ` title="${p.hint}"` : '';
    const label = `<label class="row-label" for="${id}"${hint}>${p.label}</label>`;
    switch (p.type) {
      case 'check':
        return `<div class="row check">${label}<input type="checkbox" class="switch" id="${id}" ${data} ${v ? 'checked' : ''}></div>`;
      case 'choice':
        return `<div class="row choice"><span class="row-label"${hint}>${p.label}</span><span class="seg" role="group" aria-label="${p.label}">${p.options.map(([ov, ol]) =>
          `<button type="button" ${data} data-value="${ov}" class="${String(v) === String(ov) ? 'active' : ''}">${ol}</button>`).join('')}</span></div>`;
      case 'select':
        return `<div class="row select">${label}<select id="${id}" ${data}>${p.options.map(([ov, ol]) =>
          `<option value="${ov}" ${String(v) === String(ov) ? 'selected' : ''}>${ol}</option>`).join('')}</select></div>`;
      case 'text':
        return `<div class="row text">${label}<input type="text" id="${id}" ${data} value="${esc(v)}" spellcheck="false"></div>`;
      case 'textarea':
        return `<div class="row text">${label}<textarea id="${id}" ${data} rows="${p.rows || 2}" spellcheck="false">${esc(v)}</textarea></div>`;
      default:
        return `<div class="row range">${label}<output>${format(p, v)}</output>
          <input type="range" id="${id}" ${data} min="${p.min}" max="${p.max}" step="${p.step}" value="${v}"></div>`;
    }
  }

  // Calls onChange(group, key, value, final) as controls change. final is false while a slider is being dragged
  // or text is being typed, so callers can merge those steps in history.
  function wire(container, params, onChange) {
    const find = (group, key) => (params[group] || []).find(p => p.key === key);
    container.querySelectorAll('[data-key]').forEach(el => {
      const { group, key, type } = el.dataset;
      const p = find(group, key);
      if (type === 'choice') {
        el.addEventListener('click', () => {
          container.querySelectorAll(`[data-group="${group}"][data-key="${key}"]`).forEach(b => b.classList.toggle('active', b === el));
          onChange(group, key, parse(p, el.dataset.value), true);
        });
      } else if (type === 'check' || type === 'select') {
        el.addEventListener('change', () => onChange(group, key, type === 'check' ? el.checked : parse(p, el.value), true));
      } else if (type === 'range') {
        const out = el.parentElement.querySelector('output');
        el.addEventListener('input', () => { out.textContent = format(p, +el.value); onChange(group, key, +el.value, false); });
        el.addEventListener('change', () => onChange(group, key, +el.value, true));
      } else {
        el.addEventListener('input', () => onChange(group, key, el.value, false));
      }
    });
  }

  // Choice and select values keep their type (numbers stay numbers).
  function parse(p, v) { return p && p.options && typeof p.options[0][0] === 'number' ? +v : v; }

  // Slider readout with as many decimals as its step.
  function format(p, v) {
    const d = String(p.step).includes('.') ? String(p.step).split('.')[1].length : 0;
    return (+v).toFixed(d) + (p.unit || '');
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

  return { html, row, wire, esc };
})();

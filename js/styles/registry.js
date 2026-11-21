// The list of poster styles. Each style is { id, name, key, params, generate(rng, p, ctx) → shapes }.
const Styles = (() => {
  const list = [];

  function register(def) { list.push(def); }
  function get(id) { return list.find(s => s.id === id) || list[0]; }
  function all() { return list; }

  // A style's parameter defaults as { key: value }.
  function defaults(def) {
    const out = {};
    for (const p of def.params) out[p.key] = p.value;
    return out;
  }

  return { register, get, all, defaults };
})();

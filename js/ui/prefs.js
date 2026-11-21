// Preferences and saved things remembered in this browser (localStorage, never required).
const Prefs = (() => {
  const PREFIX = 'poster-maker:';

  // Stored value for key, or fallback when missing or storage is blocked.
  function get(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  // Remembers a value (anything JSON can hold). False when storage is full or blocked.
  function set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }

  return { get, set };
})();

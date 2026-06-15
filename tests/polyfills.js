// Test polyfills — imported first (before i18n) from tests/setup.js.
//
// Some Node 25 + jsdom combinations expose only a partial Web Storage object
// (getItem/setItem present, but removeItem/clear missing), which breaks any
// code path that removes keys. Install a complete in-memory localStorage so
// the local-persistence code and its tests are deterministic across
// environments.

class MemoryStorage {
  #map = new Map();
  get length() {
    return this.#map.size;
  }
  key(i) {
    return [...this.#map.keys()][i] ?? null;
  }
  getItem(k) {
    const key = String(k);
    return this.#map.has(key) ? this.#map.get(key) : null;
  }
  setItem(k, v) {
    this.#map.set(String(k), String(v));
  }
  removeItem(k) {
    this.#map.delete(String(k));
  }
  clear() {
    this.#map.clear();
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
});

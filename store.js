// Everything the site remembers about a student lives in their own browser. Storage can be blocked
// (private windows, strict settings), so every access is guarded and failure just means "forget".
import { touchRecent } from "./model.js";

export const KEYS = {
  scores: "h2-quiz-scores-v1",
  flashcards: "h2-flashcards-v1",
  guideRead: "h2-guide-read-v1",
  recents: "h2-recents-v1",
  theme: "h2-theme-v1",
  user: "h2-user-v1",
};

export function createStore(storage) {
  const read = (key) => { try { return storage ? storage.getItem(key) : null; } catch { return null; } };
  const write = (key, text) => { try { storage?.setItem(key, text); } catch { /* blocked: not remembered */ } };
  const store = {
    get(key, fallback) {
      const text = read(key);
      if (text == null) return fallback;
      try {
        const value = JSON.parse(text);
        const wantArray = Array.isArray(fallback), wantObject = fallback && typeof fallback === "object" && !wantArray;
        if (wantArray) return Array.isArray(value) ? value : fallback;
        if (wantObject) return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
        return value;
      } catch { return fallback; }
    },
    set(key, value) { write(key, JSON.stringify(value)); },
    remove(key) { try { storage?.removeItem(key); } catch { /* ignore */ } },
    theme() { const t = store.get(KEYS.theme, "light"); return ["light", "dark", "system"].includes(t) ? t : "light"; },
    setTheme(t) { if (["light", "dark", "system"].includes(t)) store.set(KEYS.theme, t); },
    recents() { return store.get(KEYS.recents, []); },
    addRecent(item) { store.set(KEYS.recents, touchRecent(store.recents(), item, 6)); },
  };
  return store;
}

// Keeps a student's progress on the server as well as in the browser, so it follows them between devices.
import { KEYS } from "./store.js";

export const SYNC_KEYS = [KEYS.scores, KEYS.flashcards, KEYS.guideRead];
const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

// When the same item exists on both sides, keep whichever shows more progress.
export function mergeProgress(local, remote) {
  const out = {};
  const [ls, rs] = [obj(local[KEYS.scores]), obj(remote[KEYS.scores])];
  out[KEYS.scores] = { ...rs };
  for (const [id, rec] of Object.entries(ls)) {
    const other = rs[id];
    out[KEYS.scores][id] = other && other.best > rec.best ? { ...rec, best: other.best } : rec;
  }
  const [lc, rc] = [obj(local[KEYS.flashcards]), obj(remote[KEYS.flashcards])];
  out[KEYS.flashcards] = { ...rc };
  for (const [id, box] of Object.entries(lc)) out[KEYS.flashcards][id] = Math.max(Number(box) || 0, Number(rc[id]) || 0);
  out[KEYS.guideRead] = { ...obj(remote[KEYS.guideRead]), ...obj(local[KEYS.guideRead]) };
  return out;
}

export async function startSync(store, username, api, { wait = 4000, delay = 800, retry = 30000 } = {}) {
  const last = store.get(KEYS.user, null);
  if (last && last !== username) SYNC_KEYS.forEach((k) => store.remove(k));      // a different student on a shared browser
  store.set(KEYS.user, username);
  const local = () => Object.fromEntries(SYNC_KEYS.map((k) => [k, store.get(k, {})]));

  const first = (async () => {
    const merged = mergeProgress(local(), await api.fetchProgress());
    for (const k of SYNC_KEYS) store.set(k, merged[k]);
    await api.pushProgress(merged);
  })().catch(() => {});
  await Promise.race([first, new Promise((r) => setTimeout(r, wait))]);

  let timer = null, dirty = false;
  const flush = async (extra) => {
    clearTimeout(timer); timer = null;
    try { await api.pushProgress(local(), extra); dirty = false; } catch { dirty = true; }
  };
  const orig = store.set.bind(store);
  store.set = (k, v) => { orig(k, v); if (SYNC_KEYS.includes(k)) { dirty = true; clearTimeout(timer); timer = setTimeout(flush, delay); } };
  const again = () => { if (dirty && !timer) flush(); };
  if (typeof window !== "undefined") {
    window.addEventListener("online", again);
    window.addEventListener("pagehide", () => { if (dirty) flush({ keepalive: true }); });
    setInterval(again, retry);
  }
  return { flush };
}

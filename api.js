// Talks to the portal server: log in, resume a session, save and load progress.
const TOKEN_KEY = "h2-session-v1";
const base = () => String(window.PORTAL_API || "").replace(/\/$/, "");

export class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }

export const token = () => { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } };
const keep = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* blocked: stays logged in for this page only */ } };
export const logout = () => keep("");

async function call(method, path, body, extra = {}) {
  let r;
  try {
    r = await fetch(base() + path, { method, headers: { "content-type": "application/json", ...(token() ? { authorization: `Bearer ${token()}` } : {}) }, body: body ? JSON.stringify(body) : undefined, ...extra });
  } catch { throw new ApiError("Could not reach the server. Check your connection and try again.", 0); }
  const json = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(json.error || "Something went wrong.", r.status);
  return json;
}

export async function login(username, code) {
  const r = await call("POST", "/api/login", { username, code });
  keep(r.token);
  return r;
}

// Returns the session if the saved login is still good, null if it has ended, and throws if the server is unreachable.
export async function resume() {
  if (!token()) return null;
  try { return await call("GET", "/api/session"); }
  catch (e) { if (e.status === 401) { logout(); return null; } throw e; }
}

export const fetchProgress = () => call("GET", "/api/progress").then((r) => r.data || {});
export const pushProgress = (data, extra) => call("PUT", "/api/progress", { data }, extra);

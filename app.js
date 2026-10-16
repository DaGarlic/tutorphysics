// Bootstrap and routing. Each page lives in its own view-*.js module.
import { unlock, UnlockError } from "./crypto.js";
import { createStore } from "./store.js";
import { DEMOS } from "./demos.js";
import { h } from "./ui.js";
import { buildShell, applyTheme } from "./shell.js";
import { openDocument } from "./viewer.js";
import { fileRow } from "./components.js";
import * as M from "./model.js";
import * as Home from "./view-home.js";
import * as Lib from "./view-library.js";
import * as Guide from "./view-guide.js";
import * as Notes from "./view-notes.js";
import * as Quiz from "./view-quiz.js";
import * as Structured from "./view-structured.js";
import * as Cards from "./view-cards.js";
import * as DemoViews from "./view-demos.js";
import * as api from "./api.js";
import { startSync } from "./sync.js";

const safeStorage = () => { try { return window.localStorage; } catch { return null; } };
const store = createStore(safeStorage());
applyTheme(store.theme());

const routes = {
  "": Home.home, practical: Home.practical, practise: Home.practise, library: Home.library,
  topics: Lib.topics, topic: Lib.topic, papers: Lib.papers, reference: Lib.reference, file: Lib.file, search: Lib.search,
  notes: Notes.notes, structured: Structured.structured, guide: Guide.guide, pquiz: Quiz.pquiz, quizzes: Quiz.quizzes, quiz: Quiz.quiz,
  flashcards: Cards.flashcards, demos: DemoViews.demos, demo: DemoViews.demo,
};

let ctx = null;
let shell = null;
const leaveHooks = [];

function route() {
  if (!ctx) return;
  leaveHooks.splice(0).forEach((fn) => { try { fn(); } catch { /* ignore */ } });
  const hash = location.hash || "#/";
  const [pathPart, query = ""] = hash.replace(/^#\/?/, "").split("?");
  const [name = "", arg] = pathPart.split("/");
  const view = routes[name] || routes[""];
  ctx.wide = false;
  const nodes = view(ctx, arg ? decodeURIComponent(arg) : arg, new URLSearchParams(query));
  const main = document.getElementById("view");
  main.replaceChildren(...[].concat(nodes).flat(Infinity).filter(Boolean));
  main.classList.toggle("wide", !!ctx.wide);
  main.style.animation = "none"; void main.offsetWidth; main.style.animation = "";   // replay the page-in transition
  shell.update(hash);
  const trail = M.breadcrumbs(hash, ctx.index, ctx.demos);
  document.title = `${trail.at(-1).label} · Physics Portal`;
  if (trail.length >= 2 && !["search", "file"].includes(name)) store.addRecent({ href: hash, title: name === "notes" ? `${trail.at(-2).label}: notes` : trail.at(-1).label });
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

async function start(passphrase, session) {
  const { key, index } = await unlock(passphrase, async (name) => {
    const r = await fetch(name, { cache: "no-cache" });
    if (!r.ok) throw new Error(`failed to load ${name}`);
    return r.arrayBuffer();
  });
  const normalised = { topics: [], entries: [], flashcards: [], quizzes: [], pquizzes: [], guide: [], notes: [], structured: [], ...index };
  ctx = {
    index: normalised, key, store, demos: DEMOS, user: session,
    openDoc: (entry) => openDocument(ctx, entry),
    fileRow: (entry, solution) => fileRow(ctx, entry, solution),
    onLeave: (fn) => leaveHooks.push(fn),
  };
  await startSync(store, session.username, api);
  shell = buildShell(ctx);
  document.getElementById("login").hidden = true;
  document.getElementById("app").hidden = false;
  route();
}

document.getElementById("admin-link").href = `${window.PORTAL_API}/admin`;
const form = document.getElementById("login-form");
const button = document.getElementById("login-btn");
const error = document.getElementById("login-error");
const showError = (msg) => { error.textContent = msg; error.hidden = false; };
form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  error.hidden = true;
  const username = document.getElementById("user").value, code = document.getElementById("pw").value;
  if (!username.trim() || !code.trim()) { showError("Enter your name and your login code."); return; }
  button.disabled = true;
  button.textContent = "Logging in…";
  try {
    const session = await api.login(username, code);
    await start(session.passphrase, session);
    document.getElementById("pw").value = "";
  } catch (e) {
    api.logout();
    showError(e instanceof UnlockError || e instanceof api.ApiError ? e.message : "Could not load the site. Check your connection.");
    document.getElementById("pw").focus();
  } finally {
    button.disabled = false;
    button.textContent = "Log in";
  }
});
window.addEventListener("hashchange", route);

// Someone who logged in before goes straight in.
if (api.token()) {
  const loginBox = document.getElementById("login");
  loginBox.hidden = true;
  api.resume().then((session) => (session ? start(session.passphrase, session) : Promise.reject(new api.ApiError("Your login has ended. Please log in again.", 401))))
    .catch((e) => { loginBox.hidden = false; showError(e instanceof api.ApiError ? e.message : "Could not load the site. Check your connection."); });
}

// The frame around every page: sidebar (desktop), tab bar (phone), top bar with breadcrumbs, theme and search.
import { h, icon, openLayer } from "./ui.js";
import * as M from "./model.js";
import { logout } from "./api.js";

const SECTIONS = [
  { id: "topics", label: "Learn", href: "#/topics", icon: "book" },
  { id: "practical", label: "Practical", href: "#/practical", icon: "flask" },
  { id: "practise", label: "Exam practice", short: "Exams", href: "#/practise", icon: "target" },
  { id: "library", label: "Reference", href: "#/library", icon: "library" },
];

export function sectionOf(hash) {
  const name = String(hash || "").replace(/^#\/?/, "").split(/[/?]/)[0];
  if (!name) return "home";
  if (["topics", "topic", "notes", "structured", "flashcards", "demos", "demo"].includes(name)) return "topics";
  if (["practical", "guide", "pquiz"].includes(name)) return "practical";
  if (["practise", "quizzes", "quiz", "papers"].includes(name)) return "practise";
  if (["library", "reference", "file"].includes(name)) return "library";
  return null;
}

export function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme === "dark" ? "dark" : "light";
}
const effectiveTheme = (theme) => (theme === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme);

export function buildShell(ctx) {
  const { store } = ctx;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  const themeBtn = h("button", { class: "icon-btn", "aria-label": "Switch between light and dark", title: "Switch theme" });
  const paintTheme = () => {
    themeBtn.replaceChildren(icon(effectiveTheme(store.theme()) === "dark" ? "sun" : "moon", 18));
  };
  themeBtn.addEventListener("click", () => {
    const next = effectiveTheme(store.theme()) === "dark" ? "light" : "dark";
    store.setTheme(next);
    applyTheme(next);
    paintTheme();
  });
  paintTheme();

  const searchBtn = h("button", { class: "search-trigger", "aria-label": "Search the site" },
    icon("search", 16), h("span", {}, "Search notes, papers, quizzes"), h("kbd", {}, isMac ? "⌘K" : "Ctrl K"));
  searchBtn.addEventListener("click", () => openPalette(ctx));

  const crumbs = h("nav", { class: "crumbs", "aria-label": "Breadcrumb" });
  document.getElementById("topbar").replaceChildren(crumbs);
  const topbar = document.getElementById("topbar");

  const lockBtn = h("button", { class: "icon-btn", "aria-label": "Lock the site", title: "Lock the site" }, icon("lock", 18));
  lockBtn.addEventListener("click", () => { logout(); location.reload(); });
  const links = SECTIONS.map((s) => h("a", { class: "nav-link", href: s.href, "data-section": s.id }, s.label));
  document.getElementById("masthead").replaceChildren(
    h("div", { class: "masthead-row" },
      h("a", { class: "brand", href: "#/" }, h("span", { class: "brand-mark" }, "P"), h("span", { class: "brand-name" }, "Physics Portal", h("small", {}, "by Ariq"))),
      h("div", { class: "masthead-tools" }, searchBtn, ctx.user ? h("span", { class: "whoami", title: "Logged in as" }, ctx.user.name) : null, themeBtn, lockBtn)),
    h("nav", { class: "mast-tabs", "aria-label": "Main" }, links));

  const tabs = SECTIONS.map((s) => h("a", { class: "tab", href: s.href, "data-section": s.id }, icon(s.icon, 21), s.short || s.label));
  document.getElementById("tabbar").replaceChildren(h("a", { class: "tab", href: "#/", "data-section": "home" }, icon("home", 21), "Home"), ...tabs);

  window.addEventListener("scroll", () => topbar.classList.toggle("scrolled", window.scrollY > 4), { passive: true });
  document.addEventListener("keydown", (ev) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName) || ev.target.isContentEditable;
    if ((ev.key.toLowerCase() === "k" && (ev.metaKey || ev.ctrlKey)) || (ev.key === "/" && !typing)) {
      ev.preventDefault();
      openPalette(ctx);
    }
  });

  return {
    update(hash) {
      const current = sectionOf(hash);
      for (const el of document.querySelectorAll("[data-section]")) {
        if (el.dataset.section === current) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
      }
      const trail = M.breadcrumbs(hash, ctx.index, ctx.demos);
      crumbs.replaceChildren(...trail.flatMap((c, i) => [
        i ? icon("chevron-right", 14) : null,
        c.href ? h("a", { href: c.href }, c.label) : h("span", { "aria-current": "page" }, c.label),
      ]).filter(Boolean));
    },
  };
}

export function openPalette(ctx) {
  let results = [];
  let active = 0;
  openLayer((close) => {
    const input = h("input", { type: "text", placeholder: "Search topics, guide, quizzes, past papers…", "aria-label": "Search", "data-autofocus": "", autocomplete: "off", spellcheck: "false" });
    const list = h("div", { class: "palette-results", role: "listbox" });
    const flat = () => results.flatMap((g) => g.items);
    const go = (item) => { close(); setTimeout(() => (location.hash = item.href), 0); };
    const paint = () => {
      const q = input.value.trim();
      results = M.searchAll(ctx.index, ctx.demos, q);
      active = 0;
      if (!q) { list.replaceChildren(h("p", { class: "palette-empty" }, "Type to search everything on the site.")); return; }
      if (!results.length) { list.replaceChildren(h("p", { class: "palette-empty" }, `No matches for "${q}".`)); return; }
      let n = 0;
      list.replaceChildren(...results.flatMap((g) => [
        h("div", { class: "palette-group" }, g.kind),
        ...g.items.map((item) => {
          const i = n++;
          const row = h("a", { class: "palette-item", href: item.href, role: "option", "aria-selected": String(i === active), "data-i": i },
            h("span", { class: "grow" }, h("div", { class: "title" }, item.title), item.sub ? h("div", { class: "sub" }, item.sub) : null),
            icon("arrow-right", 15));
          row.addEventListener("click", (ev) => { ev.preventDefault(); go(item); });
          return row;
        }),
      ]));
    };
    const highlight = () => {
      list.querySelectorAll(".palette-item").forEach((el) => el.setAttribute("aria-selected", String(Number(el.dataset.i) === active)));
      list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    };
    input.addEventListener("input", paint);
    input.addEventListener("keydown", (ev) => {
      const items = flat();
      if (ev.key === "ArrowDown") { ev.preventDefault(); active = Math.min(active + 1, items.length - 1); highlight(); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); active = Math.max(active - 1, 0); highlight(); }
      else if (ev.key === "Enter" && items[active]) { ev.preventDefault(); go(items[active]); }
    });
    paint();
    return [
      h("div", { class: "palette-input" }, icon("search", 18), input, h("kbd", {}, "Esc")),
      list,
      h("div", { class: "palette-foot" }, h("span", {}, h("kbd", {}, "↑"), " ", h("kbd", {}, "↓"), " to move"), h("span", {}, h("kbd", {}, "↵"), " to open")),
    ];
  }, { label: "Search", className: "palette" });
}

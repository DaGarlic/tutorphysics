// The practical exam guide: landing page and a reading layout.
import { h, icon } from "./ui.js";
import * as M from "./model.js";
import { KEYS } from "./store.js";
import { parseMarkdown, renderBlocks } from "./markdown.js";
import { pageHead } from "./components.js";

const minutes = (md) => Math.max(1, Math.round(md.split(/\s+/).length / 200));
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function guide(ctx, id) {
  return id ? chapter(ctx, id) : landing(ctx);
}

function landing(ctx) {
  const { index, store } = ctx;
  const read = store.get(KEYS.guideRead, {});
  const chapters = index.guide;
  if (!chapters.length) return [pageHead({ eyebrow: "Practical", title: "Exam guide" }), h("p", { class: "empty" }, "The guide is coming soon.")];
  const next = M.nextChapter(chapters, read);
  const done = chapters.filter((c) => read[c.id]).length;
  return [
    pageHead({ eyebrow: "Practical · Paper 4", title: "How to ace the practical exam", lede: "Work through the chapters in order: from how marks are won to a last-day checklist. Each ends with a quiz so you can check it stuck." }),
    h("div", { class: "card guide-progress" },
      h("div", { class: "grow" }, h("strong", {}, `${done} of ${chapters.length} chapters read`), h("div", { class: "progress" }, h("i", { style: `width:${Math.round((done / chapters.length) * 100)}%` }))),
      next ? h("a", { class: "btn btn-primary", href: `#/guide/${next.id}` }, done ? "Continue" : "Start reading", icon("arrow-right", 16)) : h("span", { class: "badge badge-ok" }, "All read")),
    h("ol", { class: "list chapter-list" }, chapters.map((c, i) => h("li", {}, h("a", { class: "list-row", href: `#/guide/${c.id}` },
      h("span", { class: `chapter-num${read[c.id] ? " done" : ""}` }, read[c.id] ? icon("check", 15) : String(i + 1)),
      h("span", { class: "grow" }, h("span", { class: "title" }, c.title), h("span", { class: "sub" }, c.summary)),
      h("span", { class: "muted small" }, `${minutes(c.md)} min`), icon("chevron-right", 16))))),
  ];
}

function chapter(ctx, id) {
  const { index, store } = ctx;
  const chapters = index.guide;
  const nb = M.guideNeighbours(chapters, id);
  if (!nb) return [h("p", { class: "empty" }, "Chapter not found.")];
  ctx.wide = true;
  const c = chapters[nb.position - 1];
  const read = store.get(KEYS.guideRead, {});
  const body = h("div", { class: "prose" }, renderBlocks(parseMarkdown(c.md), h));
  const heads = [...body.querySelectorAll("h2")].map((el) => { el.id = slug(el.textContent); return el; });

  const mark = h("button", { class: `btn ${read[c.id] ? "" : "btn-primary"}`, onclick: () => {
    const r = store.get(KEYS.guideRead, {});
    r[c.id] ? delete r[c.id] : (r[c.id] = true);
    store.set(KEYS.guideRead, r);
    mark.replaceChildren(...(r[c.id] ? [icon("check", 16), "Marked as read"] : ["Mark as read"]));
    mark.classList.toggle("btn-primary", !r[c.id]);
    rail.querySelector(`[data-id="${c.id}"] .chapter-num`)?.classList.toggle("done", !!r[c.id]);
  } }, ...(read[c.id] ? [icon("check", 16), "Marked as read"] : ["Mark as read"]));

  const rail = h("aside", { class: "rail", "aria-label": "Chapters" }, h("p", { class: "rail-title" }, h("a", { href: "#/guide" }, "Exam guide")),
    h("ol", {}, chapters.map((x, i) => h("li", { "data-id": x.id }, h("a", { href: `#/guide/${x.id}`, "aria-current": x.id === c.id ? "page" : null },
      h("span", { class: `chapter-num${read[x.id] ? " done" : ""}` }, String(i + 1)), x.title)))));
  const toc = h("nav", { class: "toc", "aria-label": "On this page" }, h("p", { class: "rail-title" }, "On this page"),
    h("ul", {}, heads.map((el) => h("li", {}, h("a", { href: `#/guide/${c.id}`, "data-target": el.id, onclick: (ev) => { ev.preventDefault(); el.scrollIntoView({ behavior: "smooth", block: "start" }); } }, el.textContent)))));

  const tests = M.quizzesForChapter(index.pquizzes, c.id);
  const bar = h("div", { class: "read-progress", "aria-hidden": "true" }, h("i"));
  queueMicrotask(() => {                       // run once the page is in the document
    const fill = bar.firstChild;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      fill.style.width = `${max > 0 ? Math.min(100, (scrollY / max) * 100) : 0}%`;
    };
    document.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    const links = new Map([...toc.querySelectorAll("a[data-target]")].map((a) => [a.dataset.target, a]));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { links.forEach((a) => a.removeAttribute("aria-current")); links.get(e.target.id)?.setAttribute("aria-current", "true"); }
    }, { rootMargin: "-90px 0px -70% 0px" });
    heads.forEach((el) => io.observe(el));
    ctx.onLeave(() => { document.removeEventListener("scroll", onScroll); io.disconnect(); });
  });

  return [bar, h("div", { class: "reader" }, rail,
    h("article", { class: "reader-main" },
      h("header", { class: "page-head" }, h("p", { class: "eyebrow" }, `Chapter ${nb.position} of ${chapters.length} · ${minutes(c.md)} min read`), h("h1", {}, c.title), h("p", { class: "lede" }, c.summary)),
      body,
      tests.length ? h("section", { class: "section" }, h("div", { class: "section-head" }, h("h2", {}, "Test yourself")),
        h("div", { class: "grid" }, tests.map((q) => h("a", { class: "card card-link", href: `#/pquiz/${q.id}` }, h("h4", {}, q.title), h("p", {}, `${q.questions.length} questions`))))) : null,
      h("div", { class: "reader-foot" }, mark),
      h("nav", { class: "pager", "aria-label": "Chapters" },
        nb.prev ? h("a", { class: "card card-link pager-link", href: `#/guide/${nb.prev.id}` }, h("small", { class: "muted" }, "Previous"), h("strong", {}, nb.prev.title)) : h("span"),
        nb.next ? h("a", { class: "card card-link pager-link next", href: `#/guide/${nb.next.id}` }, h("small", { class: "muted" }, "Next"), h("strong", {}, nb.next.title)) : h("span"))),
    toc)];
}

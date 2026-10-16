// Per-topic lecture notes: a reading layout with a topic rail, an outline and links to practise the topic.
import { h, icon } from "./ui.js";
import * as M from "./model.js";
import { parseMarkdown, renderBlocks } from "./markdown.js";

const minutes = (md) => Math.max(1, Math.round(md.split(/\s+/).length / 200));
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function notes(ctx, id) {
  const { index } = ctx;
  const topic = index.topics.find((t) => t.id === Number(id));
  const nb = M.noteNeighbours(index.notes, id);
  if (!topic || !nb) return [h("p", { class: "empty" }, "There are no notes for this topic yet. ", h("a", { href: "#/topics" }, "Back to topics"))];
  ctx.wide = true;
  const note = index.notes[nb.position - 1];
  const nameOf = (n) => index.topics.find((t) => t.id === n.topic).name;
  const body = h("div", { class: "prose" }, renderBlocks(parseMarkdown(note.md), h));
  const heads = [...body.querySelectorAll("h2")].map((el) => { el.id = slug(el.textContent); return el; });

  const rail = h("aside", { class: "rail", "aria-label": "Topics" }, h("p", { class: "rail-title" }, h("a", { href: "#/topics" }, "Topic notes")),
    h("ol", {}, index.topics.map((t) => {
      const has = index.notes.some((n) => n.topic === t.id);
      return h("li", {}, has ? h("a", { href: `#/notes/${t.id}`, "aria-current": t.id === topic.id ? "page" : null }, h("span", { class: "chapter-num" }, String(t.id)), t.name)
                             : h("span", { class: "rail-off" }, h("span", { class: "chapter-num" }, String(t.id)), t.name));
    })));
  const toc = h("nav", { class: "toc", "aria-label": "On this page" }, h("p", { class: "rail-title" }, "On this page"),
    h("ul", {}, heads.map((el) => h("li", {}, h("a", { href: `#/notes/${topic.id}`, "data-target": el.id, onclick: (ev) => { ev.preventDefault(); el.scrollIntoView({ behavior: "smooth", block: "start" }); } }, el.textContent)))));

  const structured = (index.structured || []).find((x) => x.topic === topic.id);
  const cards = index.flashcards.filter((c) => c.topic === topic.id).length;
  const demos = ctx.demos.filter((d) => d.topic === topic.id);
  const practice = h("section", { class: "section" }, h("div", { class: "section-head" }, h("h2", {}, "Now practise it")),
    h("div", { class: "grid" },
      h("a", { class: "card card-link", href: `#/topic/${topic.id}` }, h("span", { class: "card-icon" }, icon("target", 20)), h("h3", {}, "Practice questions"), h("p", {}, "Worked questions and solutions for this topic.")),
      structured ? h("a", { class: "card card-link", href: `#/structured/${topic.id}` }, h("span", { class: "card-icon" }, icon("checklist", 20)), h("h3", {}, "Structured questions"), h("p", {}, `${structured.questions.length} exam-style questions with model answers.`)) : null,
      cards ? h("a", { class: "card card-link", href: `#/flashcards?topic=${topic.id}` }, h("span", { class: "card-icon" }, icon("cards", 20)), h("h3", {}, "Flashcards"), h("p", {}, `${cards} cards on the definitions.`)) : null,
      ...demos.map((d) => h("a", { class: "card card-link", href: `#/demo/${d.id}` }, h("span", { class: "card-icon" }, icon("sliders", 20)), h("h3", {}, d.title), h("p", {}, d.blurb)))));

  const files = index.entries.filter((e) => e.topic === topic.id).length;
  const panel = h("div", { class: "practise-panel" }, h("p", { class: "rail-title" }, "Practise this topic"),
    h("a", { href: `#/topic/${topic.id}` }, icon("target", 16), h("span", {}, "Questions and solutions", files ? h("small", {}, `${files} ${files === 1 ? "file" : "files"}`) : null)),
    cards ? h("a", { href: `#/flashcards?topic=${topic.id}` }, icon("cards", 16), h("span", {}, "Flashcards", h("small", {}, `${cards} cards`))) : null,
    ...demos.map((d) => h("a", { href: `#/demo/${d.id}` }, icon("sliders", 16), h("span", {}, "Demo", h("small", {}, d.title)))));
  if (structured) panel.insertBefore(h("a", { href: `#/structured/${topic.id}` }, icon("checklist", 16), h("span", {}, "Structured questions", h("small", {}, `${structured.questions.length} questions`))), panel.children[2] || null);
  const side = h("div", { class: "toc-col" }, toc, panel);

  queueMicrotask(() => {                       // run once the page is in the document
    const links = new Map([...toc.querySelectorAll("a[data-target]")].map((a) => [a.dataset.target, a]));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { links.forEach((a) => a.removeAttribute("aria-current")); links.get(e.target.id)?.setAttribute("aria-current", "true"); }
    }, { rootMargin: "-90px 0px -70% 0px" });
    heads.forEach((el) => io.observe(el));
    ctx.onLeave(() => io.disconnect());
  });

  return [h("div", { class: "reader" }, rail,
    h("article", { class: "reader-main" },
      h("header", { class: "page-head" }, h("p", { class: "eyebrow" }, `Topic ${topic.id} · ${topic.section} · ${minutes(note.md)} min read`), h("h1", {}, note.title), h("p", { class: "lede" }, note.summary)),
      body, practice,
      h("nav", { class: "pager", "aria-label": "Topic notes" },
        nb.prev ? h("a", { class: "card card-link pager-link", href: `#/notes/${nb.prev.topic}` }, h("small", { class: "muted" }, "Previous topic"), h("strong", {}, nameOf(nb.prev))) : h("span"),
        nb.next ? h("a", { class: "card card-link pager-link next", href: `#/notes/${nb.next.topic}` }, h("small", { class: "muted" }, "Next topic"), h("strong", {}, nameOf(nb.next))) : h("span"))),
    side)];
}

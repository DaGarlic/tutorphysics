// Topics, topic pages, past papers, reference sheets, single-file pages and search results.
import { h, icon } from "./ui.js";
import * as M from "./model.js";
import { fileRow, fileList, pageHead, tabs, chipGroup } from "./components.js";

const setParams = (base, params) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  location.hash = q.toString() ? `${base}?${q}` : base;
};

export function topics(ctx) {
  const { index } = ctx;
  const sections = [...new Set(index.topics.map((t) => t.section))];
  return [pageHead({ eyebrow: "Syllabus 9478", title: "Learn", lede: "Twenty topics in the order of the syllabus. Open one for its notes, with the practice questions, flashcards and demo beside them." }),
    ...sections.map((section) => h("section", { class: "section" },
      h("div", { class: "section-head" }, h("h2", {}, `Section ${section}`)),
      h("div", { class: "list" }, index.topics.filter((t) => t.section === section).map((t) => {
        const entries = index.entries.filter((e) => e.topic === t.id);
        const cards = index.flashcards.filter((c) => c.topic === t.id).length;
        const demos = ctx.demos.filter((d) => d.topic === t.id).length;
        const hasNotes = index.notes.some((n) => n.topic === t.id);
        return h("a", { class: "list-row topic-row", href: hasNotes ? `#/notes/${t.id}` : `#/topic/${t.id}` },
          h("span", { class: "topic-num" }, String(t.id)), h("span", { class: "grow title" }, t.name),
          h("span", { class: "topic-meta" }, hasNotes ? h("span", { class: "badge badge-accent" }, "Notes") : null, entries.length ? h("span", { class: "badge" }, `${entries.length} ${entries.length === 1 ? "file" : "files"}`) : null,
            cards ? h("span", { class: "badge" }, `${cards} cards`) : null, demos ? h("span", { class: "badge badge-accent" }, "Demo") : null),
          icon("chevron-right", 16));
      })))),
    h("section", { class: "section" }, h("div", { class: "section-head" }, h("h2", {}, "Revise")),
      h("div", { class: "grid" },
        h("a", { class: "card card-link", href: "#/flashcards" }, h("span", { class: "card-icon" }, icon("cards", 20)), h("h3", {}, "Flashcards"), h("p", {}, `${index.flashcards.length} cards for definitions and laws. Cards you miss come back sooner.`)),
        h("a", { class: "card card-link", href: "#/demos" }, h("span", { class: "card-icon" }, icon("sliders", 20)), h("h3", {}, "Interactive demos"), h("p", {}, `${ctx.demos.length} simulations with live graphs, from waves to nuclear decay.`))))];
}

export function topic(ctx, id, params) {
  const { index } = ctx;
  const t = index.topics.find((x) => x.id === Number(id));
  if (!t) return [h("p", { class: "empty" }, "Topic not found.")];
  const s = M.topicSections(index.entries, t.id);
  const demos = ctx.demos.filter((d) => d.topic === t.id);
  const cards = index.flashcards.filter((c) => c.topic === t.id);
  const tab = ["practice", "notes", "revise"].includes(params.get("tab")) ? params.get("tab") : "practice";
  const practiceCount = s.questions.length + s.extraSolutions.length;
  const note = index.notes.find((n) => n.topic === t.id);
  const noteCard = note ? h("a", { class: "card card-link note-card", href: `#/notes/${t.id}` }, h("span", { class: "card-icon" }, icon("book", 20)),
    h("h3", {}, note.title), h("p", {}, note.summary), h("span", { class: "btn btn-primary" }, "Read the notes", icon("arrow-right", 16))) : null;
  const panel = tab === "notes" ? h("div", {}, noteCard, s.notes.length ? h("div", { class: "section" }, note ? h("div", { class: "section-head" }, h("h3", {}, "Handouts and PDFs")) : null, fileList(ctx, s.notes)) : null,
      !note && !s.notes.length ? h("p", { class: "empty" }, "No notes for this topic yet.") : null)
    : tab === "revise" ? h("div", { class: "grid" },
        cards.length ? h("a", { class: "card card-link", href: `#/flashcards?topic=${t.id}` }, h("span", { class: "card-icon" }, icon("cards", 20)), h("h3", {}, "Flashcards"), h("p", {}, `${cards.length} cards for this topic.`)) : null,
        ...demos.map((d) => h("a", { class: "card card-link", href: `#/demo/${d.id}` }, h("span", { class: "card-icon" }, icon("sliders", 20)), h("h3", {}, d.title), h("p", {}, d.blurb))),
        !cards.length && !demos.length ? h("p", { class: "muted" }, "No flashcards or demos for this topic yet.") : null)
    : h("div", {}, fileList(ctx, s.questions, "No practice questions for this topic yet."),
        s.extraSolutions.length ? h("div", { class: "section" }, h("div", { class: "section-head" }, h("h3", {}, "Other solutions")), fileList(ctx, s.extraSolutions)) : null);
  return [pageHead({ eyebrow: `Topic ${t.id} · Section ${t.section}`, title: t.name }),
    tabs([{ id: "practice", label: "Practice", count: practiceCount }, { id: "notes", label: "Notes", count: s.notes.length + (note ? 1 : 0) || null }, { id: "revise", label: "Revise", count: cards.length + demos.length || null }], tab,
      (next) => setParams(`#/topic/${t.id}`, { tab: next === "practice" ? "" : next })),
    panel];
}

export function papers(ctx, _, params) {
  const { index } = ctx;
  const f = M.facets(index.entries);
  const state = { year: params.get("year") || "", school: params.get("school") || "", paper: params.get("paper") || "" };
  const rows = M.paperRows(index.entries, state);
  const set = (key) => (value) => setParams("#/papers", { ...state, [key]: value });
  const school = h("select", { "aria-label": "School", onchange: (ev) => set("school")(ev.target.value) },
    h("option", { value: "" }, "All schools"), f.schools.map((sc) => { const o = h("option", { value: sc }, sc); if (sc === state.school) o.selected = true; return o; }));
  return [pageHead({ eyebrow: "Exam practice", title: "Past papers", lede: "Prelim and A-Level papers, each with its mark scheme where we have one." }),
    h("div", { class: "filters" },
      chipGroup("Year", [{ value: "", label: "All" }, ...f.years.map((y) => ({ value: y, label: String(y) }))], state.year, set("year")),
      chipGroup("Paper", [{ value: "", label: "All" }, ...f.papers.map((p) => ({ value: p, label: `Paper ${p}` }))], state.paper, set("paper")),
      h("div", { class: "chip-group" }, h("span", { class: "chip-label" }, "School"), school)),
    h("p", { class: "muted result-count" }, `${rows.length} ${rows.length === 1 ? "paper" : "papers"}`),
    h("p", { class: "muted small" }, "Papers set before 2026 follow the previous syllabus (9749). Topics added or changed in the current one (9478), such as capacitors and wavefunctions, may be missing, so skip questions your notes do not cover."),
    fileList(ctx, rows, "No papers match these filters.")];
}

export function reference(ctx) {
  return [pageHead({ eyebrow: "Reference", title: "Formulae and cheat sheets", lede: "Keep these open while you work." }), fileList(ctx, M.referenceEntries(ctx.index.entries))];
}

export function file(ctx, id) {
  const entry = ctx.index.entries.find((e) => e.id === id);
  if (!entry) return [h("p", { class: "empty" }, "File not found.")];
  const solution = M.solutionFor(ctx.index.entries, entry);
  queueMicrotask(() => ctx.openDoc(entry));
  return [pageHead({ eyebrow: "Document", title: entry.title }),
    h("div", { class: "list" }, fileRow(ctx, entry, solution)),
    h("p", { class: "muted" }, "The document opens in a viewer. Use Escape to close it.")];
}

export function search(ctx, q) {
  const query = decodeURIComponent(q || "");
  const groups = M.searchAll(ctx.index, ctx.demos, query, 12);
  return [pageHead({ title: `Search: ${query}` }),
    groups.length ? groups.map((g) => h("section", { class: "section" }, h("div", { class: "section-head" }, h("h2", {}, g.kind)),
      h("div", { class: "list" }, g.items.map((i) => h("a", { class: "list-row", href: i.href }, h("span", { class: "grow" }, h("span", { class: "title" }, i.title), i.sub ? h("span", { class: "sub" }, i.sub) : null), icon("chevron-right", 16))))))
      : h("p", { class: "empty" }, "No matches.")];
}

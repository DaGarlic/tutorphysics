// Structured questions: multi-part exam-style questions. Students attempt on paper, reveal the model answer
// and mark points, then record the marks they earned.
import { h, icon } from "./ui.js";
import { KEYS } from "./store.js";
import { parseMarkdown, renderBlocks, renderText } from "./markdown.js";
import { pageHead } from "./components.js";

// Each line of a model answer is a step, so a single newline starts a new paragraph (list items stay together).
const steps = (md) => md.replace(/\n(?!\n|- |\d+\. )/g, "\n\n");
const prose = (md) => h("div", { class: "prose" }, renderBlocks(parseMarkdown(steps(md)), h));
export const structuredKey = (topic) => `st-${topic}`;

export function structuredTotals(set) {
  const all = set.questions.flatMap((q) => q.parts);
  return { parts: all.length, marks: all.reduce((n, p) => n + p.marks, 0) };
}

function partView(part, onMark) {
  const answer = h("div", { class: "st-answer", hidden: true },
    h("p", { class: "st-answer-label" }, "Model answer"), prose(part.answer),
    part.points ? h("ul", { class: "st-points" }, part.points.map((p) => h("li", {}, renderText(p, h)))) : null,
    h("div", { class: "st-mark" }, h("span", { class: "muted small" }, "Marks you earned:"),
      h("div", { class: "st-mark-btns", role: "group", "aria-label": "Marks earned" },
        Array.from({ length: part.marks + 1 }, (_, n) => h("button", { type: "button", class: "chip", "aria-pressed": "false", onclick: (ev) => {
          ev.currentTarget.parentNode.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === ev.currentTarget)));
          onMark(n);
        } }, String(n))))));
  const reveal = h("button", { type: "button", class: "btn btn-sm", onclick: () => { answer.hidden = !answer.hidden; reveal.textContent = answer.hidden ? "Show model answer" : "Hide model answer"; } }, "Show model answer");
  return h("li", { class: "st-part" },
    h("div", { class: "st-part-q" }, h("span", { class: "st-label" }, part.label), h("div", { class: "grow" }, prose(part.q)), h("span", { class: "st-marks" }, `[${part.marks}]`)),
    h("div", { class: "st-actions" }, reveal), answer);
}

function structuredList(ctx) {
  const { index, store } = ctx;
  const scores = store.get(KEYS.scores, {});
  const sets = (index.structured || []).slice().sort((a, b) => a.topic - b.topic);
  const total = sets.reduce((n, s) => n + structuredTotals(s).marks, 0);
  return [
    pageHead({ eyebrow: "Exam practice", title: "Structured questions", lede: `${sets.reduce((n, s) => n + s.questions.length, 0)} multi-part questions across ${sets.length} topics, ${total} marks in all. Attempt each on paper, then check the model answer and mark yourself.` }),
    h("div", { class: "list" }, sets.map((set) => {
      const topic = index.topics.find((t) => t.id === set.topic);
      const { marks } = structuredTotals(set), best = scores[structuredKey(set.topic)];
      return h("a", { class: "list-row", href: `#/structured/${set.topic}` },
        h("span", { class: "grow" }, h("span", { class: "title" }, `${set.topic}. ${topic ? topic.name : ""}`),
          h("span", { class: "sub" }, `${set.questions.length} questions · ${marks} marks${best ? ` · best ${best.best} / ${best.total}` : ""}`)),
        icon("chevron-right", 16));
    })),
  ];
}

export function structured(ctx, id) {
  if (!id) return structuredList(ctx);
  const { index, store } = ctx;
  const set = (index.structured || []).find((s) => s.topic === Number(id));
  const topic = index.topics.find((t) => t.id === Number(id));
  if (!set || !topic) return [h("p", { class: "empty" }, "No structured questions for this topic yet. ", h("a", { href: "#/topics" }, "Back to topics"))];
  const key = structuredKey(topic.id);
  const { parts, marks } = structuredTotals(set);
  const earned = {};
  const summary = h("p", { class: "st-summary" });
  const redraw = () => {
    const done = Object.keys(earned).length, got = Object.values(earned).reduce((a, b) => a + b, 0);
    summary.textContent = done ? `Marked ${done} of ${parts} parts: ${got} / ${marks} marks.` : "Try each part on paper first, then check it against the model answer.";
    if (done === parts) {
      const prev = store.get(KEYS.scores, {})[key];
      if (!prev || got > prev.best || prev.total !== marks) store.set(KEYS.scores, { ...store.get(KEYS.scores, {}), [key]: { best: Math.max(got, prev && prev.total === marks ? prev.best : 0), total: marks } });
    }
  };
  redraw();
  const best = store.get(KEYS.scores, {})[key];
  return [
    h("a", { class: "btn btn-quiet btn-sm", href: `#/notes/${topic.id}` }, icon("arrow-left", 15), "Back to the notes"),
    pageHead({ eyebrow: `Topic ${topic.id} · Structured questions`, title: topic.name,
      lede: `${set.questions.length} exam-style questions, ${marks} marks in total.${best ? ` Your best: ${best.best} / ${best.total}.` : ""}` }),
    summary,
    set.questions.map((q, qi) => h("section", { class: "section st-question" },
      h("div", { class: "section-head" }, h("h2", {}, `Question ${qi + 1}: ${q.title}`), h("span", { class: "badge" }, `${q.marks} marks`)),
      q.stem ? prose(q.stem) : null,
      h("ol", { class: "st-parts" }, q.parts.map((p) => partView(p, (n) => { earned[`${qi}-${p.label}`] = n; redraw(); }))))),
  ];
}

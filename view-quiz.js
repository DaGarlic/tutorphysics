// Quizzes: the Paper 1 past-paper MCQs (question images) and the practical-skills quizzes (text and numeric answers).
import { h, s, icon } from "./ui.js";
import * as M from "./model.js";
import { KEYS } from "./store.js";
import { decryptBytes, fetchBytes } from "./crypto.js";
import { renderText } from "./markdown.js";
import { pageHead } from "./components.js";

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const shown = (n) => Number(n.toPrecision(4)).toString();

function scoreRing(correct, total) {
  const r = 52, c = 2 * Math.PI * r, p = total ? correct / total : 0;
  const tone = p >= 0.8 ? "ok" : p >= 0.5 ? "warn" : "err";
  return h("div", { class: `ring ring-${tone}`, role: "img", "aria-label": `${correct} out of ${total}` },
    s("svg", { viewBox: "0 0 128 128", width: "128", height: "128" },
      s("circle", { cx: "64", cy: "64", r, class: "ring-track" }),
      s("circle", { cx: "64", cy: "64", r, class: "ring-fill", "stroke-dasharray": `${c * p} ${c}`, transform: "rotate(-90 64 64)" })),
    h("div", { class: "ring-text" }, h("strong", {}, `${pct(correct, total)}%`), h("small", {}, `${correct} / ${total}`)));
}
const verdict = (p) => (p === 1 ? "Perfect score" : p >= 0.8 ? "Excellent work" : p >= 0.6 ? "Good progress" : p >= 0.4 ? "Getting there" : "Keep practising");

function runnerFrame({ back, title, position, total }) {
  return {
    top: h("div", { class: "quiz-top" }, h("a", { class: "btn btn-quiet btn-sm", href: back.href }, icon("arrow-left", 15), back.label),
      h("span", { class: "quiz-pos" }, `Question ${position} of ${total}`)),
    bar: h("progress", { max: total, value: position, "aria-label": "Progress" }),
    title,
  };
}

function listHead(eyebrow, title, lede) { return pageHead({ eyebrow, title, lede }); }

// ---------------------------------------------------------------------------------------------------------------
// Paper 1
export function quizzes(ctx) {
  const { index, store } = ctx;
  const scores = store.get(KEYS.scores, {});
  if (!index.quizzes.length) return [listHead("Practise", "Paper 1 quizzes"), h("p", { class: "empty" }, "No quizzes yet.")];
  return [listHead("Practise", "Paper 1 quizzes", "Past-paper multiple-choice questions. Answer, see the result at once, then review what you missed."),
    h("a", { class: "card card-link feature", href: "#/quiz/mix" },
      h("div", { class: "grow" }, h("p", { class: "eyebrow" }, "Quick practice"), h("h2", {}, "Random 20"),
        h("p", { class: "muted" }, `Twenty questions drawn from all ${index.quizzes.length} papers.`)),
      h("span", { class: "go" }, "Start", icon("arrow-right", 16))),
    h("section", { class: "section" }, h("div", { class: "section-head" }, h("h2", {}, "By paper")),
      h("div", { class: "grid" }, index.quizzes.map((qz) => {
        const sc = scores[qz.id];
        return h("a", { class: "card card-link quiz-card", href: `#/quiz/${qz.id}` }, h("h4", {}, qz.title), h("p", {}, `${qz.questions.length} questions`),
          h("div", { class: "quiz-card-foot" }, sc ? h("span", { class: `badge ${sc.best / sc.total >= 0.8 ? "badge-ok" : "badge-warn"}` }, `Best ${pct(sc.best, sc.total)}%`) : h("span", { class: "muted small" }, "Not attempted"),
            icon("chevron-right", 16)));
      })))];
}

export function quiz(ctx, id) {
  const { index, store } = ctx;
  const q = id === "mix" ? M.mixedQuiz(index.quizzes, 20) : index.quizzes.find((x) => x.id === id);
  if (!q || !q.questions.length) return [h("p", { class: "empty" }, "Quiz not found.")];
  const area = h("div", { class: "quiz-shell" });
  const answers = [];
  const urls = [];
  let i = 0;
  let handler = null;
  const unbind = () => { if (handler) document.removeEventListener("keydown", handler); handler = null; };
  ctx.onLeave(() => { unbind(); urls.forEach((u) => URL.revokeObjectURL(u)); });

  const image = async (qu) => {
    const bytes = await decryptBytes(ctx.key, await fetchBytes(`blob/${qu.img}.bin`));
    const url = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
    urls.push(url);
    return url;
  };

  const show = async () => {
    const qu = q.questions[i];
    let picked = null;
    const frame = runnerFrame({ back: { href: "#/quizzes", label: "Quizzes" }, title: q.title, position: i + 1, total: q.questions.length });
    const img = h("img", { class: "q-image", alt: `Question ${i + 1}`, title: "Click to zoom" });
    img.addEventListener("click", () => img.classList.toggle("zoom"));
    const feedback = h("div", { class: "q-feedback", "aria-live": "polite" });
    const next = h("button", { class: "btn btn-primary", hidden: true }, i + 1 === q.questions.length ? "See results" : "Next question", icon("arrow-right", 16));
    next.addEventListener("click", () => (i + 1 < q.questions.length ? (i++, show()) : result()));
    const buttons = [..."ABCD"].map((letter) => {
      const b = h("button", { class: "choice", "data-letter": letter }, h("span", { class: "choice-key" }, letter));
      b.addEventListener("click", () => choose(letter));
      return b;
    });
    const choose = (letter) => {
      if (picked) return;
      picked = letter;
      answers[i] = letter;
      buttons.forEach((b) => {
        b.disabled = true;
        if (b.dataset.letter === qu.answer) b.classList.add("correct"); else if (b.dataset.letter === letter) b.classList.add("wrong");
      });
      feedback.className = `q-feedback ${letter === qu.answer ? "is-correct" : "is-wrong"}`;
      feedback.replaceChildren(icon(letter === qu.answer ? "check" : "x", 18), letter === qu.answer ? "Correct" : `Not quite. The answer is ${qu.answer}.`);
      next.hidden = false;
      next.focus();
    };
    unbind();
    handler = (ev) => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey || /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName)) return;
      const k = ev.key.toUpperCase();
      if (k.length === 1 && "ABCD".includes(k)) choose(k);
    };
    document.addEventListener("keydown", handler);
    area.replaceChildren(frame.top, frame.bar,
      h("div", { class: "q-card" }, qu.source ? h("p", { class: "q-source" }, qu.source) : null, h("div", { class: "q-image-wrap" }, img), h("p", { class: "muted q-hint" }, "Tap the question to zoom. Press A, B, C or D to answer.")),
      h("div", { class: "choices" }, buttons), feedback, h("div", { class: "q-actions" }, next));
    try { img.src = await image(qu); } catch { feedback.replaceChildren(icon("info", 18), "Could not load this question. Reload the page and try again."); }
    if (q.questions[i + 1]) image(q.questions[i + 1]).catch(() => {});   // warm the next one
  };

  const result = async () => {
    unbind();
    const r = M.scoreQuiz(q, answers);
    if (id !== "mix") store.set(KEYS.scores, M.recordScore(store.get(KEYS.scores, {}), q.id, r.correct, r.total));
    const solutions = q.pair && index.entries.find((e) => e.pair === q.pair && e.kind === "markscheme");
    const review = h("div", { class: "review" });
    area.replaceChildren(
      h("div", { class: "result" }, scoreRing(r.correct, r.total), h("div", { class: "result-text" }, h("p", { class: "eyebrow" }, q.title), h("h2", {}, verdict(r.correct / r.total)),
        h("p", { class: "muted" }, r.wrong.length ? `${r.wrong.length} to review below.` : "You got every question right."),
        h("div", { class: "q-actions" }, h("a", { class: "btn btn-primary", href: `#/quiz/${q.id}`, onclick: () => setTimeout(() => dispatchEvent(new HashChangeEvent("hashchange")), 0) }, icon("retry", 16), "Try again"),
          h("a", { class: "btn", href: "#/quizzes" }, "All quizzes"),
          solutions ? h("button", { class: "btn", onclick: () => ctx.openDoc(solutions) }, icon("file", 16), "Full solutions") : null))),
      r.wrong.length ? h("h3", { class: "review-title" }, "Review") : null, review);
    for (const n of r.wrong) {
      const qu = q.questions[n];
      const img = h("img", { class: "q-image", alt: `Question ${qu.n ?? n + 1}` });
      img.addEventListener("click", () => img.classList.toggle("zoom"));
      review.append(h("div", { class: "card review-item" }, h("p", { class: "muted" }, `Question ${qu.n ?? n + 1}${qu.source ? ` · ${qu.source}` : ""}`), h("div", { class: "q-image-wrap" }, img),
        h("p", {}, h("span", { class: "badge badge-warn" }, `You chose ${answers[n] || "no answer"}`), " ", h("span", { class: "badge badge-ok" }, `Correct: ${qu.answer}`))));
      image(qu).then((u) => (img.src = u), () => img.replaceWith(h("p", { class: "muted" }, "Could not load this question.")));
    }
  };

  show();
  return [area];
}

// ---------------------------------------------------------------------------------------------------------------
// Practical-skills quizzes
export function pquiz(ctx, id) {
  const { index, store } = ctx;
  const q = index.pquizzes.find((x) => x.id === id);
  if (!q) return [h("p", { class: "empty" }, "Quiz not found.")];
  const area = h("div", { class: "quiz-shell" });
  const results = [], given = [];
  let i = 0;
  let handler = null;
  const unbind = () => { if (handler) document.removeEventListener("keydown", handler); handler = null; };
  ctx.onLeave(unbind);

  const show = () => {
    const qu = q.questions[i];
    let answered = false;
    const frame = runnerFrame({ back: { href: "#/practical", label: "Practical" }, title: q.title, position: i + 1, total: q.questions.length });
    const feedback = h("div", { class: "q-feedback", "aria-live": "polite" });
    const why = h("div", { class: "q-why", hidden: true });
    const next = h("button", { class: "btn btn-primary", hidden: true }, i + 1 === q.questions.length ? "See results" : "Next question", icon("arrow-right", 16));
    next.addEventListener("click", () => (i + 1 < q.questions.length ? (i++, show()) : result()));
    const settle = (ok, message) => {
      answered = true; results[i] = ok;
      feedback.className = `q-feedback ${ok ? "is-correct" : "is-wrong"}`;
      feedback.replaceChildren(icon(ok ? "check" : "x", 18), message);
      why.replaceChildren(h("strong", {}, "Why"), h("p", {}, ...renderText(qu.why, h)));
      why.hidden = false; next.hidden = false; next.focus();
    };
    let body, input = null;
    unbind();
    if (qu.type === "mcq") {
      const sh = M.shuffleOptions(qu);
      const buttons = sh.options.map((text, k) => {
        const b = h("button", { class: "option" }, h("span", { class: "choice-key" }, String(k + 1)), h("span", { class: "grow" }, ...renderText(text, h)));
        b.addEventListener("click", () => pick(k));
        return b;
      });
      const pick = (k) => {
        if (answered) return;
        given[i] = sh.options[k];
        buttons.forEach((b, j) => { b.disabled = true; if (j === sh.answer) b.classList.add("correct"); else if (j === k) b.classList.add("wrong"); });
        settle(k === sh.answer, k === sh.answer ? "Correct" : "Not quite. The correct option is highlighted.");
      };
      body = h("div", { class: "options" }, buttons);
      handler = (ev) => {
        if (ev.ctrlKey || ev.metaKey || ev.altKey || /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName)) return;
        const k = Number(ev.key) - 1;
        if (k >= 0 && k < buttons.length) pick(k);
      };
      document.addEventListener("keydown", handler);
    } else {
      input = h("input", { type: "text", inputmode: "decimal", autocomplete: "off", spellcheck: "false", "aria-label": "Your answer", placeholder: "Type your answer" });
      const check = h("button", { class: "btn btn-primary" }, "Check");
      const submit = () => {
        if (answered) return;
        const r = M.checkNumeric(qu, input.value);
        if (r.status === "invalid") { feedback.className = "q-feedback is-note"; feedback.replaceChildren(icon("info", 18), "Type a number, for example 4.2 or 1.2e3. Units are optional."); return; }
        given[i] = input.value.trim(); input.disabled = true; check.disabled = true;
        settle(r.status === "correct", r.status === "correct" ? "Correct" : `Not quite. The answer is ${shown(qu.answer)}${qu.unit ? ` ${qu.unit}` : ""} (accepted within ${shown(qu.tol * 100)}%).`);
      };
      check.addEventListener("click", submit);
      input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") submit(); });
      body = h("div", { class: "answer-row" }, input, qu.unit ? h("span", { class: "unit" }, qu.unit) : null, check);
    }
    area.replaceChildren(frame.top, frame.bar,
      h("div", { class: "q-card" }, h("p", { class: "q-text" }, ...renderText(qu.q, h)), qu.hint ? h("p", { class: "muted" }, "Hint: ", ...renderText(qu.hint, h)) : null),
      body, feedback, why, h("div", { class: "q-actions" }, next));
    input?.focus();
  };

  const result = () => {
    unbind();
    const r = M.tally(results);
    store.set(KEYS.scores, M.recordScore(store.get(KEYS.scores, {}), `pq-${q.id}`, r.correct, r.total));
    const chapter = q.chapter && index.guide.find((c) => c.id === q.chapter);
    area.replaceChildren(
      h("div", { class: "result" }, scoreRing(r.correct, r.total), h("div", { class: "result-text" }, h("p", { class: "eyebrow" }, q.title), h("h2", {}, verdict(r.total ? r.correct / r.total : 0)),
        h("p", { class: "muted" }, r.wrong.length ? `${r.wrong.length} to review below.` : "You got every question right."),
        h("div", { class: "q-actions" }, h("a", { class: "btn btn-primary", href: `#/pquiz/${q.id}`, onclick: () => setTimeout(() => dispatchEvent(new HashChangeEvent("hashchange")), 0) }, icon("retry", 16), "Try again"),
          h("a", { class: "btn", href: "#/practical" }, "All practical quizzes"),
          chapter ? h("a", { class: "btn", href: `#/guide/${chapter.id}` }, icon("book", 16), "Read the chapter") : null))),
      r.wrong.length ? h("h3", { class: "review-title" }, "Review") : null,
      ...r.wrong.map((n) => {
        const qu = q.questions[n];
        const right = qu.type === "mcq" ? qu.options[qu.answer] : `${shown(qu.answer)}${qu.unit ? ` ${qu.unit}` : ""}`;
        return h("div", { class: "card review-item" }, h("p", { class: "q-text" }, `${n + 1}. `, ...renderText(qu.q, h)),
          h("p", {}, h("span", { class: "badge badge-warn" }, `You answered: ${given[n] ?? "no answer"}`), " ", h("span", { class: "badge badge-ok" }, "Correct: ", ...renderText(String(right), h))),
          h("div", { class: "q-why" }, h("strong", {}, "Why"), h("p", {}, ...renderText(qu.why, h))));
      }));
  };

  show();
  return [area];
}

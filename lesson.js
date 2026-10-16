// Lesson materials: turns the site's own content into a timed lesson plan for the tutor, a worksheet and an answer
// key. Pure functions (no DOM): the admin page supplies the decrypted index and an element builder `h`.
// Timings follow the content: each part lasts as long as its questions need (marks x minutes per mark).
import { parseMarkdown, plainText, renderBlocks, renderText } from "./markdown.js";

export const WORKSHEET_PACE = 2;      // minutes per mark for worksheet questions worked with the tutor (no apparatus)
export const PAPER4_PACE = 2.8;       // minutes per mark in the practical paper (2 h 30 min for 50 marks, with apparatus)
export const THEORY_PACE = 1.7;       // minutes per mark in a written theory paper
const RECAP = 5;                      // minutes to go over a block's key results

// Key results are technical statements a student should be able to apply, not study advice.
export const PRACTICAL_BLOCKS = {
  measuring: { label: "Measuring and recording", chapters: ["measuring-and-recording", "tables-and-significant-figures"], quizzes: ["measuring", "tables-and-sig-figs"], facts: [
    "A positive zero error is subtracted from every reading. It shifts a graph's intercept but not its gradient.",
    "Record to the instrument's resolution: metre rule 0.1 cm, vernier 0.01 cm, micrometer 0.01 mm, digital meter the last digit.",
    "Timing n oscillations divides the percentage uncertainty in T by n: Δt ≈ 0.2 s is 16 % of one swing of 1.26 s but under 1 % of 20.",
    "Calculated values carry the same number of significant figures as the least precise quantity used (for products and quotients)." ] },
  uncertainties: { label: "Uncertainties", chapters: ["uncertainties"], quizzes: ["uncertainties"], facts: [
    "Repeated readings: uncertainty = half the range; quote the mean ± that value.",
    "Sums and differences add absolute uncertainties. Products and quotients add percentage uncertainties. A power xⁿ has n times the percentage uncertainty of x.",
    "Gradient uncertainty = ½(steepest − shallowest) from the worst acceptable lines; the intercept is treated the same way.",
    "Quote the uncertainty to 1 s.f. and the value to the same decimal place. Two values agree if their ranges overlap, or if the percentage difference is within the stated criterion." ] },
  graphs: { label: "Graphs and linearising", chapters: ["graphs-and-spreadsheets"], quizzes: ["graphs", "pendulum-data-challenge"], facts: [
    "Linearise to y = mx + c: T² = (4π²/g)L; V = E − Ir; ln V = ln V₀ − t/RC; lg F = lg k − n lg d.",
    "Take gradient points from the best-fit line, not from the data, at least half the line apart, and show the coordinates.",
    "Scale the axes so the points fill more than half the grid in both directions. Label each axis as quantity / unit.",
    "On ln or lg plots the gradient has no unit; the intercept gives ln y₀ or lg k." ] },
  analysis: { label: "Analysis and conclusions", chapters: ["analysis-and-conclusions"], quizzes: ["analysis"], facts: [
    "Hooke's law F = kx: k is the gradient of F against x. A departure from the straight line marks the limit of proportionality.",
    "Percentage difference = |a − b| ÷ mean × 100 %. Compare it with the criterion in the question, or with the combined uncertainty.",
    "A conclusion names the relationship tested, quotes the numerical evidence, and says whether it holds within the uncertainty.",
    "An anomalous point is found by its deviation from the trend (for example a ratio y/x that differs from the rest). Repeat it, and state whether the line includes it." ] },
  evaluation: { label: "Evaluation", chapters: ["evaluation", "common-mistakes"], quizzes: ["evaluation"], facts: [
    "Compare the percentage uncertainties and target the largest. Quantify the improvement: 50 oscillations instead of 20 cuts the timing term by 2.5 times.",
    "Systematic errors (zero error, length measured to the wrong point) shift the intercept and are not removed by averaging. Random errors cause scatter and are reduced by repeating.",
    "A good improvement states what changes, which quantity gets better and roughly by how much.",
    "Typical limitations: small range, too few points, non-linear behaviour at large load, a wire heating up so its resistance changes." ] },
  planning: { label: "Planning an experiment", chapters: ["planning", "experiment-bank"], quizzes: ["planning", "experiments"], facts: [
    "State the independent and dependent variables, and at least two controlled variables with how each is kept constant.",
    "Give the equation tested in the form y = mx + c, say what is plotted, and what the gradient and intercept equal.",
    "Name each instrument with its resolution, and say exactly how each quantity is measured (for example L from the pivot to the centre of the bob).",
    "Include a safety precaution that fits this experiment, and a statement about repeats and range." ] },
  circuits: { label: "Circuits and RC data", chapters: ["circuits-and-rc"], quizzes: ["circuits-and-rc", "rc-data-challenge"], facts: [
    "Discharge: V = V₀e^(−t/RC). ln V against t has gradient −1/RC, so τ = RC and the half-life is τ ln 2.",
    "Initial charge Q₀ = CV₀ and stored energy ½CV₀².",
    "Cell with internal resistance: V = E − Ir. On a graph of V against I, the gradient is −r and the intercept is E.",
    "Two close readings give a large uncertainty in r; a graph over a wide range is more reliable." ] },
};
export const DEFAULT_BLOCKS = ["uncertainties", "graphs", "analysis"];

const ceil5 = (n) => Math.ceil(n / 5) * 5;

function rng(seed) {                       // small deterministic generator, so a lesson can be reproduced from its seed
  let s = (Number(seed) || 1) >>> 0 || 1;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffled(list, rnd) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Short statements worth reading out of a Markdown note: its "Key takeaways" or checklist list.
export function keyPointsOf(md, max = 7) {
  const blocks = parseMarkdown(md || "");
  const at = blocks.findIndex((b) => b.type === "h" && /key takeaways|checklist/i.test(plainText(b.inlines)));
  if (at >= 0) {
    const list = blocks.slice(at + 1).find((b) => b.type === "h" || b.type === "ul" || b.type === "ol");
    if (list && list.items) return list.items.map((i) => plainText(i.inlines)).slice(0, max);
  }
  return [];
}

const link = (siteUrl, label, hash) => ({ label, href: `${siteUrl}#/${hash}` });
const file = (e) => ({ title: e.title, hasSolution: !!e.pair });
const siteBase = (u) => (u.endsWith("/") ? u : `${u}/`);
const structuredQ = (q) => ({ kind: "structured", ...q });

function finish(title, minutes, segs) {
  let start = 0;
  const segments = segs.map((s) => { const out = { keyPoints: [], links: [], files: [], questions: [], flashcards: [], tutor: "", ...s, start }; start += s.mins; return out; });
  if (start !== minutes) throw new Error(`Internal timing error: ${start} of ${minutes} minutes used.`);
  return { title, minutes, segments };
}

const sumMarks = (qs) => qs.reduce((n, q) => n + q.marks, 0);

// Fill `budget` minutes with whole questions from `pool` (at least one), at `pace` minutes per mark.
function fillQuestions(pool, budget, pace, base = 0) {
  const chosen = [];
  for (const q of pool) {
    const mins = ceil5(base + (sumMarks(chosen) + q.marks) * pace);
    if (!chosen.length || mins <= budget) chosen.push(q);
  }
  return chosen;
}

export function planPractical(index, { minutes = 120, blocks = DEFAULT_BLOCKS, seed = 1, siteUrl = "" } = {}) {
  const site = siteBase(siteUrl);
  const chosenBlocks = blocks.filter((b) => PRACTICAL_BLOCKS[b]);
  if (!chosenBlocks.length) throw new Error("Choose at least one area to cover.");
  const rnd = rng(seed);
  const guide = new Map((index.guide || []).map((c) => [c.id, c]));
  const quizzes = new Map((index.pquizzes || []).map((q) => [q.id, q]));
  const worksheets = new Map((index.worksheets || []).map((w) => [w.block, w.questions]));
  const guideLinks = (ids) => ids.filter((id) => guide.has(id)).map((id) => link(site, `Guide: ${guide.get(id).title}`, `guide/${id}`));
  const quizLinks = (ids) => ids.filter((id) => quizzes.has(id)).map((id) => link(site, `Quiz: ${quizzes.get(id).title}`, `pquiz/${id}`));

  const withBreak = minutes >= 90;
  // Starter: involved calculations only, longest question text first as a rough guide to how much is going on.
  const drillPool = ["uncertainties", "tables-and-sig-figs", "graphs", "analysis"].flatMap((id) => (quizzes.get(id)?.questions || []).filter((q) => q.type === "numeric"))
    .sort((a, b) => b.q.length - a.q.length).slice(0, 12);
  const drills = minutes >= 90 ? shuffled(drillPool, rnd).slice(0, 3).map((q) => ({ kind: "numeric", q: q.q, answer: q.answer, unit: q.unit, tol: q.tol, why: q.why })) : [];
  const starterMins = drills.length ? ceil5(drills.length * 3) : 0;
  const breakMins = withBreak ? 5 : 0, wrapMins = 5;
  const avail = minutes - starterMins - breakMins - wrapMins;
  const timedTarget = Math.max(15, ceil5(avail * 0.25));
  const budget = (avail - timedTarget) / chosenBlocks.length;

  const blockSegs = chosenBlocks.map((b) => {
    const def = PRACTICAL_BLOCKS[b];
    const pool = shuffled(worksheets.get(b) || [], rnd).map(structuredQ);
    const questions = fillQuestions(pool, budget, WORKSHEET_PACE, RECAP);
    const marks = sumMarks(questions);
    return {
      title: def.label, mins: ceil5(RECAP + marks * WORKSHEET_PACE), keyPoints: def.facts, questions,
      links: [...guideLinks(def.chapters), ...quizLinks(def.quizzes)],
      tutor: `Go over the key results (${RECAP} min), then {Q}: ${marks} marks, about ${marks * WORKSHEET_PACE} min. Students work first; then go through the answers and the marking points.`,
    };
  });
  const used = starterMins + breakMins + wrapMins + blockSegs.reduce((n, s) => n + s.mins, 0);
  const timedMins = minutes - used;
  if (timedMins < 15) throw new Error(`${chosenBlocks.length} areas need about ${Math.ceil((used + 15) / 5) * 5} minutes. Untick an area or choose a longer lesson.`);

  const papers = (index.entries || []).filter((e) => e.kind === "paper" && String(e.paper) === "4");
  const paper = papers.length ? shuffled(papers, rnd)[0] : null;
  const sol = paper && paper.pair ? (index.entries || []).find((e) => e.id === paper.pair) : null;
  const timedMarks = Math.floor(timedMins / PAPER4_PACE);
  const segs = [];
  if (drills.length) segs.push({ title: "Starter: quick calculations", mins: starterMins, questions: drills, tutor: "{Q}, no notes, about 3 min each. Mark together and note which are missed." });
  segs.push(...blockSegs);
  if (withBreak) segs.push({ title: "Break", mins: 5 });
  segs.push({
    title: "Timed practice: past Paper 4 question", mins: timedMins,
    files: paper ? [file(paper), ...(sol ? [file(sol)] : [])] : [],
    links: [link(site, "All Paper 4 papers", "papers?paper=4")],
    tutor: `Pick a question of about ${timedMarks} marks${paper ? ` from ${paper.title}` : ""} (${timedMins} min at ${PAPER4_PACE} min per mark). In silence, then mark with the solutions.`,
  });
  const skipped = Object.keys(PRACTICAL_BLOCKS).filter((b) => !chosenBlocks.includes(b));
  segs.push({
    title: "Wrap-up and homework", mins: wrapMins,
    links: skipped.flatMap((b) => [...guideLinks(PRACTICAL_BLOCKS[b].chapters.slice(0, 1)), ...quizLinks(PRACTICAL_BLOCKS[b].quizzes.slice(0, 1))]).slice(0, 6),
    tutor: "Each student states one thing to fix. Homework: the portal quizzes for areas not covered today.",
  });
  return finish("Practical exam preparation", minutes, segs);
}

export function planTopic(index, { topic, minutes = 90, seed = 1, siteUrl = "" } = {}) {
  const site = siteBase(siteUrl);
  const t = (index.topics || []).find((x) => x.id === Number(topic));
  if (!t) throw new Error("Choose a topic from the list.");
  const rnd = rng(seed);
  const note = (index.notes || []).find((n) => n.topic === t.id);
  const cards = (index.flashcards || []).filter((c) => c.topic === t.id);
  const set = (index.structured || []).find((s) => s.topic === t.id);
  const past = (index.entries || []).filter((e) => e.topic === t.id);
  const recapMins = 10, drillMins = cards.length ? 10 : 0, wrapMins = 5;
  const avail = minutes - recapMins - drillMins - wrapMins;
  if (avail < 15) throw new Error("Choose a longer lesson for a topic revision.");
  let questions = set ? fillQuestions(shuffled(set.questions, rnd).map(structuredQ), Math.max(10, ceil5(avail * 0.6)), THEORY_PACE) : [];
  let structMins = questions.length ? ceil5(sumMarks(questions) * THEORY_PACE) : 0;
  while (avail - structMins < 10 && questions.length > 1) { questions = questions.slice(0, -1); structMins = ceil5(sumMarks(questions) * THEORY_PACE); }
  let pastMins = avail - structMins;
  if (pastMins < 10) { structMins += pastMins; pastMins = 0; }
  const segs = [{
    title: "Recap the key ideas", mins: recapMins, keyPoints: note ? keyPointsOf(note.md, 8) : [],
    links: note ? [link(site, `Notes: ${note.title}`, `notes/${t.id}`)] : [],
    tutor: "Students explain each point in their own words; fill the gaps.",
  }];
  if (cards.length) segs.push({
    title: "Definitions drill", mins: drillMins,
    flashcards: shuffled(cards, rnd).slice(0, 8).map((c) => ({ front: c.front, back: c.back })),
    links: [link(site, "Flashcards", `flashcards?topic=${t.id}`)],
    tutor: "Write from memory, then check against the key.",
  });
  if (questions.length) segs.push({
    title: "Structured questions", mins: structMins, questions, links: [link(site, "Structured questions", `structured/${t.id}`)],
    tutor: `{Q}: ${sumMarks(questions)} marks at about ${THEORY_PACE} min per mark. Mark with the model answers and point out the marking points that were missed.`,
  });
  if (pastMins) segs.push({
    title: "Past-paper practice", mins: pastMins, files: past.map(file), links: [link(site, "Topic files", `topic/${t.id}`)],
    tutor: `Pick a question of about ${Math.floor(pastMins / THEORY_PACE)} marks (${pastMins} min). ${past.length ? "Choose from the files listed; mark with the solutions." : "No files are tagged to this topic; pick one from a recent Paper 2 or 3."}`,
  });
  segs.push({ title: "Wrap-up and homework", mins: wrapMins, tutor: "Set the structured questions not used today as homework.", links: [link(site, "Topic notes", `notes/${t.id}`)] });
  return finish(`Topic revision: ${t.name}`, minutes, segs);
}

// ---- Rendering ----
const clock = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
// Each line of a model answer is a step, so start a new paragraph at a single newline, but keep list items and table rows together.
const steps = (md) => md.split("\n").reduce((out, line, i, all) => out + (i && line.trim() && all[i - 1].trim() && !/^(- |\d+\. |\|)/.test(line) ? "\n\n" : i ? "\n" : "") + line, "");
const prose = (md, h) => h("div", { class: "prose" }, renderBlocks(parseMarkdown(steps(md)), h));
const letter = (i) => String.fromCharCode(65 + i);
const tolText = (q) => (q.tol ? ` (accept within ${Math.round(q.tol * 100)}%)` : "");
const lines = (h, n) => h("div", { class: "answer-lines" }, Array.from({ length: n }, () => h("div", { class: "answer-line" })));
const range = (a, b) => (a === b ? `Q${a}` : `Q${a}\u2013${b}`);

function questionBody(q, n, part, h) {
  const head = h("p", { class: "lq-q" }, h("strong", {}, `${n}.  `), q.kind === "structured" ? q.title : renderText(q.q, h), q.kind === "structured" ? h("span", { class: "lq-marks" }, `  [${q.marks}]`) : null);
  if (q.kind === "structured") {
    return h("div", { class: "lq" }, head, q.stem ? prose(q.stem, h) : null,
      h("ol", { class: "lq-parts", type: "a" }, q.parts.map((p) => h("li", {},
        h("div", { class: "lq-part" }, prose(p.q, h), h("span", { class: "lq-marks" }, `[${p.marks}]`)),
        part === "answers" ? h("div", { class: "lq-key" }, prose(p.answer, h), p.points ? h("ul", {}, p.points.map((x) => h("li", {}, renderText(x, h)))) : null) : lines(h, Math.max(1, Math.min(4, p.marks)))))));
  }
  if (q.kind === "mcq") {
    return h("div", { class: "lq" }, head,
      part === "answers"
        ? h("p", { class: "lq-key" }, h("strong", {}, `${letter(q.answer)}.  `), renderText(q.options[q.answer], h), "  ", h("span", { class: "muted" }, renderText(q.why, h)))
        : h("ol", { class: "lq-options", type: "A" }, q.options.map((o) => h("li", {}, renderText(o, h)))));
  }
  return h("div", { class: "lq" }, head,
    part === "answers"
      ? h("p", { class: "lq-key" }, h("strong", {}, `${q.answer}${q.unit ? ` ${q.unit}` : ""}`), tolText(q), ".  ", h("span", { class: "muted" }, renderText(q.why, h)))
      : h("p", { class: "lq-blank" }, `Answer: ______________${q.unit ? ` ${q.unit}` : ""}`));
}

// part: "runsheet" (for the tutor), "handout" (for students) or "answers" (the key)
export function renderLesson(doc, part, h) {
  const label = { runsheet: "Lesson plan", handout: "Worksheet", answers: "Worksheet: answers" }[part];
  const hours = doc.minutes % 60 === 0 ? `${doc.minutes / 60} hour${doc.minutes === 60 ? "" : "s"}` : `${doc.minutes} minutes`;
  const head = h("header", { class: "lesson-head" },
    h("p", { class: "lesson-kind" }, `H2 Physics  \u00b7  ${label}`),
    h("h1", {}, doc.title),
    part === "runsheet" ? h("p", { class: "lesson-meta" }, `${hours}.  Date: ____________`) : h("p", { class: "lesson-meta" }, "Name: ______________________    Date: ______________"));
  // Question numbers run through the whole lesson, so number every segment first.
  let n = 0;
  const numbered = doc.segments.map((s) => { const first = n + 1; n += s.questions.length; return { s, first, last: n }; });
  if (part === "runsheet") {
    return h("article", { class: "lesson-doc lesson-runsheet" }, head,
      h("table", { class: "lesson-plan" },
        h("thead", {}, h("tr", {}, h("th", {}, "Time"), h("th", {}, "Part"), h("th", {}, "Plan"), h("th", {}, "Materials"))),
        h("tbody", {}, numbered.map(({ s, first, last }) => {
          const plan = (s.tutor || "").replace("{Q}", s.questions.length ? range(first, last) : "the questions");
          return h("tr", { class: s.title === "Break" ? "lesson-break" : "" },
            h("td", { class: "lesson-when" }, `${clock(s.start)}`, h("br"), h("span", {}, `${s.mins} min`)),
            h("td", {}, h("strong", {}, s.title)),
            h("td", {}, plan ? h("p", {}, plan) : null,
              s.keyPoints.length ? h("ul", {}, s.keyPoints.slice(0, 3).map((k) => h("li", {}, renderText(k, h))), s.keyPoints.length > 3 ? h("li", { class: "lesson-count" }, `+ ${s.keyPoints.length - 3} more on the worksheet`) : null) : null),
            h("td", {}, ...s.files.map((f) => h("p", {}, `${f.title}${f.hasSolution ? " (solutions)" : ""}`)),
              ...s.links.map((l) => h("p", {}, h("a", { href: l.href, target: "_blank", rel: "noopener" }, l.label))),
              s.questions.length ? h("p", { class: "lesson-count" }, `${range(first, last)} in worksheet`) : null,
              s.flashcards.length ? h("p", { class: "lesson-count" }, `${s.flashcards.length} definitions in worksheet`) : null));
        }))));
  }
  const body = numbered.map(({ s, first }, idx) => {
    if (!s.questions.length && !s.flashcards.length && !(part === "handout" && s.keyPoints.length)) return null;
    let k = first - 1;
    return h("section", { class: "lesson-seg" },
      h("h2", {}, `${s.title}`, part === "handout" ? h("span", { class: "lesson-time" }, `${s.mins} min`) : null),
      part === "handout" && s.keyPoints.length ? h("div", { class: "lesson-remember" }, h("p", {}, h("strong", {}, "Key results")), h("ul", {}, s.keyPoints.map((p) => h("li", {}, renderText(p, h))))) : null,
      s.flashcards.length ? h("ol", { class: "lesson-cards" }, s.flashcards.map((c) => h("li", {}, renderText(c.front, h), part === "answers" ? h("div", { class: "lq-key" }, renderText(c.back, h)) : lines(h, 2)))) : null,
      ...s.questions.map((q) => questionBody(q, ++k, part, h)));
  });
  return h("article", { class: `lesson-doc lesson-${part}` }, head, ...body);
}

// Pure functions over the decrypted index; no DOM.
const SOLUTION_KINDS = new Set(["solutions", "markscheme"]);
const byTitle = (a, b) => a.title.localeCompare(b.title, undefined, { numeric: true });

export function solutionFor(entries, entry) {
  if (!entry.pair) return null;
  return entries.find((x) => x !== entry && x.pair === entry.pair && SOLUTION_KINDS.has(x.kind)) || null;
}

export function topicSections(entries, topicId) {
  const inTopic = entries.filter((x) => x.topic === topicId);
  const questions = inTopic.filter((x) => x.kind === "questions").sort(byTitle);
  const used = new Set();
  const withSol = questions.map((q) => {
    const solution = solutionFor(inTopic, q);
    if (solution) used.add(solution);
    return { entry: q, solution };
  });
  return {
    notes: inTopic.filter((x) => x.kind === "notes").sort(byTitle),
    questions: withSol,
    extraSolutions: inTopic.filter((x) => x.kind === "solutions" && !used.has(x)).sort(byTitle),
  };
}

export function paperRows(entries, f = {}) {
  const papers = entries.filter((x) => x.kind === "paper");
  const rows = papers.map((p) => ({ entry: p, solution: solutionFor(entries, p) }));
  const shown = new Set(rows.map((r) => r.solution).filter(Boolean));
  for (const ms of entries.filter((x) => x.kind === "markscheme" && !shown.has(x))) {
    rows.push({ entry: ms, solution: null });
  }
  const q = (f.q || "").trim().toLowerCase();
  return rows
    .filter(({ entry: x }) =>
      (!f.year || String(x.year) === String(f.year)) &&
      (!f.school || x.school === f.school) &&
      (!f.paper || String(x.paper) === String(f.paper)) &&
      (!q || `${x.title} ${x.school}`.toLowerCase().includes(q)))
    .sort((a, b) =>
      (b.entry.year - a.entry.year) ||
      String(a.entry.school).localeCompare(String(b.entry.school)) ||
      String(a.entry.paper).localeCompare(String(b.entry.paper)));
}

export function facets(entries) {
  const p = entries.filter((x) => x.kind === "paper" || x.kind === "markscheme");
  const uniq = (arr) => [...new Set(arr)];
  return {
    years: uniq(p.map((x) => x.year)).sort((a, b) => b - a),
    schools: uniq(p.map((x) => x.school)).sort(),
    papers: uniq(p.map((x) => String(x.paper))).sort(),
  };
}

export function practicalSections(entries) {
  return {
    resources: entries.filter((x) => x.kind === "practical").sort(byTitle),
    papers: paperRows(entries, { paper: "4" }),
  };
}

export const referenceEntries = (entries) => entries.filter((x) => x.kind === "reference").sort(byTitle);

export function search(entries, topics, q) {
  const needle = (q || "").trim().toLowerCase();
  if (!needle) return [];
  const topicName = new Map(topics.map((t) => [t.id, t.name]));
  return entries.filter((x) =>
    `${x.title} ${x.school || ""} ${topicName.get(x.topic) || ""}`.toLowerCase().includes(needle));
}

// ---- Flashcards: a simple Leitner box (0 = new/missed ... 4 = well known) ----
const MAX_BOX = 4;

export function deckFor(cards, topic) {
  if (topic == null || topic === "all") return cards;
  return cards.filter((c) => c.topic === Number(topic));
}

export function rate(progress, id, gotIt) {
  return { ...progress, [id]: gotIt ? Math.min((progress[id] || 0) + 1, MAX_BOX) : 0 };
}

export function pickNext(deck, progress, lastId, rng = Math.random) {
  if (!deck.length) return null;
  const pool = deck.length > 1 ? deck.filter((c) => c.id !== lastId) : deck;
  const weights = pool.map((c) => MAX_BOX + 1 - (progress[c.id] || 0));
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    if ((r -= weights[i]) < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function stats(cards, progress) {
  return { mastered: cards.filter((c) => (progress[c.id] || 0) >= 3).length, total: cards.length };
}

export function parseProgress(text) {
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

// ---- Multiple-choice quizzes ----
export function scoreQuiz(quiz, answers) {
  const wrong = [];
  let unanswered = 0;
  quiz.questions.forEach((q, i) => {
    const given = answers[i];
    if (given == null) unanswered++;
    if (given !== q.answer) wrong.push(i);
  });
  return { correct: quiz.questions.length - wrong.length, total: quiz.questions.length, wrong, unanswered };
}

export function mixedQuiz(quizzes, n, rng = Math.random) {
  const pool = quizzes.flatMap((qz) => qz.questions.map((q, i) => ({ ...q, source: `${qz.title} · Q${q.n ?? i + 1}` })));
  for (let i = pool.length - 1; i > 0; i--) {  // Fisher-Yates
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return { id: "mix", title: "Random mix", pair: null, questions: pool.slice(0, Math.max(0, n)) };
}

export function recordScore(scores, id, correct, total) {
  const prev = scores[id] && typeof scores[id] === "object" ? scores[id] : null;
  return { ...scores, [id]: { best: Math.max(prev?.best || 0, correct), last: correct, total } };
}

export function quizLabel(rec) {
  return rec ? `Best ${rec.best}/${rec.total} · last ${rec.last}/${rec.total}` : "Not attempted";
}

// ---- Study guide ----
export function searchGuide(guide, q) {
  const needle = (q || "").trim().toLowerCase();
  if (!needle || !guide) return [];
  return guide.filter((c) => `${c.title} ${c.summary} ${c.md}`.toLowerCase().includes(needle));
}

export function noteNeighbours(notes, topic) {
  const i = (notes || []).findIndex((n) => n.topic === Number(topic));
  return i < 0 ? null : { prev: notes[i - 1] || null, next: notes[i + 1] || null, position: i + 1 };
}

export function guideNeighbours(guide, id) {
  const i = guide.findIndex((c) => c.id === id);
  return i < 0 ? null : { prev: guide[i - 1] || null, next: guide[i + 1] || null, position: i + 1 };
}

// ---- Practical-skills quizzes (multiple choice and numeric answers) ----
const SUPERSCRIPT = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+" };

// Reads one number from what a student typed: "4.2", "−0.5", "1.2e3", "1.2×10^3", "1.2 × 10⁻³", "4.2 %", "43.3 s".
export function parseNumber(text) {
  if (typeof text !== "string") return null;
  let s = text.trim().replace(/−/g, "-");
  if (!s) return null;
  if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?/.test(s)) s = s.replace(/,/g, "");
  const m = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:\s*[x×*]\s*10\s*\^?\s*([+-]?\d+|[⁻⁺]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)|[eE]([+-]?\d+))?/.exec(s);
  if (!m) return null;
  const rest = s.slice(m[0].length);
  if (rest && !/^\s*(%|[A-Za-zµμΩ°Å](?![0-9]))/.test(rest) || /^[eE]/.test(rest)) return null;
  const exponent = m[2] ? Number([...m[2]].map((c) => SUPERSCRIPT[c] ?? c).join("")) : m[3] ? Number(m[3]) : 0;
  const value = Number(m[1]) * 10 ** exponent;
  return Number.isFinite(value) ? value : null;
}

export function checkNumeric(q, text) {
  const value = parseNumber(text);
  if (value === null) return { status: "invalid", value: null };
  const bound = q.answer === 0 ? q.tol : q.tol * Math.abs(q.answer);
  return { status: Math.abs(value - q.answer) <= bound ? "correct" : "wrong", value };
}

export function shuffleOptions(q, rng = Math.random) {
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
}

export function tally(results) {
  const wrong = [];
  results.forEach((ok, i) => { if (!ok) wrong.push(i); });
  return { correct: results.length - wrong.length, total: results.length, wrong };
}

export function quizzesForChapter(pquizzes, chapterId) {
  return (pquizzes || []).filter((q) => q.chapter === chapterId);
}

// ---- Navigation: search, recents, dashboard, breadcrumbs ----
const has = (text, needle) => String(text || "").toLowerCase().includes(needle);

export function searchAll(index, demos, q, perGroup = 6) {
  const needle = (q || "").trim().toLowerCase();
  if (!needle) return [];
  const topicName = new Map((index.topics || []).map((t) => [t.id, t.name]));
  const rank = (title, ...others) => (String(title).toLowerCase().startsWith(needle) ? 3 : has(title, needle) ? 2 : others.some((o) => has(o, needle)) ? 1 : 0);
  const group = (kind, items) => {
    const hits = items.filter((i) => i.score > 0).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, perGroup);
    return hits.length ? { kind, items: hits } : null;
  };
  const groups = [
    group("Topics", (index.topics || []).map((t) => ({ title: t.name, sub: `Topic ${t.id}`, href: (index.notes || []).some((n) => n.topic === t.id) ? `#/notes/${t.id}` : `#/topic/${t.id}`, score: rank(t.name) }))),
    group("Notes", (index.notes || []).map((n) => ({ title: n.title, sub: n.summary, href: `#/notes/${n.topic}`, score: rank(n.title, n.summary, n.md, topicName.get(n.topic)) }))),
    group("Structured questions", (index.structured || []).flatMap((set) => set.questions.map((q) => ({ title: q.title, sub: `Topic ${set.topic} · ${topicName.get(set.topic) || ""} · ${q.marks} marks`, href: `#/structured/${set.topic}`, score: rank(q.title, q.stem, topicName.get(set.topic)) })))),
    group("Practical guide", (index.guide || []).map((c) => ({ title: c.title, sub: c.summary, href: `#/guide/${c.id}`, score: rank(c.title, c.summary, c.md) }))),
    group("Practical quizzes", (index.pquizzes || []).map((p) => ({ title: p.title, sub: `${p.questions.length} questions`, href: `#/pquiz/${p.id}`, score: rank(p.title, p.summary, p.chapter) }))),
    group("Paper 1 quizzes", (index.quizzes || []).map((z) => ({ title: z.title, sub: `${z.questions.length} questions`, href: `#/quiz/${z.id}`, score: rank(z.title, z.school) }))),
    group("Flashcards", (index.flashcards || []).map((c) => ({ title: c.front, sub: topicName.get(c.topic) || "", href: "#/flashcards", score: rank(c.front, c.back) }))),
    group("Demos", (demos || []).map((d) => ({ title: d.title, sub: d.blurb, href: `#/demo/${d.id}`, score: rank(d.title, d.blurb) }))),
    group("Files", (index.entries || []).map((e) => ({ title: e.title, sub: [e.school, e.year, topicName.get(e.topic)].filter(Boolean).join(" · "), href: `#/file/${e.id}`, score: rank(e.title, e.school) }))),
  ];
  return groups.filter(Boolean);
}

export function touchRecent(list, item, max = 6) {
  if (!item || !item.href || item.href === "#/" || item.href === "#") return [...list];
  return [item, ...list.filter((x) => x.href !== item.href)].slice(0, max);
}

export function dashboardStats({ guide = [], read = {}, pquizzes = [], scores = {}, quizzes = [], cards = [], progress = {} }) {
  const attempted = pquizzes.filter((p) => scores[`pq-${p.id}`]);
  const pcts = attempted.map((p) => (scores[`pq-${p.id}`].best / scores[`pq-${p.id}`].total) * 100);
  return {
    guide: { done: guide.filter((c) => read[c.id]).length, total: guide.length },
    practical: { attempted: attempted.length, total: pquizzes.length, avg: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null },
    paper1: { attempted: quizzes.filter((z) => scores[z.id]).length, total: quizzes.length },
    cards: stats(cards, progress),
  };
}

export const nextChapter = (guide, read) => (guide || []).find((c) => !read[c.id]) || null;

export function quizToPractise(pquizzes, scores) {
  const list = pquizzes || [];
  const fresh = list.find((p) => !scores[`pq-${p.id}`]);
  if (fresh) return fresh;
  return [...list].sort((a, b) => {
    const pct = (p) => scores[`pq-${p.id}`].best / scores[`pq-${p.id}`].total;
    return pct(a) - pct(b);
  })[0] || null;
}

export function breadcrumbs(hash, index, demos = []) {
  const parts = String(hash || "").replace(/^#\/?/, "").split("?")[0].split("/").filter(Boolean);
  const [name, arg] = parts;
  const crumbs = (...c) => c.map(([label, href]) => (href ? { label, href } : { label }));
  const topic = (index.topics || []).find((t) => String(t.id) === arg);
  const noteTopic = (index.topics || []).find((t) => String(t.id) === arg);
  const chapter = (index.guide || []).find((c) => c.id === arg);
  const pq = (index.pquizzes || []).find((p) => p.id === arg);
  const qz = (index.quizzes || []).find((z) => z.id === arg);
  const demo = (demos || []).find((d) => d.id === arg);
  switch (name) {
    case "topics": return crumbs(["Learn"]);
    case "topic": return crumbs(["Learn", "#/topics"], [topic ? topic.name : `Topic ${arg}`]);
    case "structured": return !arg ? crumbs(["Exam practice", "#/practise"], ["Structured questions"]) : crumbs(["Learn", "#/topics"], [noteTopic ? noteTopic.name : `Topic ${arg}`, `#/notes/${arg}`], ["Structured questions"]);
    case "notes": return crumbs(["Learn", "#/topics"], [noteTopic ? noteTopic.name : `Topic ${arg}`, `#/topic/${arg}`], ["Notes"]);
    case "practical": return crumbs(["Practical"]);
    case "guide": return arg ? crumbs(["Practical", "#/practical"], ["Exam guide", "#/guide"], [chapter ? chapter.title : arg]) : crumbs(["Practical", "#/practical"], ["Exam guide"]);
    case "pquiz": return crumbs(["Practical", "#/practical"], ["Quizzes", "#/practical"], [pq ? pq.title : arg]);
    case "practise": return crumbs(["Exam practice"]);
    case "quizzes": return crumbs(["Exam practice", "#/practise"], ["Paper 1 quizzes"]);
    case "quiz": return crumbs(["Exam practice", "#/practise"], ["Paper 1 quizzes", "#/quizzes"], [arg === "mix" ? "Random 20" : qz ? qz.title : arg]);
    case "flashcards": return crumbs(["Learn", "#/topics"], ["Flashcards"]);
    case "demos": return crumbs(["Learn", "#/topics"], ["Demos"]);
    case "demo": return crumbs(["Learn", "#/topics"], ["Demos", "#/demos"], [demo ? demo.title : arg]);
    case "library": return crumbs(["Reference"]);
    case "papers": return crumbs(["Exam practice", "#/practise"], ["Past papers"]);
    case "reference": return crumbs(["Reference"]);
    case "search": return crumbs(["Search"]);
    default: return crumbs(["Home"]);
  }
}

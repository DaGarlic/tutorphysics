// Home dashboard and the three section hubs (Practical, Practise, Library).
import { h, icon } from "./ui.js";
import * as M from "./model.js";
import { KEYS } from "./store.js";
import { fileList } from "./components.js";

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

function meter(label, text, ratio, href) {
  return h("a", { class: "list-row meter", href },
    h("span", { class: "meter-label" }, label),
    h("div", { class: "progress grow", "aria-hidden": "true" }, h("i", { style: `width:${Math.round(ratio * 100)}%` })),
    h("span", { class: "muted small meter-text" }, text));
}

function sectionCard(ctx, { href, icon: ic, title, text }) {
  return h("a", { class: "card card-link", href }, h("span", { class: "card-icon" }, icon(ic, 20)), h("h3", {}, title), h("p", {}, text));
}

export function home(ctx) {
  const { index, store } = ctx;
  const read = store.get(KEYS.guideRead, {}), scores = store.get(KEYS.scores, {}), progress = store.get(KEYS.flashcards, {});
  const recents = store.recents();
  const s = M.dashboardStats({ guide: index.guide, read, pquizzes: index.pquizzes, scores, quizzes: index.quizzes, cards: index.flashcards, progress });
  const chapter = M.nextChapter(index.guide, read);
  const weak = M.quizToPractise(index.pquizzes, scores);
  const returning = recents.length > 0;

  const suggestions = [];
  if (chapter) suggestions.push(h("a", { class: "card card-link suggest", href: `#/guide/${chapter.id}` },
    h("span", { class: "badge badge-accent" }, "Next in the exam guide"), h("h3", {}, chapter.title), h("p", {}, chapter.summary), h("span", { class: "go" }, "Read chapter", icon("arrow-right", 15))));
  if (weak) {
    const sc = scores[`pq-${weak.id}`];
    suggestions.push(h("a", { class: "card card-link suggest", href: `#/pquiz/${weak.id}` },
      h("span", { class: "badge badge-warn" }, sc ? `Your lowest score: ${pct(sc.best, sc.total)}%` : "Not attempted yet"), h("h3", {}, weak.title), h("p", {}, `${weak.questions.length} questions`), h("span", { class: "go" }, "Start quiz", icon("arrow-right", 15))));
  }
  if (index.quizzes.length) suggestions.push(h("a", { class: "card card-link suggest", href: "#/quiz/mix" },
    h("span", { class: "badge" }, "Paper 1"), h("h3", {}, "Random 20 questions"), h("p", {}, `Mixed past-paper MCQs from ${index.quizzes.length} papers`), h("span", { class: "go" }, "Start", icon("arrow-right", 15))));

  return [
    h("header", { class: "page-head" }, h("p", { class: "eyebrow" }, "H2 Physics"),
      h("h1", {}, returning ? "Welcome back" : "Welcome"),
      h("p", { class: "lede" }, returning ? "Pick up where you left off, or choose what to work on next." : "Everything for H2 Physics in one place, from Ariq. A good way to start is the practical exam guide, then try a quiz.")),
    returning ? h("a", { class: "card card-link resume", href: recents[0].href },
      h("span", { class: "resume-ico" }, icon("play", 18)), h("span", { class: "grow" }, h("small", { class: "muted" }, "Continue"), h("strong", {}, recents[0].title)), icon("arrow-right", 18)) : null,
    h("section", { class: "section" }, h("div", { class: "section-head" }, h("h2", {}, "Where to work")),
      h("div", { class: "grid doors" },
        sectionCard(ctx, { href: "#/topics", icon: "book", title: "Learn", text: `Notes for all ${index.topics.length} syllabus topics, with practice questions, flashcards and demos.` }),
        sectionCard(ctx, { href: "#/practical", icon: "flask", title: "Practical", text: "The Paper 4 exam guide, skills quizzes and past practical papers." }),
        sectionCard(ctx, { href: "#/practise", icon: "target", title: "Exam practice", text: "Paper 1 quizzes and school prelim papers with solutions." }),
        sectionCard(ctx, { href: "#/library", icon: "library", title: "Reference", text: "Formulae sheet, syllabus and cheat sheets." }))),
    suggestions.length ? h("section", { class: "section" }, h("div", { class: "section-head" }, h("h2", {}, "Suggested next")), h("div", { class: "grid grid-3" }, suggestions)) : null,
    h("section", { class: "section" }, h("div", { class: "section-head" }, h("h2", {}, "Your progress")),
      h("div", { class: "list progress-list" },
        meter("Exam guide", `${s.guide.done} of ${s.guide.total} chapters`, s.guide.total ? s.guide.done / s.guide.total : 0, "#/guide"),
        meter("Practical quizzes", s.practical.avg == null ? `${s.practical.attempted} of ${s.practical.total} tried` : `${s.practical.avg}% average`, s.practical.total ? s.practical.attempted / s.practical.total : 0, "#/practical"),
        meter("Paper 1 quizzes", `${s.paper1.attempted} of ${s.paper1.total} papers`, s.paper1.total ? s.paper1.attempted / s.paper1.total : 0, "#/quizzes"),
        meter("Flashcards", `${s.cards.mastered} of ${s.cards.total} mastered`, s.cards.total ? s.cards.mastered / s.cards.total : 0, "#/flashcards"))),
    recents.length > 1 ? h("section", { class: "section" }, h("div", { class: "section-head" }, h("h2", {}, "Recently opened")),
      h("div", { class: "list" }, recents.slice(1, 6).map((r) => h("a", { class: "list-row", href: r.href }, h("span", { class: "grow title" }, r.title), icon("chevron-right", 16))))) : null,
  ];
}

function hub({ eyebrow, title, lede, items }) {
  return [h("header", { class: "page-head" }, h("p", { class: "eyebrow" }, eyebrow), h("h1", {}, title), h("p", { class: "lede" }, lede)),
    h("div", { class: "grid" }, items)];
}
const toolCard = (href, ic, title, text, meta) =>
  h("a", { class: "card card-link", href }, h("span", { class: "card-icon" }, icon(ic, 20)), h("h3", {}, title), h("p", {}, text), meta ? h("p", { class: "tool-meta" }, meta) : null);

export function practical(ctx) {
  const { index, store } = ctx;
  const read = store.get(KEYS.guideRead, {}), scores = store.get(KEYS.scores, {});
  const done = index.guide.filter((c) => read[c.id]).length;
  const resources = M.practicalSections(index.entries);
  const quizzes = index.pquizzes || [];
  return [
    h("header", { class: "page-head" }, h("p", { class: "eyebrow" }, "Paper 4"), h("h1", {}, "Practical"),
      h("p", { class: "lede" }, "The practical paper is 20% of the grade and rewards habits you can practise. Start with the guide, then test yourself.")),
    index.guide.length ? h("a", { class: "card card-link feature", href: "#/guide" },
      h("div", { class: "grow" }, h("p", { class: "eyebrow" }, "Exam guide"), h("h2", {}, "How to ace the practical exam"),
        h("p", { class: "muted" }, `${index.guide.length} chapters: how marks are won, measuring, uncertainties, graphs and spreadsheets, planning, evaluation, and a six-week plan.`),
        h("div", { class: "feature-progress" }, h("div", { class: "progress" }, h("i", { style: `width:${pct(done, index.guide.length)}%` })), h("small", { class: "muted" }, `${done} of ${index.guide.length} chapters read`))),
      h("span", { class: "go" }, done ? "Continue" : "Start reading", icon("arrow-right", 16))) : null,
    quizzes.length ? h("section", { class: "section" }, h("div", { class: "section-head" }, h("h2", {}, "Practical quizzes")),
      h("div", { class: "grid" }, quizzes.map((q) => {
        const sc = scores[`pq-${q.id}`];
        return h("a", { class: "card card-link quiz-card", href: `#/pquiz/${q.id}` }, h("h4", {}, q.title), h("p", {}, q.summary),
          h("div", { class: "quiz-card-foot" }, h("span", { class: "badge" }, `${q.questions.length} questions`),
            sc ? h("span", { class: `badge ${sc.best / sc.total >= 0.8 ? "badge-ok" : "badge-warn"}` }, `Best ${pct(sc.best, sc.total)}%`) : h("span", { class: "muted small" }, "Not attempted")));
      }))) : null,
    h("section", { class: "section" }, h("div", { class: "section-head" }, h("h2", {}, "Past practical papers and resources"), h("a", { href: "#/papers?paper=4" }, "All Paper 4 papers")),
      resources.resources.length || resources.papers.length
        ? h("div", { class: "list" }, [...resources.resources.map((e) => ctx.fileRow(e)), ...resources.papers.map((r) => ctx.fileRow(r.entry, r.solution))])
        : h("p", { class: "muted" }, "No files yet.")),
  ];
}

export function practise(ctx) {
  const { index, store } = ctx;
  const scores = store.get(KEYS.scores, {});
  const s = M.dashboardStats({ guide: [], scores, quizzes: index.quizzes, cards: index.flashcards, progress: {}, pquizzes: index.pquizzes });
  const papers = index.entries.filter((e) => e.kind === "paper").length;
  return hub({ eyebrow: "Exam practice", title: "Exam practice", lede: "Work on real exam questions, get instant marking on Paper 1, and open full papers with their mark schemes.",
    items: [
      toolCard("#/quizzes", "checklist", "Paper 1 quizzes", "Past-paper multiple-choice questions, marked as you go, with a random-20 mode.", `${s.paper1.attempted} of ${s.paper1.total} papers attempted`),
      toolCard("#/structured", "target", "Structured questions", "Multi-part exam-style questions on every topic, with model answers and self-marking.", `${(index.structured || []).reduce((n, x) => n + x.questions.length, 0)} questions`),
      toolCard("#/papers", "file", "Past papers", "Prelim and A-Level papers by year, school and paper, each with its mark scheme.", `${papers} papers`),
    ] });
}

export function library(ctx) {
  return [h("header", { class: "page-head" }, h("p", { class: "eyebrow" }, "Reference"), h("h1", {}, "Reference"),
      h("p", { class: "lede" }, "The formulae sheet, syllabus and cheat sheets. Keep these open while you work.")),
    fileList(ctx, M.referenceEntries(ctx.index.entries))];
}

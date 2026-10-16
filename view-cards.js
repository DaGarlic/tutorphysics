// Flashcards: flip cards with a simple spaced-repetition (Leitner) scheduler.
import { h, icon } from "./ui.js";
import * as M from "./model.js";
import { KEYS } from "./store.js";
import { pageHead } from "./components.js";

export function flashcards(ctx, _, params) {
  const { index, store } = ctx;
  const cards = index.flashcards;
  if (!cards.length) return [pageHead({ eyebrow: "Learn", title: "Flashcards" }), h("p", { class: "empty" }, "No flashcards yet.")];
  const topic = params.get("topic") || "all";
  const deck = M.deckFor(cards, topic);
  let progress = store.get(KEYS.flashcards, {});
  let current = M.pickNext(deck, progress, null);
  let flipped = false;

  const counts = new Map();
  for (const c of cards) counts.set(c.topic, (counts.get(c.topic) || 0) + 1);
  const picker = h("select", { "aria-label": "Topic", onchange: (ev) => { location.hash = ev.target.value === "all" ? "#/flashcards" : `#/flashcards?topic=${ev.target.value}`; } },
    h("option", { value: "all" }, `All topics (${cards.length})`),
    index.topics.filter((t) => counts.has(t.id)).map((t) => { const o = h("option", { value: t.id }, `${t.id}. ${t.name} (${counts.get(t.id)})`); if (String(topic) === String(t.id)) o.selected = true; return o; }));

  const front = h("div", { class: "face front" }), back = h("div", { class: "face back" });
  const flipper = h("button", { class: "flip-card", "aria-label": "Flip card" }, h("span", { class: "flip-inner" }, front, back));
  const stats = h("p", { class: "muted fc-stats" });
  const actions = h("div", { class: "fc-actions" });
  const dots = h("div", { class: "fc-dots", "aria-hidden": "true" });

  const paint = () => {
    const st = M.stats(deck, progress);
    stats.replaceChildren(h("strong", {}, `${st.mastered}`), ` of ${st.total} mastered`);
    dots.replaceChildren(...[0, 1, 2, 3, 4].map((n) => h("i", { class: (current && (progress[current.id] || 0) > n) ? "on" : "" })));
    if (!current) { front.replaceChildren("No cards for this topic."); back.replaceChildren(""); actions.replaceChildren(); return; }
    flipper.classList.toggle("is-flipped", flipped);
    actions.replaceChildren(...(flipped
      ? [h("button", { class: "btn btn-lg", onclick: () => rate(false) }, icon("retry", 16), "Again ", h("kbd", {}, "1")), h("button", { class: "btn btn-lg btn-primary", onclick: () => rate(true) }, icon("check", 16), "Got it ", h("kbd", {}, "2"))]
      : [h("button", { class: "btn btn-lg btn-primary", onclick: () => flip() }, "Show answer ", h("kbd", {}, "Space"))]));
  };
  const setFaces = () => { front.replaceChildren(h("small", {}, "Question"), current.front); back.replaceChildren(h("small", {}, "Answer"), current.back); };
  const flip = () => { if (!current) return; flipped = !flipped; paint(); };
  const rate = (ok) => {
    progress = M.rate(progress, current.id, ok);
    store.set(KEYS.flashcards, progress);
    const nextCard = M.pickNext(deck, progress, current.id);
    flipped = false;
    paint();                                  // flip back first, then swap the text while the card is face-down
    setTimeout(() => { current = nextCard; setFaces(); paint(); }, 200);
  };
  flipper.addEventListener("click", flip);
  const onKey = (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || /INPUT|SELECT|TEXTAREA|BUTTON/.test(ev.target.tagName) && ev.key === " ") return;
    if (ev.key === " ") { ev.preventDefault(); flip(); }
    else if (flipped && ev.key === "1") rate(false);
    else if (flipped && ev.key === "2") rate(true);
  };
  document.addEventListener("keydown", onKey);
  ctx.onLeave(() => document.removeEventListener("keydown", onKey));
  if (current) setFaces();
  paint();

  return [pageHead({ eyebrow: "Learn", title: "Flashcards", lede: "Flip the card, then say whether you knew it. Cards you miss come back sooner." }),
    h("div", { class: "fc-toolbar" }, picker, stats, h("button", { class: "btn btn-quiet btn-sm", onclick: () => {
      if (confirm("Reset your flashcard progress on this device?")) { progress = {}; store.set(KEYS.flashcards, progress); paint(); }
    } }, "Reset progress")),
    h("div", { class: "fc-stage" }, flipper, dots, actions)];
}

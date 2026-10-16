// Interactive demos: a gallery and a two-pane demo page (controls beside the graphs).
import { h, icon } from "./ui.js";
import { mountDemo } from "./demos.js";
import { pageHead } from "./components.js";

export function demos(ctx) {
  const { index } = ctx;
  const names = new Map(index.topics.map((t) => [t.id, t]));
  const ordered = [...ctx.demos].sort((a, b) => a.topic - b.topic || a.title.localeCompare(b.title));
  return [pageHead({ eyebrow: "Learn", title: "Interactive demos", lede: "Drag the sliders and watch the physics change. Each demo shows the graphs and the key numbers." }),
    h("div", { class: "grid" }, ordered.map((d) => h("a", { class: "card card-link", href: `#/demo/${d.id}` },
      h("span", { class: "badge badge-accent" }, `Topic ${d.topic} · ${names.get(d.topic)?.name || ""}`), h("h3", { class: "demo-card-title" }, d.title), h("p", {}, d.blurb))))];
}

export function demo(ctx, id) {
  const d = ctx.demos.find((x) => x.id === id);
  if (!d) return [h("p", { class: "empty" }, "Demo not found.")];
  ctx.wide = true;
  const area = h("div", { class: "demo" });
  mountDemo(d, area, h);
  const topic = ctx.index.topics.find((t) => t.id === d.topic);
  return [pageHead({ eyebrow: topic ? `Topic ${topic.id} · ${topic.name}` : "Demo", title: d.title, lede: d.blurb }), area,
    topic ? h("p", { class: "demo-foot" }, h("a", { class: "btn btn-sm", href: ctx.index.notes.some((n) => n.topic === topic.id) ? `#/notes/${topic.id}` : `#/topic/${topic.id}` }, icon("book", 15), `Notes and questions for ${topic.name}`)) : null];
}

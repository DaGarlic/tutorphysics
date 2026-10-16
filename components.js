// Reusable pieces shared by several pages.
import { h, icon } from "./ui.js";

const KIND_LABEL = { notes: "Notes", questions: "Questions", solutions: "Solutions", paper: "Paper", markscheme: "Mark scheme", practical: "Practical", reference: "Reference" };

export function fileMeta(entry, topics) {
  const topic = topics.find((t) => t.id === entry.topic);
  return [KIND_LABEL[entry.kind], entry.school, entry.year, entry.paper ? `Paper ${entry.paper}` : null, topic ? topic.name : null].filter(Boolean).join(" · ");
}

export function fileRow(ctx, entry, solution = null) {
  const open = h("button", { class: "row-main", onclick: () => ctx.openDoc(entry) },
    h("span", { class: "file-ico" }, icon("file", 17)),
    h("span", { class: "grow" }, h("span", { class: "title" }, entry.title), h("span", { class: "sub" }, fileMeta(entry, ctx.index.topics))));
  return h("div", { class: "list-row hoverable" }, open,
    h("div", { class: "row-actions" },
      solution ? h("button", { class: "btn btn-sm", onclick: () => ctx.openDoc(solution) }, entry.kind === "paper" ? "Mark scheme" : "Solutions") : null,
      h("button", { class: "btn btn-sm btn-primary", onclick: () => ctx.openDoc(entry) }, "Open")));
}

export const fileList = (ctx, rows, empty = "Nothing here yet.") =>
  rows.length ? h("div", { class: "list" }, rows.map((r) => (r.entry ? fileRow(ctx, r.entry, r.solution) : fileRow(ctx, r))))
              : h("div", { class: "list" }, h("p", { class: "empty" }, empty));

export function pageHead({ eyebrow, title, lede }) {
  return h("header", { class: "page-head" }, eyebrow ? h("p", { class: "eyebrow" }, eyebrow) : null, h("h1", {}, title), lede ? h("p", { class: "lede" }, lede) : null);
}

export function tabs(items, current, onSelect) {
  return h("div", { class: "tabs", role: "tablist" }, items.map((t) =>
    h("button", { class: "tab-btn", role: "tab", "aria-selected": String(t.id === current), onclick: () => onSelect(t.id) },
      t.label, t.count != null ? h("span", { class: "count" }, String(t.count)) : null)));
}

export function chipGroup(label, options, current, onSelect) {
  return h("div", { class: "chip-group" }, h("span", { class: "chip-label" }, label),
    options.map((o) => h("button", { class: "chip", "aria-pressed": String(String(o.value) === String(current ?? "")), onclick: () => onSelect(o.value) }, o.label)));
}

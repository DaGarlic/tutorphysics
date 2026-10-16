// Full-screen document viewer: decrypts a PDF on demand and shows it in a sheet.
import { decryptBytes, fetchBytes } from "./crypto.js";
import { h, icon, openLayer, toast } from "./ui.js";
import * as M from "./model.js";

const blobUrls = new Set();

export async function openDocument(ctx, entry) {
  const solution = M.solutionFor(ctx.index.entries, entry);
  let url = null;
  const body = h("div", { class: "sheet-body" }, h("p", { class: "sheet-note" }, "Decrypting…"));
  const download = h("a", { class: "btn btn-sm", download: `${entry.title.replace(/[^\w.\- ]+/g, "") || "document"}.pdf`, hidden: true }, icon("download", 15), "Download");
  const newTab = h("a", { class: "btn btn-sm btn-quiet", target: "_blank", rel: "noopener", hidden: true }, icon("external", 15), "New tab");
  const close = openLayer((closeLayer) => [h("div", { class: "sheet-bar" },
    h("button", { class: "icon-btn", "aria-label": "Close document", onclick: closeLayer, "data-autofocus": "" }, icon("x", 20)),
    h("span", { class: "title" }, entry.title),
    solution ? h("button", { class: "btn btn-sm", onclick: () => { closeLayer(); setTimeout(() => openDocument(ctx, solution), 160); } }, icon("check", 15), entry.kind === "paper" ? "Mark scheme" : "Solutions") : null,
    newTab, download), body], { label: entry.title, className: "sheet" });
  try {
    const bytes = await decryptBytes(ctx.key, await fetchBytes(`blob/${entry.id}.bin`));
    url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    blobUrls.add(url);
    download.href = url; newTab.href = url;
    download.hidden = false; newTab.hidden = false;
    body.replaceChildren(h("iframe", { src: url, title: entry.title }));
  } catch {
    body.replaceChildren(h("p", { class: "sheet-note" }, "Could not open this file. Reload the page and try again."));
    toast("Could not open that file.");
  }
  return close;
}

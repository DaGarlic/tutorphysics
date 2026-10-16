// A small, safe Markdown subset for the study guide. It only builds a plain data structure (no HTML),
// so the page can render it with textContent and nothing the author types can run as script.
const KINDS = new Set(["note", "tip", "warning", "exam", "mistake", "example", "key", "define"]);

export function plainText(inlines) {
  return inlines.map((n) => (n.c ? plainText(n.c) : n.v)).join("");
}

export function parseInline(s) {
  const out = [];
  let buf = "";
  const flush = () => { if (buf) { out.push({ t: "text", v: buf }); buf = ""; } };
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    let m;
    if (ch === "`" && s.indexOf("`", i + 1) > i + 1) {
      const j = s.indexOf("`", i + 1);
      flush(); out.push({ t: "code", v: s.slice(i + 1, j) }); i = j + 1; continue;
    }
    if (ch === "[" && (m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(s.slice(i)))) {
      flush();
      if (/^https?:\/\//i.test(m[2])) out.push({ t: "a", href: m[2], c: parseInline(m[1]) });
      else out.push(...parseInline(m[1]));            // not a safe URL: keep the words, drop the link
      i += m[0].length; continue;
    }
    if (s.startsWith("**", i)) {
      let j = s.indexOf("**", i + 2);
      while (j !== -1 && s[j + 2] === "*") j++;       // "***": the italic closes first, then the bold
      if (j > i + 2) { flush(); out.push({ t: "b", c: parseInline(s.slice(i + 2, j)) }); i = j + 2; continue; }
      buf += "**"; i += 2; continue;
    }
    if (ch === "*" && s[i + 1] && !/[\s*]/.test(s[i + 1])) {
      let j = i + 1;
      while ((j = s.indexOf("*", j)) !== -1 && (/\s/.test(s[j - 1]) || s[j + 1] === "*")) j++;
      if (j > i + 1) { flush(); out.push({ t: "i", c: parseInline(s.slice(i + 1, j)) }); i = j + 1; continue; }
    }
    if ((s.startsWith("^{", i) || s.startsWith("_{", i)) && s.indexOf("}", i + 2) > i + 1) {
      const j = s.indexOf("}", i + 2);
      flush(); out.push({ t: ch === "^" ? "sup" : "sub", v: s.slice(i + 2, j) }); i = j + 1; continue;
    }
    buf += ch; i++;
  }
  flush();
  return out;
}

const isTableSep = (l) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(l);
const splitRow = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => parseInline(c.trim()));
const listMarker = (l) => /^\s*([-*]|\d+\.)\s+/.exec(l);
const startsBlock = (l) => /^(#{1,3}\s|```|>|\s*([-*]|\d+\.)\s+|(-{3,}|\*{3,})\s*$|\|)/.test(l);

function parseBlocks(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (/^```/.test(line)) {
      const isEq = /^```eq\s*$/.test(line);
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      out.push(isEq ? { type: "eq", lines: body.filter((l) => l.trim()).map((l) => parseInline(l.trim())) } : { type: "code", text: body.join("\n") });
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { out.push({ type: "hr" }); i++; continue; }

    let m = /^(#{1,3})\s+(.*)$/.exec(line);
    if (m) { out.push({ type: "h", level: m[1].length, inlines: parseInline(m[2].trim()) }); i++; continue; }

    if (line.startsWith(">")) {
      const inner = [];
      while (i < lines.length && lines[i].startsWith(">")) inner.push(lines[i++].replace(/^> ?/, ""));
      let kind = "note", title = "";
      const head = /^\[!(\w+)\]\s*(.*)$/.exec(inner[0] || "");
      if (head) { kind = KINDS.has(head[1].toLowerCase()) ? head[1].toLowerCase() : "note"; title = head[2].trim(); inner.shift(); }
      out.push({ type: "callout", kind, title, titleInlines: parseInline(title), blocks: parseBlocks(inner) });
      continue;
    }

    if (line.trim().startsWith("|") && lines[i + 1] && isTableSep(lines[i + 1])) {
      const header = splitRow(line), rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(splitRow(lines[i++]));
      out.push({ type: "table", header, rows });
      continue;
    }

    if ((m = listMarker(line))) {
      const ordered = /\d/.test(m[1]);
      const items = [];
      while (i < lines.length && listMarker(lines[i]) && /\d/.test(listMarker(lines[i])[1]) === ordered) {
        let text = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, "");
        i++;
        while (i < lines.length && lines[i].trim() && /^\s{2,}\S/.test(lines[i]) && !listMarker(lines[i])) text += " " + lines[i++].trim();
        const box = /^\[( |x|X)\]\s+/.exec(text);
        items.push(box ? { checkbox: true, checked: box[1] !== " ", inlines: parseInline(text.slice(box[0].length)) }
                       : { inlines: parseInline(text) });
      }
      out.push({ type: ordered ? "ol" : "ul", items });
      continue;
    }

    const para = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) para.push(lines[i++].trim());
    out.push({ type: "p", inlines: parseInline(para.join(" ")) });
  }
  return out;
}

export function parseMarkdown(src) {
  return parseBlocks(String(src).replace(/\r\n?/g, "\n").split("\n"));
}

export function renderText(text, h) {
  return renderInlines(parseInline(text), h);        // for short strings (quiz questions and options)
}

// ---- Rendering: turns the parsed blocks into page elements using the caller's element builder `h`. ----
const LABELS = { note: "Note", tip: "Tip", warning: "Common mistake", exam: "In the exam", mistake: "Common mistake",
                 example: "Worked example", key: "Key idea", define: "Definition" };

function renderInlines(inlines, h) {
  return inlines.map((n) => {
    switch (n.t) {
      case "b": return h("strong", {}, renderInlines(n.c, h));
      case "i": return h("em", {}, renderInlines(n.c, h));
      case "code": return h("code", {}, n.v);
      case "sup": return h("sup", {}, n.v);
      case "sub": return h("sub", {}, n.v);
      case "a": return h("a", { href: n.href, target: "_blank", rel: "noopener noreferrer" }, renderInlines(n.c, h));
      default: return n.v;
    }
  });
}

export function renderBlocks(blocks, h) {
  return blocks.map((b) => {
    switch (b.type) {
      case "h": return h(`h${b.level}`, {}, renderInlines(b.inlines, h));  // chapters use ## and ### (the page title is the h1)
      case "p": return h("p", {}, renderInlines(b.inlines, h));
      case "hr": return h("hr");
      case "eq": return h("div", { class: "eq", role: "math" }, b.lines.map((l) => h("div", {}, renderInlines(l, h))));
      case "code": return h("pre", { class: "code" }, h("code", {}, b.text));
      case "ul":
      case "ol":
        return h(b.type, { class: b.items.some((i) => i.checkbox) ? "checklist" : "" }, b.items.map((it) =>
          h("li", {}, it.checkbox ? h("label", {}, h("input", { type: "checkbox", ...(it.checked ? { checked: "" } : {}) }), " ",
                                      renderInlines(it.inlines, h))
                                  : renderInlines(it.inlines, h))));
      case "table":
        return h("div", { class: "table-wrap" }, h("table", {},
          h("thead", {}, h("tr", {}, b.header.map((c) => h("th", {}, renderInlines(c, h))))),
          h("tbody", {}, b.rows.map((r) => h("tr", {}, r.map((c) => h("td", {}, renderInlines(c, h))))))));
      case "callout":
        return h("aside", { class: `callout callout-${b.kind}` },
          h("strong", { class: "callout-title" }, b.title ? renderInlines(b.titleInlines, h) : LABELS[b.kind]), renderBlocks(b.blocks, h));
      default: return null;
    }
  });
}

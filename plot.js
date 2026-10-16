// Canvas plotting for the demos. niceTicks is pure; drawPlot needs a canvas.
const clean = (x) => Number(x.toPrecision(12));

export function niceTicks(min, max, count = 5) {
  if (min === max) return [min];
  const raw = (max - min) / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * pow;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) out.push(clean(v));
  return out;
}

const fmt = (v) => (v !== 0 && (Math.abs(v) < 1e-2 || Math.abs(v) >= 1e4) ? v.toExponential(1) : String(clean(v)));

// plot = { title, xlabel, ylabel, series: [{ points: [[x, y], ...], marker?: [x, y] }], xmin?, ymin? }
export function drawPlot(canvas, plot) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return false; // not attached/laid out yet; the caller redraws once it has a size
  const css = getComputedStyle(document.documentElement);
  const ink = css.getPropertyValue("--ink").trim() || "#111";
  const muted = css.getPropertyValue("--muted").trim() || "#667";
  const line = css.getPropertyValue("--line").trim() || "#ddd";
  const accent = css.getPropertyValue("--accent").trim() || "#2457d6";
  const palette = { accent, muted, warn: css.getPropertyValue("--err").trim() || "#b42318", ok: css.getPropertyValue("--ok").trim() || "#1a7f4b" };
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const g = canvas.getContext("2d");
  g.scale(dpr, dpr);
  g.clearRect(0, 0, w, h);

  const pts = plot.series.flatMap((s) => s.points);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = plot.xmin ?? Math.min(...xs), x1 = Math.max(...xs);
  let y0 = plot.ymin ?? Math.min(...ys), y1 = Math.max(...ys);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  const L = 52, R = 12, T = 26, B = 40;
  let sx = (w - L - R) / (x1 - x0 || 1), sy = (h - T - B) / (y1 - y0);
  if (plot.equal) sx = sy = Math.min(sx, sy);      // e.g. a circular path must look circular
  const X = (x) => L + (x - x0) * sx;
  const Y = (y) => h - B - (y - y0) * sy;

  g.font = "11px system-ui, sans-serif";
  g.fillStyle = muted; g.strokeStyle = line; g.lineWidth = 1;
  for (const t of niceTicks(y0, y1, 4)) {
    g.beginPath(); g.moveTo(L, Y(t)); g.lineTo(w - R, Y(t)); g.stroke();
    g.textAlign = "right"; g.fillText(fmt(t), L - 6, Y(t) + 4);
  }
  if (!plot.hideX) {
    for (const t of niceTicks(x0, x1, 5)) {
      g.textAlign = "center"; g.fillText(fmt(t), X(t), h - B + 14);
    }
  }
  g.strokeStyle = ink; g.beginPath(); g.moveTo(L, T); g.lineTo(L, h - B); g.lineTo(w - R, h - B); g.stroke();
  if (y0 < 0 && y1 > 0) { g.strokeStyle = muted; g.beginPath(); g.moveTo(L, Y(0)); g.lineTo(w - R, Y(0)); g.stroke(); }

  g.fillStyle = ink; g.textAlign = "center";
  g.fillText(plot.xlabel, (L + w - R) / 2, h - 6);
  g.textAlign = "left"; g.fillText(`${plot.title}${plot.ylabel ? " (" + plot.ylabel + ")" : ""}`, L, 14);

  g.lineWidth = 2;
  for (const s of plot.series) {
    const colour = palette[s.color || "accent"] || accent;
    g.strokeStyle = colour;
    g.setLineDash(s.dashed ? [6, 4] : []);
    g.beginPath();
    s.points.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
    g.stroke();
    g.setLineDash([]);
    if (s.marker) { g.fillStyle = colour; g.beginPath(); g.arc(X(s.marker[0]), Y(s.marker[1]), 5, 0, 7); g.fill(); }
  }
  const labelled = plot.series.filter((s) => s.label);
  if (labelled.length > 1) {                     // a small key in the top right when several lines share a plot
    g.textAlign = "right"; g.font = "11px system-ui, sans-serif";
    labelled.forEach((s, i) => {
      g.fillStyle = palette[s.color || "accent"] || accent;
      g.fillText(`${s.label} ―`, w - R, 14 + 13 * i);
    });
  }
  return true;
}

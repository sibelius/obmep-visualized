// Downloads the official Olimpíada Mirim PDFs and slices them into one image per
// question (and per solution), plus a JSON index consumed by the Next.js app.
//
// Requires poppler (pdftoppm, pdftotext) and tesseract on PATH.
// Usage: node scripts/extract.mjs [--only 2025-f1-m1]

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(ROOT, "scripts/.cache");
const OUT_IMG = path.join(ROOT, "public/exams");
const OUT_DATA = path.join(ROOT, "src/data/exams.json");
const DPI = 150;
const SCALE = DPI / 72; // px per pt
const QUESTIONS = 15;

const sources = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/sources.json"), "utf8"));
const overrides = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/overrides.json"), "utf8"));
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

const examId = (s) => `${s.year}-f${s.phase}-m${s.level}`;
const driveView = (id) => `https://drive.google.com/file/d/${id}/view`;

function download(driveId, file) {
  if (fs.existsSync(file)) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  execFileSync("curl", ["-sL", "-o", file, `https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=t`]);
}

function renderPages(pdf, dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    execFileSync("pdftoppm", ["-r", String(DPI), "-png", pdf, path.join(dir, "p")]);
  }
  return fs
    .readdirSync(dir)
    .filter((f) => /^p-\d+\.png$/.test(f))
    .sort((a, b) => parseInt(a.match(/(\d+)\.png/)[1]) - parseInt(b.match(/(\d+)\.png/)[1]))
    .map((f) => path.join(dir, f));
}

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// Lines per page in PDF points: [{ x, y, yMax, text }]
function textLines(pdf) {
  const html = execFileSync("pdftotext", ["-bbox-layout", pdf, "-"], { maxBuffer: 64 << 20 }).toString();
  return html
    .split("<page ")
    .slice(1)
    .map((page) => {
      const [, w, h] = page.match(/width="([\d.]+)" height="([\d.]+)"/);
      const lines = [...page.matchAll(/<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="[\d.]+" yMax="([\d.]+)">([\s\S]*?)<\/line>/g)].map(
        (m) => ({
          x: +m[1],
          y: +m[2],
          yMax: +m[3],
          text: decode([...m[4].matchAll(/>([^<]*)<\/word>/g)].map((w) => w[1]).join(" ")),
        }),
      );
      return { width: +w, height: +h, lines };
    });
}

// Fallback for pages whose text was converted to outlines.
async function ocrLines(png) {
  // Binarize first so coloured headings (e.g. orange question numbers) read as black.
  const bw = png.replace(/\.png$/, ".bw.png");
  if (!fs.existsSync(bw)) await sharp(png).greyscale().threshold(190).toFile(bw);
  const tsv = execFileSync("tesseract", [bw, "-", "-l", "eng", "--psm", "3", "tsv"], {
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 64 << 20,
  }).toString();
  const byLine = new Map();
  for (const row of tsv.split("\n").slice(1)) {
    const c = row.split("\t");
    if (c.length < 12 || c[0] !== "5" || !c[11].trim()) continue;
    const key = `${c[2]}-${c[3]}-${c[4]}`;
    const [left, top, , height] = c.slice(6, 10).map(Number);
    const l = byLine.get(key) ?? { x: left / SCALE, y: top / SCALE, yMax: 0, words: [] };
    l.x = Math.min(l.x, left / SCALE);
    l.y = Math.min(l.y, top / SCALE);
    l.yMax = Math.max(l.yMax, (top + height) / SCALE);
    l.words.push(c[11]);
    byLine.set(key, l);
  }
  return [...byLine.values()].map(({ words, ...l }) => ({ ...l, text: words.join(" ") }));
}

async function loadDoc(kind, s) {
  const id = examId(s);
  const pdf = path.join(CACHE, "pdf", `${id}-${kind}.pdf`);
  download(s[kind], pdf);
  const pngs = renderPages(pdf, path.join(CACHE, "pages", `${id}-${kind}`));
  const pages = textLines(pdf);
  for (const [i, p] of pages.entries()) {
    p.png = pngs[i];
    if (p.lines.length < 3) {
      p.lines = await ocrLines(p.png);
      p.ocr = true;
    }
    p.lines.sort((a, b) => a.y - b.y || a.x - b.x);
  }
  return pages;
}

const HEADER_RE = /OBMEP|MIRIM|ENSINO FUNDAMENTAL|Solução da prova|^\d{1,2}$/i;

// Bottom of the running header on a page (pt). Anything above is chrome.
function headerBottom(page) {
  let bottom = 0;
  for (const l of page.lines) {
    if (l.y > 110) break;
    if (HEADER_RE.test(l.text)) bottom = Math.max(bottom, l.yMax);
  }
  return bottom ? bottom + 4 : 20;
}

function footerTop(page) {
  let top = page.height - 12;
  for (const l of [...page.lines].reverse()) {
    if (l.y < page.height - 60) break;
    if (/VISITE|APOIO|REALIZA|www\./i.test(l.text) || /^\d{1,2}$/.test(l.text)) top = Math.min(top, l.y - 4);
  }
  return top;
}

function findProvaAnchors(pages, fix = {}) {
  // Candidates in reading order, then keep the longest increasing run of numbers
  // so one unreadable number doesn't block the ones after it.
  const cands = [];
  pages.forEach((page, pi) => {
    if (page.lines.some((l) => /INSTRU[ÇC][ÕO]ES|QUADRO DE RESPOSTAS/i.test(l.text))) return;
    for (const l of page.lines) {
      const m = l.text.match(/^(\d{1,2})\s*[.)]/);
      if (m && +m[1] >= 1 && +m[1] <= QUESTIONS && l.x < 90 && !fix[+m[1]]) cands.push({ n: +m[1], page: pi, y: l.y });
    }
  });
  const best = cands.map(() => 1);
  const prev = cands.map(() => -1);
  for (let i = 0; i < cands.length; i++)
    for (let j = 0; j < i; j++)
      if (cands[j].n < cands[i].n && best[j] + 1 > best[i]) [best[i], prev[i]] = [best[j] + 1, j];
  const anchors = [];
  for (let i = best.indexOf(Math.max(0, ...best)); i >= 0; i = prev[i]) anchors.unshift(cands[i]);
  for (const [n, a] of Object.entries(fix)) anchors.push({ n: +n, ...a });
  return anchors.sort((a, b) => a.n - b.n);
}

function findSolutionAnchors(pages, fix = {}) {
  const anchors = [];
  pages.forEach((page, pi) => {
    for (const l of page.lines) {
      const m = l.text.match(/QUEST[ÃA]O\s*(\d{1,2})\b.*?ALTERNATIVA\s*\(?([A-E])\b/i);
      if (m && !anchors.some((a) => a.n === +m[1]) && !fix[+m[1]]) anchors.push({ n: +m[1], page: pi, y: l.y, answer: m[2].toUpperCase() });
    }
  });
  for (const [n, a] of Object.entries(fix)) anchors.push({ n: +n, ...a });
  return anchors.sort((a, b) => a.n - b.n);
}

// Returns [{ page, top, bottom }] (pt) covering anchor[i] up to anchor[i+1].
function regionsFor(pages, anchors, i) {
  const a = anchors[i];
  const b = anchors[i + 1];
  const end = b ? { page: b.page, y: b.y - 4 } : { page: pages.length - 1, y: footerTop(pages.at(-1)) };
  const parts = [];
  for (let p = a.page; p <= end.page; p++) {
    const top = p === a.page ? a.y - 5 : headerBottom(pages[p]);
    const bottom = p === end.page ? end.y : footerTop(pages[p]);
    if (bottom - top > 8) parts.push({ page: p, top, bottom });
  }
  return parts;
}

function textIn(pages, parts) {
  return parts
    .flatMap(({ page, top, bottom }) => pages[page].lines.filter((l) => l.y >= top - 1 && l.yMax <= bottom + 2).map((l) => l.text))
    .join("\n");
}

// Crop a region and trim blank rows at top/bottom. Returns null if empty.
async function crop(page, { top, bottom }, file) {
  const img = sharp(page.png);
  const { width, height } = await img.metadata();
  const t = Math.max(0, Math.floor(top * SCALE));
  const h = Math.min(height - t, Math.ceil((bottom - top) * SCALE));
  const { data, info } = await sharp(page.png).extract({ left: 0, top: t, width, height: h }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const inkRow = (y) => {
    for (let x = 0; x < info.width; x++) if (data[y * info.width + x] < 200) return true;
    return false;
  };
  const inkCol = (x, y0, y1) => {
    for (let y = y0; y < y1; y++) if (data[y * info.width + x] < 200) return true;
    return false;
  };
  let y0 = 0;
  let y1 = info.height - 1;
  while (y0 < y1 && !inkRow(y0)) y0++;
  while (y1 > y0 && !inkRow(y1)) y1--;
  if (y1 - y0 < 6) return null;
  let x0 = 0;
  let x1 = info.width - 1;
  while (x0 < x1 && !inkCol(x0, y0, y1 + 1)) x0++;
  while (x1 > x0 && !inkCol(x1, y0, y1 + 1)) x1--;
  const pad = 12;
  const left = Math.max(0, x0 - pad);
  const region = {
    left,
    top: t + Math.max(0, y0 - pad),
    width: Math.min(width, x1 + pad) - left,
    height: Math.min(h, y1 + pad) - Math.max(0, y0 - pad),
  };
  await sharp(page.png).extract(region).webp({ quality: 82 }).toFile(file);
  return { w: region.width, h: region.height };
}

async function sliceDoc(pages, anchors, dir, prefix) {
  const out = {};
  for (let i = 0; i < anchors.length; i++) {
    const parts = regionsFor(pages, anchors, i);
    const images = [];
    for (const [k, part] of parts.entries()) {
      const name = `${prefix}${anchors[i].n}-${k + 1}.webp`;
      const size = await crop(pages[part.page], part, path.join(dir, name));
      if (size) images.push({ src: `/exams/${path.basename(dir)}/${name}`, ...size });
    }
    out[anchors[i].n] = { images, text: textIn(pages, parts), answer: anchors[i].answer };
  }
  return out;
}

const report = [];
const existing = fs.existsSync(OUT_DATA) ? JSON.parse(fs.readFileSync(OUT_DATA, "utf8")) : [];
const exams = [];

for (const s of sources) {
  const id = examId(s);
  if (only && id !== only) {
    const prev = existing.find((e) => e.id === id);
    if (prev) exams.push(prev);
    continue;
  }
  const fix = overrides[id] ?? {};
  const prova = await loadDoc("prova", s);
  const sol = await loadDoc("solucao", s);
  let pa = findProvaAnchors(prova, fix.prova);
  if (pa.length < QUESTIONS) {
    // Question numbers are sometimes outlined glyphs; OCR every page and retry.
    for (const p of prova) if (!p.ocr) Object.assign(p, { lines: (await ocrLines(p.png)).sort((a, b) => a.y - b.y || a.x - b.x), ocr: true });
    pa = findProvaAnchors(prova, fix.prova);
  }
  const sa = findSolutionAnchors(sol, fix.solucao);
  report.push(`${id}: prova ${pa.length}/15 [${pa.map((a) => a.n).join(",")}]  solução ${sa.length}/15 [${sa.map((a) => a.n + a.answer).join(",")}]${sol.some((p) => p.ocr) ? " (ocr)" : ""}`);

  const dir = path.join(OUT_IMG, id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const q = await sliceDoc(prova, pa, dir, "q");
  const a = await sliceDoc(sol, sa, dir, "s");

  exams.push({
    id,
    year: s.year,
    edition: s.edition,
    phase: s.phase,
    level: s.level,
    provaUrl: driveView(s.prova),
    solucaoUrl: driveView(s.solucao),
    questions: Array.from({ length: QUESTIONS }, (_, i) => i + 1).map((n) => ({
      n,
      answer: a[n]?.answer ?? null,
      images: q[n]?.images ?? [],
      solutionImages: a[n]?.images ?? [],
      text: q[n]?.text ?? "",
      solutionText: a[n]?.text ?? "",
    })),
  });
}

fs.mkdirSync(path.dirname(OUT_DATA), { recursive: true });
fs.writeFileSync(OUT_DATA, JSON.stringify(exams, null, 1));
console.log(report.join("\n"));

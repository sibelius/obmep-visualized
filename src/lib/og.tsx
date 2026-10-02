import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import { ImageResponse } from "next/og";
import { examTitle, getExam, gradeLabel, type Exam } from "@/lib/exams";

export const SITE_URL = "https://obmep-visualized.vercel.app";
export const SITE_NAME = "OBMEP Mirim Interativa";
export const SITE_DESCRIPTION =
  "Resolva as provas da Olimpíada Mirim - OBMEP de forma interativa, questão por questão, com gabarito e soluções.";
export const OG_SIZE = { width: 1200, height: 630 };

const HOME_TITLE = "Provas da Olimpíada Mirim, questão por questão";
const HOME_BLURB = "Marque sua resposta, confira na hora e veja a solução oficial de cada questão.";

const C = {
  bg: "#f6f7fb",
  surface: "#ffffff",
  fg: "#1b1f2a",
  muted: "#667085",
  line: "#e4e7ee",
  brand: "#1a56db",
  brandSoft: "#e8efff",
  good: "#0e9f6e",
  bad: "#e02424",
  sun: "#f5b301",
};

const examBlurb = (e: Exam) =>
  `${gradeLabel(e.level)} do Ensino Fundamental · ${e.questions.length} questões com gabarito e solução oficial.`;

export function examMetadata(id: string): Metadata {
  const exam = getExam(id);
  if (!exam) return {};
  const title = examTitle(exam);
  const description = `${exam.edition}ª Olimpíada Mirim · ${examBlurb(exam)}`;
  const full = `${title} · ${SITE_NAME}`;
  return {
    title,
    description,
    openGraph: { title: full, description, url: `/prova/${exam.id}`, siteName: SITE_NAME, type: "article", locale: "pt_BR" },
    twitter: { card: "summary_large_image", title: full, description },
  };
}

export function ogAlt(href: string) {
  if (href === "/") return `${SITE_NAME}: ${HOME_TITLE}`;
  return `Prova da Olimpíada Mirim - OBMEP, resolvida de forma interativa. ${SITE_NAME}`;
}

// Seeded so every build draws the same picture
function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

type Kind = "circle" | "square" | "triangle" | "hex";

function shape({ kind, cx, cy, r, fill, rot, opacity = 1 }: { kind: Kind; cx: number; cy: number; r: number; fill: string; rot: number; opacity?: number }, key: number) {
  const t = `rotate(${rot} ${cx} ${cy})`;
  if (kind === "circle") return <circle key={key} cx={cx} cy={cy} r={r} fill={fill} opacity={opacity} />;
  if (kind === "square")
    return <rect key={key} x={cx - r * 0.85} y={cy - r * 0.85} width={r * 1.7} height={r * 1.7} rx={r * 0.12} fill={fill} opacity={opacity} transform={t} />;
  const n = kind === "triangle" ? 3 : 6;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  return <polygon key={key} points={pts} fill={fill} opacity={opacity} transform={t} />;
}

// A dotted grid with a scatter of olympiad-style shapes, one highlighted "answer"
function Geometry({ seed }: { seed: number }) {
  const w = 400;
  const h = 440;
  const rand = rng(seed);
  const kinds: Kind[] = ["circle", "square", "triangle", "hex"];
  const palette = [C.brand, C.sun, C.good, C.bad, C.brand];
  const cell = 100;
  const shapes: { kind: Kind; cx: number; cy: number; r: number; fill: string; rot: number; opacity: number }[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (rand() < 0.28) continue;
      const kind = kinds[Math.floor(rand() * kinds.length)];
      const r = 20 + rand() * 20;
      shapes.push({
        kind,
        cx: col * cell + cell / 2 + (rand() - 0.5) * 18,
        cy: row * cell + cell / 2 + 20 + (rand() - 0.5) * 18,
        r,
        fill: palette[Math.floor(rand() * palette.length)],
        rot: Math.floor(rand() * 4) * 15,
        opacity: 0.85 + rand() * 0.15,
      });
    }
  }
  const dots = [];
  for (let x = 0; x <= w; x += 22) for (let y = 0; y <= h; y += 22) dots.push([x, y]);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.6} fill="#c9cfdd" />
      ))}
      <line x1={0} y1={h - 20} x2={w} y2={20} stroke={C.brand} strokeWidth={2} strokeDasharray="6 8" opacity={0.35} />
      {shapes.map((s, i) => shape(s, i))}
    </svg>
  );
}

const font = (f: string) => readFile(join(process.cwd(), "assets/fonts", f));

function Chip({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <div style={{ display: "flex", padding: "6px 18px", borderRadius: 999, background: bg, color, fontSize: 24, fontWeight: 800 }}>
      {children}
    </div>
  );
}

export async function renderOg(href: string) {
  const [regular, bold, black] = await Promise.all([
    font("Nunito-latin-400.woff"),
    font("Nunito-latin-700.woff"),
    font("Nunito-latin-800.woff"),
  ]);
  const home = href === "/";
  const exam = home ? undefined : getExam(href.replace(/^\/prova\//, ""));
  if (!home && !exam) throw new Error(`No exam for ${href}`);

  const title = exam ? examTitle(exam) : HOME_TITLE;
  const blurb = exam ? examBlurb(exam) : HOME_BLURB;
  const seed = exam ? exam.year * 10 + exam.phase * 3 + exam.level : 2025;
  // Question numbers, not the answer key: the card should not spoil the exam
  const count = exam ? exam.questions.length : 15;
  const cells = Array.from({ length: Math.min(count, 15) }, (_, i) => String(i + 1));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: C.bg,
          color: C.fg,
          fontFamily: "Nunito",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 720, padding: "56px 0 48px 64px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Chip color={C.brand} bg={C.brandSoft}>
              {exam ? `${exam.edition}ª Olimpíada Mirim · OBMEP` : "Olimpíada Mirim · OBMEP"}
            </Chip>
          </div>

          {exam ? (
            <div style={{ marginTop: 30, display: "flex", flexDirection: "column", lineHeight: 1.04, letterSpacing: -1.5 }}>
              <span style={{ fontSize: 104, fontWeight: 800 }}>{`Mirim ${exam.level}`}</span>
              <span style={{ fontSize: 64, fontWeight: 800, color: C.brand }}>{`${exam.phase}ª fase · ${exam.year}`}</span>
            </div>
          ) : (
            <div style={{ marginTop: 34, display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.06, letterSpacing: -1.5 }}>
              {title}
            </div>
          )}
          <div style={{ marginTop: 22, fontSize: 29, lineHeight: 1.3, color: C.muted, fontWeight: 400, maxWidth: 610 }}>{blurb}</div>

          <div style={{ flex: 1 }} />

          <div style={{ display: "flex", gap: 6 }}>
            {cells.map((a, i) => (
              <div
                key={i}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 19,
                  fontWeight: 800,
                  background: i % 4 === 1 ? C.brand : C.surface,
                  color: i % 4 === 1 ? "#fff" : C.fg,
                  border: `2px solid ${i % 4 === 1 ? C.brand : C.line}`,
                }}
              >
                {a}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 14, fontSize: 24 }}>
            <span style={{ fontWeight: 800 }}>
              <span style={{ color: C.brand }}>OBMEP</span>&nbsp;Mirim&nbsp;<span style={{ color: C.muted, fontWeight: 700 }}>interativa</span>
            </span>
            <span style={{ color: C.line }}>|</span>
            <span style={{ color: C.muted }}>obmep-visualized.vercel.app</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            margin: "40px 40px 40px 0",
            borderRadius: 32,
            background: C.surface,
            border: `2px solid ${C.line}`,
          }}
        >
          <Geometry seed={seed} />
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Nunito", data: regular, weight: 400, style: "normal" },
        { name: "Nunito", data: bold, weight: 700, style: "normal" },
        { name: "Nunito", data: black, weight: 800, style: "normal" },
      ],
    },
  );
}

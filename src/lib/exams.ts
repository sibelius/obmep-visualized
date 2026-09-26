import data from "@/data/exams.json";

export type Letter = "A" | "B" | "C" | "D" | "E";

export type Slice = { src: string; w: number; h: number };

export type Question = {
  n: number;
  answer: Letter | null;
  images: Slice[];
  solutionImages: Slice[];
  text: string;
  solutionText: string;
};

export type Exam = {
  id: string;
  year: number;
  edition: number;
  phase: number;
  level: number;
  provaUrl: string;
  solucaoUrl: string;
  questions: Question[];
};

export const LETTERS: Letter[] = ["A", "B", "C", "D", "E"];

// Width in px of a page's printable area as rendered by scripts/extract.mjs (150 dpi).
// Slices are scaled relative to it so every question shows at the same zoom.
export const PAGE_WIDTH_PX = 1180;

export const exams = data as Exam[];

export const getExam = (id: string) => exams.find((e) => e.id === id);

export const levelLabel = (level: number) => `Mirim ${level}`;
export const gradeLabel = (level: number) => (level === 1 ? "2º e 3º anos" : "4º e 5º anos");

export const examTitle = (e: Exam) => `${levelLabel(e.level)} · ${e.phase}ª fase · ${e.year}`;

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { examTitle, exams, getExam, gradeLabel } from "@/lib/exams";
import { ExamPlayer } from "@/components/ExamPlayer";
import { examMetadata } from "@/lib/og";

export const dynamicParams = false;

export function generateStaticParams() {
  return exams.map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: PageProps<"/prova/[id]">): Promise<Metadata> {
  return examMetadata((await params).id);
}

export default async function ExamPage({ params }: PageProps<"/prova/[id]">) {
  const exam = getExam((await params).id);
  if (!exam) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <Link href="/" className="text-sm text-muted hover:text-foreground">← Todas as provas</Link>
      <div className="mt-3 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{examTitle(exam)}</h1>
          <p className="text-muted">{exam.edition}ª Olimpíada Mirim · {gradeLabel(exam.level)} do Ensino Fundamental</p>
        </div>
        <div className="flex gap-2 text-sm">
          <a className="rounded-lg border border-line bg-surface px-3 py-1.5 hover:border-brand" href={exam.provaUrl} target="_blank" rel="noreferrer">PDF da prova ↗</a>
          <a className="rounded-lg border border-line bg-surface px-3 py-1.5 hover:border-brand" href={exam.solucaoUrl} target="_blank" rel="noreferrer">PDF das soluções ↗</a>
        </div>
      </div>
      <ExamPlayer exam={exam} />
    </div>
  );
}

import Link from "next/link";
import { exams, gradeLabel, levelLabel } from "@/lib/exams";
import { ExamProgress } from "@/components/ExamProgress";

export default function Home() {
  const years = [...new Set(exams.map((e) => e.year))].sort((a, b) => b - a);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <section className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Provas da Olimpíada Mirim, questão por questão</h1>
        <p className="mt-3 text-muted max-w-2xl">
          Escolha uma prova, marque sua resposta e confira na hora. Depois veja a solução oficial de cada questão.
          {" "}{exams.length} provas · {exams.length * 15} questões.
        </p>
      </section>

      <div className="space-y-10">
        {years.map((year) => {
          const edition = exams.find((e) => e.year === year)!.edition;
          return (
            <section key={year}>
              <h2 className="text-xl font-bold mb-4">
                {year} <span className="text-muted font-semibold text-base">· {edition}ª Olimpíada Mirim</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {exams
                  .filter((e) => e.year === year)
                  .sort((a, b) => a.phase - b.phase || a.level - b.level)
                  .map((e) => (
                    <Link
                      key={e.id}
                      href={`/prova/${e.id}`}
                      className="group rounded-2xl border border-line bg-surface p-4 hover:border-brand hover:shadow-sm transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-brand-soft text-brand text-xs font-bold px-2 py-0.5">{levelLabel(e.level)}</span>
                        <span className="text-xs text-muted">{e.phase}ª fase</span>
                      </div>
                      <div className="mt-3 font-bold group-hover:text-brand">{gradeLabel(e.level)}</div>
                      <ExamProgress exam={e} />
                    </Link>
                  ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

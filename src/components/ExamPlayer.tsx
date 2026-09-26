"use client";

import { useEffect, useState } from "react";
import { LETTERS, PAGE_WIDTH_PX, type Exam, type Letter, type Slice } from "@/lib/exams";
import { saveAnswers, useAnswers } from "@/lib/progress";

function Slices({ slices, alt }: { slices: Slice[]; alt: string }) {
  if (slices.length === 0) return <p className="text-muted text-sm p-4">Imagem indisponível — veja o PDF oficial.</p>;
  return (
    <div className="rounded-xl bg-white p-2 sm:p-4 space-y-2 overflow-hidden">
      {slices.map((s) => (
        <a key={s.src} href={s.src} target="_blank" rel="noreferrer" title="Abrir imagem em tamanho real">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
          src={s.src}
          width={s.w}
          height={s.h}
          alt={alt}
          className="block h-auto max-w-full"
          style={{ width: `${(s.w / PAGE_WIDTH_PX) * 100}%` }}
        />
        </a>
      ))}
    </div>
  );
}

export function ExamPlayer({ exam }: { exam: Exam }) {
  const answers = useAnswers(exam.id);
  const [current, setCurrent] = useState(1);
  const [showSolution, setShowSolution] = useState(false);

  const q = exam.questions[current - 1];
  const picked = answers[q.n];
  const total = exam.questions.length;
  const answered = Object.keys(answers).length;
  const right = exam.questions.filter((x) => answers[x.n] && answers[x.n] === x.answer).length;

  const go = (n: number) => {
    const next = Math.min(total, Math.max(1, n));
    if (next === current) return;
    setCurrent(next);
    setShowSolution(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pick = (letter: Letter) => {
    if (picked) return;
    saveAnswers(exam.id, { ...answers, [q.n]: letter });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight") go(current + 1);
      else if (e.key === "ArrowLeft") go(current - 1);
      else if (/^[a-e]$/i.test(e.key)) pick(e.key.toUpperCase() as Letter);
      else if (e.key === "s") setShowSolution((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const status = (n: number) => {
    const a = answers[n];
    if (!a) return "idle";
    return a === exam.questions[n - 1].answer ? "right" : "wrong";
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="min-w-0">
        <div className="rounded-2xl border border-line bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-line">
            <h2 className="font-extrabold text-lg">Questão {q.n}</h2>
            <span className="text-sm text-muted">{q.n} de {total}</span>
          </div>
          <div className="p-1.5 sm:p-4 bg-line/40">
            <Slices slices={q.images} alt={q.text || `Questão ${q.n}`} />
          </div>

          <div className="px-4 sm:px-5 py-4 border-t border-line">
            <div className="text-sm font-semibold text-muted mb-2">
              {picked ? (picked === q.answer ? "Muito bem! Você acertou 🎉" : `Não foi dessa vez. A resposta certa é ${q.answer}.`) : "Qual é a sua resposta?"}
            </div>
            <div className="flex flex-wrap gap-2">
              {LETTERS.map((l) => {
                const isAnswer = picked && l === q.answer;
                const isWrongPick = picked === l && l !== q.answer;
                return (
                  <button
                    key={l}
                    onClick={() => pick(l)}
                    disabled={!!picked}
                    className={[
                      "size-12 rounded-full border-2 text-lg font-extrabold transition",
                      isAnswer
                        ? "border-good bg-good text-white"
                        : isWrongPick
                          ? "border-bad bg-bad text-white"
                          : picked
                            ? "border-line text-muted opacity-60"
                            : "border-line bg-surface hover:border-brand hover:text-brand cursor-pointer",
                    ].join(" ")}
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-4 sm:px-5 pb-4">
            <button
              onClick={() => setShowSolution((v) => !v)}
              className="text-sm font-bold text-brand hover:underline cursor-pointer"
            >
              {showSolution ? "Esconder solução" : picked ? "Ver solução" : "Desistir e ver solução"}
            </button>
            {showSolution && (
              <div className="mt-3 rounded-xl border border-good/40 bg-good-soft p-3">
                <div className="mb-2 text-sm font-bold text-good">Resposta: alternativa {q.answer}</div>
                <Slices slices={q.solutionImages} alt={q.solutionText || `Solução da questão ${q.n}`} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-between">
          <button
            onClick={() => go(current - 1)}
            disabled={current === 1}
            className="rounded-xl border border-line bg-surface px-4 py-2 font-bold disabled:opacity-40 cursor-pointer disabled:cursor-default"
          >
            ← Anterior
          </button>
          <button
            onClick={() => go(current + 1)}
            disabled={current === total}
            className="rounded-xl bg-brand text-white px-4 py-2 font-bold disabled:opacity-40 cursor-pointer disabled:cursor-default"
          >
            Próxima →
          </button>
        </div>
        <p className="mt-3 text-xs text-muted hidden sm:block">Atalhos: ← → navegar · A–E responder · S solução</p>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-20 self-start rounded-2xl border border-line bg-surface p-3 lg:p-4 order-first lg:order-none">
        <div className="flex items-baseline justify-between lg:block">
          <div className="text-sm font-bold">Seu desempenho</div>
          <div className="lg:mt-1 text-xl lg:text-3xl font-extrabold">
            {right}<span className="text-sm lg:text-base text-muted font-bold"> / {total} acertos</span>
          </div>
        </div>
        <div className="text-xs text-muted">{answered} respondidas</div>
        <div className="mt-3 lg:mt-4 grid grid-cols-8 sm:grid-cols-15 lg:grid-cols-5 gap-1.5">
          {exam.questions.map((x) => {
            const s = status(x.n);
            return (
              <button
                key={x.n}
                onClick={() => go(x.n)}
                className={[
                  "aspect-square rounded-lg text-xs lg:text-sm font-bold border-2 cursor-pointer",
                  s === "right" ? "bg-good-soft border-good/50 text-good" : s === "wrong" ? "bg-bad-soft border-bad/50 text-bad" : "border-line",
                  x.n === current ? "ring-2 ring-brand ring-offset-1 ring-offset-surface" : "",
                ].join(" ")}
              >
                {x.n}
              </button>
            );
          })}
        </div>
        {answered > 0 && (
          <button
            onClick={() => {
              saveAnswers(exam.id, {});
              go(1);
            }}
            className="mt-4 text-xs text-muted hover:text-bad cursor-pointer"
          >
            Recomeçar prova
          </button>
        )}
      </aside>
    </div>
  );
}

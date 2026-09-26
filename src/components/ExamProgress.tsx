"use client";

import type { Exam } from "@/lib/exams";
import { useAnswers } from "@/lib/progress";

export function ExamProgress({ exam }: { exam: Exam }) {
  const answers = useAnswers(exam.id);
  const done = Object.keys(answers).length;
  const right = exam.questions.filter((q) => answers[q.n] && answers[q.n] === q.answer).length;
  const total = exam.questions.length;
  return (
    <div className="mt-3">
      <div className="h-1.5 rounded-full bg-line overflow-hidden flex">
        <div className="bg-good" style={{ width: `${(right / total) * 100}%` }} />
        <div className="bg-bad/70" style={{ width: `${((done - right) / total) * 100}%` }} />
      </div>
      <div className="mt-1.5 text-xs text-muted">
        {done === 0 ? `${total} questões` : `${right} acertos · ${done}/${total} respondidas`}
      </div>
    </div>
  );
}

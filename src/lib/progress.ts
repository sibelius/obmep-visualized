"use client";

import { useSyncExternalStore } from "react";
import type { Letter } from "./exams";

export type Answers = Record<number, Letter>;

const key = (examId: string) => `obmep-mirim:${examId}`;
const listeners = new Set<() => void>();
const cache = new Map<string, Answers>();
const EMPTY: Answers = {};

function read(examId: string): Answers {
  if (cache.has(examId)) return cache.get(examId)!;
  let value = EMPTY;
  try {
    value = JSON.parse(localStorage.getItem(key(examId)) ?? "{}");
  } catch {}
  cache.set(examId, value);
  return value;
}

export function saveAnswers(examId: string, answers: Answers) {
  cache.set(examId, answers);
  try {
    localStorage.setItem(key(examId), JSON.stringify(answers));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAnswers(examId: string): Answers {
  return useSyncExternalStore(subscribe, () => read(examId), () => EMPTY);
}

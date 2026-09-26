# OBMEP Mirim interativa

Resolve the official [Olimpíada Mirim – OBMEP](https://olimpiadamirim.obmep.org.br/provas-solucoes) exams question by question: pick an answer, get instant feedback, and reveal the official solution. Progress is kept in `localStorage`.

Covers 2022–2025, 1ª and 2ª fase, Mirim 1 and Mirim 2 (16 exams, 240 questions).

## Development

```bash
pnpm install
pnpm dev
```

## Regenerating the content

Questions and solutions are sliced from the official PDFs into images (`public/exams/`) plus an index (`src/data/exams.json`):

```bash
brew install poppler tesseract
node scripts/extract.mjs            # all exams
node scripts/extract.mjs --only 2025-f1-m1
```

- `scripts/sources.json` — Google Drive ids of each exam/solution PDF (from the official page).
- `scripts/overrides.json` — manual question positions (`page` index, `y` in PDF points) for the few questions whose numbers can't be read from the PDF text or OCR.

Content © OBMEP / IMPA. This is an independent project with no official affiliation.

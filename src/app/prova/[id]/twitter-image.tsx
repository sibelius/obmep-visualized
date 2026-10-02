import { exams } from "@/lib/exams";
import { ogAlt, renderOg } from "@/lib/og";

export const alt = ogAlt("/prova");
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return exams.map((e) => ({ id: e.id }));
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return renderOg(`/prova/${id}`);
}

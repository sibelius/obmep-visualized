import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Link from "next/link";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/og";
import "./globals.css";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: { title: SITE_NAME, description: SITE_DESCRIPTION, url: "/", siteName: SITE_NAME, type: "website", locale: "pt_BR" },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-line bg-surface/80 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-extrabold text-lg tracking-tight">
              <span className="text-brand">OBMEP</span> Mirim <span className="text-muted font-bold">interativa</span>
            </Link>
            <a href="https://olimpiadamirim.obmep.org.br/provas-solucoes" target="_blank" rel="noreferrer" className="text-sm text-muted hover:text-foreground">
              Fonte oficial ↗
            </a>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line text-xs text-muted">
          <div className="mx-auto max-w-6xl px-4 py-6">
            Provas e soluções © OBMEP / IMPA, reproduzidas a partir de{" "}
            <a className="underline" href="https://olimpiadamirim.obmep.org.br/provas-solucoes">olimpiadamirim.obmep.org.br</a>. Projeto independente, sem vínculo oficial.
          </div>
        </footer>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KineMotion — Rehabilitación guiada con GIFs dinámicos",
  description:
    "Plataforma web responsiva de orientación kinesiológica: protocolos guiados por GIFs para recuperarte de lesiones leves sin descargar apps.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KineMotion — Rehabilitación guiada en video",
  description:
    "Plataforma web responsiva de orientación kinesiológica: ejercicios guiados en video para recuperarte de lesiones leves sin descargar apps.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {/* Sin JavaScript no hay animación de aparición: se muestra todo. */}
        <noscript>
          <style>{`.aparecer{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}

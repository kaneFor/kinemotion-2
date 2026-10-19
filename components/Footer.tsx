export default function Footer() {
  return (
    <footer className="border-t border-line mt-24">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 grid gap-6 md:grid-cols-[1.2fr_1fr] items-start">
        <p className="text-sm text-ink-soft max-w-md leading-relaxed">
          KineMotion es una herramienta de apoyo a la rehabilitación autónoma.
          No reemplaza el diagnóstico ni la indicación de un profesional de
          la salud: comienza a usarla solo con orientación médica o
          kinésica previa.
        </p>
        <div className="text-sm text-ink-soft md:text-right space-y-1">
          <p>Esguince de tobillo, fascitis plantar, tendinitis de muñeca,</p>
          <p>epicondilitis lateral y cervicalgia tensional.</p>
          <p className="pt-3 text-xs">
            Fotos: Vitaly Gariev, Zulfugar Karimov y yury kirillov en Unsplash.
          </p>
        </div>
      </div>
    </footer>
  );
}

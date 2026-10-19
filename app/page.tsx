import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import MotionLoop from "@/components/MotionLoop";
import { lesiones } from "@/lib/data";

const pasos = [
  {
    titulo: "Cuéntanos tu lesión",
    detalle:
      "Eliges entre las cinco lesiones leves que cubre la plataforma: esguince de tobillo, fascitis plantar, tendinitis de muñeca, epicondilitis o cervicalgia.",
  },
  {
    titulo: "Revisa tu rutina",
    detalle:
      "El sistema arma la secuencia de ejercicios para tu etapa de recuperación, cada uno con su GIF de técnica, ritmo y series.",
  },
  {
    titulo: "Ejecútalo con el GIF activo",
    detalle:
      "Sigues el ciclo completo del movimiento, fase concéntrica y excéntrica, en vez de adivinar a partir de un dibujo fijo.",
  },
  {
    titulo: "Recibe tu recordatorio",
    detalle:
      "Un aviso al correo llega en tu horario de terapia, para que la rutina no se pierda entre el estudio y el trabajo.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-20 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <h1 className="font-display text-4xl md:text-5xl leading-[1.05] text-ink">
              Tu folleto de papel no se mueve. Tu recuperación tampoco debería quedarse quieta.
            </h1>
            <p className="mt-6 text-lg text-ink-soft leading-relaxed max-w-md">
              KineMotion reemplaza los dibujos estáticos por guías visuales
              dinámicas: cada ejercicio se ve, con el ritmo y la postura
              correcta, directo desde el navegador y sin instalar nada.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/registro"
                className="bg-teal text-paper px-6 py-3 rounded-sm font-medium hover:bg-teal-deep transition-colors"
              >
                Crear mi cuenta
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 rounded-sm font-medium text-ink border border-line hover:border-ink transition-colors"
              >
                Ya tengo cuenta
              </Link>
            </div>
            <p className="mt-8 text-sm text-ink-soft border-t border-line pt-6 max-w-md">
              Cinco lesiones documentadas, treinta ejercicios en GIF, acceso
              inmediato desde cualquier navegador.
            </p>
          </div>
          <MotionLoop />
        </section>

        <section className="max-w-6xl mx-auto px-6 md:px-10 py-16 border-t border-line">
          <div className="grid md:grid-cols-2 gap-0 md:divide-x divide-line">
            <div className="pr-0 md:pr-12 pb-10 md:pb-0">
              <h2 className="font-display text-2xl text-ink-soft">El folleto de papel</h2>
              <ul className="mt-5 space-y-4 text-ink-soft">
                <li>No muestra el ritmo ni el rango de movimiento real.</li>
                <li>Se olvida o se pierde entre los apuntes de la semana.</li>
                <li>
                  Deja al paciente adivinando la postura a partir de un
                  dibujo fijo, lo que favorece los patrones compensatorios.
                </li>
              </ul>
            </div>
            <div className="pl-0 md:pl-12 pt-10 md:pt-0">
              <h2 className="font-display text-2xl text-ink">KineMotion</h2>
              <ul className="mt-5 space-y-4 text-ink">
                <li>Muestra el ciclo completo del ejercicio en movimiento.</li>
                <li>Vive en tu correo, con recordatorios en tu horario de terapia.</li>
                <li>
                  Reduce el margen de error en la ejecución, siguiendo la
                  técnica que muestra el GIF.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section id="lesiones" className="max-w-6xl mx-auto px-6 md:px-10 py-16 border-t border-line">
          <h2 className="font-display text-2xl md:text-3xl text-ink max-w-lg">
            Cinco lesiones leves, documentadas con protocolos clínicos
          </h2>
          <div className="mt-10 grid md:grid-cols-2 gap-x-10 gap-y-8">
            {lesiones.map((l) => (
              <div key={l.slug} className="border-t border-line pt-5">
                <h3 className="font-display text-lg text-ink">{l.nombre}</h3>
                <p className="mt-2 text-sm text-ink-soft leading-relaxed">{l.descripcion}</p>
                <p className="mt-3 text-xs label-tech text-teal-deep">
                  {l.fase.join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="max-w-6xl mx-auto px-6 md:px-10 py-16 border-t border-line">
          <h2 className="font-display text-2xl md:text-3xl text-ink max-w-lg">
            Cómo funciona, de principio a fin
          </h2>
          <ol className="mt-10 grid md:grid-cols-4 gap-8">
            {pasos.map((p, i) => (
              <li key={p.titulo}>
                <span className="label-tech text-sm text-kinetic-deep">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-base text-ink mt-2">{p.titulo}</h3>
                <p className="mt-2 text-sm text-ink-soft leading-relaxed">{p.detalle}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="max-w-6xl mx-auto px-6 md:px-10 py-20 border-t border-line">
          <div className="bg-ink text-paper rounded-sm px-8 py-12 md:px-14 md:py-16 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <h2 className="font-display text-2xl md:text-3xl max-w-md">
                Empieza tu recuperación con una guía que se mueve contigo.
              </h2>
              <p className="mt-3 text-paper/70 max-w-sm">
                Sin descargas, sin registros eternos. Solo tu navegador y tu
                rutina.
              </p>
            </div>
            <Link
              href="/registro"
              className="shrink-0 bg-kinetic text-ink px-6 py-3 rounded-sm font-medium hover:bg-kinetic-deep hover:text-paper transition-colors text-center"
            >
              Crear mi cuenta
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

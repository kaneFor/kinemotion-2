import Link from "next/link";
import type { Ejercicio } from "@/lib/data";
import BotonVoz from "@/components/BotonVoz";
import VideoEjercicio from "@/components/VideoEjercicio";
import { MarcaHecho } from "@/components/AccionesSesion";
import { guias, textoGuia } from "@/lib/guias";

const seedAngles: Record<string, number> = {};

function anglePara(id: string) {
  if (!(id in seedAngles)) {
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 40;
    seedAngles[id] = 20 + h;
  }
  return seedAngles[id];
}

export default function ExerciseCard({
  ejercicio,
  hechoHoy = false,
  desdeSesion = false,
}: {
  ejercicio: Ejercicio;
  hechoHoy?: boolean;
  desdeSesion?: boolean;
}) {
  const angle = anglePara(ejercicio.id);
  const guia = guias[ejercicio.id];
  return (
    <div className="border-t border-line pt-5 group">
      <div className="aspect-video bg-paper-dim/60 rounded-sm flex items-center justify-center relative overflow-hidden">
        {ejercicio.youtube ? (
          <VideoEjercicio video={ejercicio.youtube} nombre={ejercicio.nombre} />
        ) : ejercicio.media ? (
          <video
            src={ejercicio.media}
            autoPlay
            loop
            muted
            playsInline
            controls
            className="w-full h-full object-cover"
            aria-label={`Demostración: ${ejercicio.nombre}`}
          />
        ) : (
          <svg viewBox="0 0 120 90" className="w-2/3 h-2/3" aria-hidden>
            <line x1="60" y1="20" x2="60" y2="55" stroke="var(--ink)" strokeWidth="4" strokeLinecap="round" />
            <circle cx="60" cy="20" r="4" fill="var(--ink)" />
            <circle cx="60" cy="55" r="4" fill="var(--ink)" />
            <g
              style={
                {
                  transformOrigin: "60px 55px",
                  animation: `card-swing 1.8s ease-in-out infinite`,
                  "--swing": `-${angle}deg`,
                } as React.CSSProperties
              }
            >
              <line x1="60" y1="55" x2="92" y2="72" stroke="var(--kinetic-deep)" strokeWidth="4" strokeLinecap="round" />
              <circle cx="92" cy="72" r="4" fill="var(--kinetic-deep)" />
            </g>
          </svg>
        )}
        {!ejercicio.youtube && !ejercicio.media && (
          <span className="absolute top-2 right-2 label-tech text-[10px] text-ink-soft bg-paper/80 px-1.5 py-0.5 rounded-sm">
            sin video
          </span>
        )}
      </div>
      {ejercicio.youtube && (
        <p className="mt-1.5 text-[11px] text-ink-soft leading-snug">
          {ejercicio.youtube.aproximado && <span className="text-ink">Variante similar · </span>}
          Video:{" "}
          <a
            href={`https://www.youtube.com/watch?v=${ejercicio.youtube.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-ink"
          >
            {ejercicio.youtube.canal}
          </a>
        </p>
      )}
      <h3 className="font-display text-sm text-ink mt-3">{ejercicio.nombre}</h3>
      <p className="mt-1 text-xs text-ink-soft label-tech">
        {ejercicio.series} · {ejercicio.ritmo}
      </p>
      <p className="mt-1 text-xs text-teal-deep">{ejercicio.foco}</p>
      {guia && (
        <>
          <details className="mt-2 text-xs text-ink-soft">
            <summary className="cursor-pointer text-ink">Ver objetivo y movimiento</summary>
            <p className="mt-1 leading-relaxed"><strong>Objetivo:</strong> {guia.objetivo}</p>
            <p className="mt-1 leading-relaxed"><strong>Movimiento:</strong> {guia.movimiento}</p>
          </details>
          <BotonVoz texto={textoGuia(guia)} />
        </>
      )}
      {ejercicio.angleTarget && (
        <Link
          href={`/practica/${ejercicio.id}${desdeSesion ? "?desde=sesion" : ""}`}
          className="mt-2 inline-block text-xs font-medium text-teal-deep border border-teal-deep/40 rounded-sm px-2 py-1 hover:bg-teal-deep hover:text-paper transition-colors"
        >
          Practicar con cámara (beta)
        </Link>
      )}
      {hechoHoy && <MarcaHecho ejercicioId={ejercicio.id} />}

      <style>{`
        @keyframes card-swing {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(var(--swing)); }
        }
      `}</style>
    </div>
  );
}

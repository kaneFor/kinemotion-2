"use client";

import { useState } from "react";
import type { CumplimientoSemana } from "@/lib/progreso";

// Validado con el validador de paleta sobre el fondo --paper.
const COLOR = "#00806b";
const ANCHO = 640;
const ALTO = 220;
const M = { izq: 36, der: 8, arr: 22, aba: 30 };
const AREA_X = ANCHO - M.izq - M.der;
const AREA_Y = ALTO - M.arr - M.aba;

const fechaCorta = (fecha: string) =>
  new Date(`${fecha}T12:00:00Z`).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

const detalle = (s: CumplimientoSemana, sinDatos: string) =>
  s.porcentaje === null
    ? sinDatos
    :`${s.completadas} de ${s.programadas} ${s.programadas === 1 ? "sesión" : "sesiones"}` +
      (s.suspendidas ? ` · ${s.suspendidas} suspendida${s.suspendidas === 1 ? "" : "s"} por dolor` : "");

/** Cumplimiento autodeclarado por semana, de 0 a 100 %. */
export default function GraficoCumplimiento({
  semanas,
  sinDatos = "Sin sesiones programadas",
}: {
  semanas: CumplimientoSemana[];
  /** Qué decir de una semana sin porcentaje. */
  sinDatos?: string;
}) {
  const [activa, setActiva] = useState<number | null>(null);
  const ranura = AREA_X / semanas.length;
  const ancho = Math.min(44, ranura - 10);
  const x = (i: number) => M.izq + i * ranura + (ranura - ancho) / 2;
  const y = (p: number) => M.arr + ((100 - p) / 100) * AREA_Y;
  const s = activa !== null ? semanas[activa] : null;
  const ultima = semanas.length - 1;

  return (
    <div className="mt-4">
      <div className="relative">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full h-auto" role="img" aria-label="Cumplimiento semanal de las últimas semanas; la tabla de abajo tiene los mismos datos.">
          {[0, 50, 100].map((p) => (
            <g key={p}>
              <line x1={M.izq} x2={M.izq + AREA_X} y1={y(p)} y2={y(p)} stroke="var(--line)" strokeWidth="1" />
              <text x={M.izq - 8} y={y(p) + 4} textAnchor="end" fontSize="11" fill="var(--ink-soft)">
                {p}%
              </text>
            </g>
          ))}
          {semanas.map((sem, i) => {
            const p = sem.porcentaje;
            const alto = p === null ? 0 : Math.max(((p / 100) * AREA_Y), p > 0 ? 3 : 0);
            return (
              <g
                key={sem.lunes}
                tabIndex={0}
                aria-label={`Semana del ${fechaCorta(sem.lunes)}: ${p === null ? sinDatos.toLowerCase() : `${p} %, ${detalle(sem, sinDatos)}`}`}
                onPointerEnter={() => setActiva(i)}
                onPointerLeave={() => setActiva(null)}
                onFocus={() => setActiva(i)}
                onBlur={() => setActiva(null)}
                className="outline-none"
              >
                <rect x={M.izq + i * ranura} y={M.arr} width={ranura} height={AREA_Y + M.aba} fill="transparent" />
                {p === null ? (
                  <text x={x(i) + ancho / 2} y={y(0) - 6} textAnchor="middle" fontSize="11" fill="var(--ink-soft)">
                    —
                  </text>
                ) : (
                  <path
                    d={`M${x(i)},${y(0)} V${y(0) - alto + 4} q0,-4 4,-4 H${x(i) + ancho - 4} q4,0 4,4 V${y(0)} Z`}
                    fill={COLOR}
                    opacity={activa === null || activa === i ? 1 : 0.55}
                  />
                )}
                {i === ultima && p !== null && (
                  <text x={x(i) + ancho / 2} y={y(0) - alto - 6} textAnchor="middle" fontSize="11" fill="var(--ink)">
                    {p}%
                  </text>
                )}
                <text x={x(i) + ancho / 2} y={ALTO - 10} textAnchor="middle" fontSize="11" fill="var(--ink-soft)">
                  {i === ultima ? "Esta" : fechaCorta(sem.lunes)}
                </text>
              </g>
            );
          })}
        </svg>
        {s && activa !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 bg-paper border border-line rounded-sm px-3 py-2 text-xs shadow-sm"
            style={
              activa > semanas.length / 2
                ? { right: `${100 - ((x(activa) + ancho / 2) / ANCHO) * 100 + 2}%` }
                : { left: `${((x(activa) + ancho / 2) / ANCHO) * 100 + 2}%` }
            }
          >
            <p className="text-ink-soft">Semana del {fechaCorta(s.lunes)}</p>
            <p className="mt-1">
              <strong className="text-ink">{s.porcentaje === null ? "—" : `${s.porcentaje} %`}</strong>{" "}
              <span className="text-ink-soft">{detalle(s, sinDatos)}</span>
            </p>
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-teal-deep">Ver como tabla</summary>
        <table className="mt-3 w-full max-w-md text-left text-sm">
          <thead className="text-xs text-ink-soft">
            <tr>
              <th className="py-1 font-normal">Semana del</th>
              <th className="py-1 font-normal">Cumplimiento</th>
              <th className="py-1 font-normal">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {semanas.map((sem) => (
              <tr key={sem.lunes} className="border-t border-line">
                <td className="py-1 text-ink-soft">{fechaCorta(sem.lunes)}</td>
                <td className="py-1 text-ink">{sem.porcentaje === null ? "—" : `${sem.porcentaje} %`}</td>
                <td className="py-1 text-ink-soft">{detalle(sem, sinDatos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

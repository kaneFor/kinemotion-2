"use client";

import { useState } from "react";

export type PuntoDolor = { fecha: string; antes?: number; despues?: number };

// Validados con el validador de paleta (contraste, daltonismo y separación)
// sobre el fondo --paper.
const COLOR = { antes: "#7d9412", despues: "#00806b" } as const;
const SERIES = [
  { clave: "antes", nombre: "Antes de la rutina" },
  { clave: "despues", nombre: "Después de la rutina" },
] as const;

const ANCHO = 640;
const ALTO = 240;
const M = { izq: 30, der: 78, arr: 14, aba: 30 };
const AREA_X = ANCHO - M.izq - M.der;
const AREA_Y = ALTO - M.arr - M.aba;

const fechaCorta = (fecha: string) =>
  new Date(`${fecha}T12:00:00Z`).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

/** Dolor de 0 a 10 antes y después de la rutina, día a día. */
export default function GraficoDolor({ puntos }: { puntos: PuntoDolor[] }) {
  const [activo, setActivo] = useState<number | null>(null);
  const conDatos = puntos
    .map((p, i) => (p.antes !== undefined || p.despues !== undefined ? i : -1))
    .filter((i) => i >= 0);

  if (conDatos.length === 0) {
    return (
      <p className="mt-3 text-sm text-ink-soft">
        Todavía no registras tu dolor. Te lo preguntamos al empezar y al
        terminar la rutina de hoy.
      </p>
    );
  }

  const paso = AREA_X / Math.max(puntos.length - 1, 1);
  const x = (i: number) => M.izq + i * paso;
  const y = (v: number) => M.arr + ((10 - v) / 10) * AREA_Y;

  function trazo(clave: "antes" | "despues") {
    let d = "";
    let anterior = false;
    puntos.forEach((p, i) => {
      const v = p[clave];
      if (v === undefined) {
        anterior = false;
        return;
      }
      d += `${anterior ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      anterior = true;
    });
    return d;
  }

  // Etiqueta directa junto al último valor de cada serie, separadas si chocan.
  const ultimo = (clave: "antes" | "despues") => {
    for (let i = puntos.length - 1; i >= 0; i--) {
      const v = puntos[i][clave];
      if (v !== undefined) return { i, v };
    }
    return null;
  };
  const etiquetas = SERIES.map((s) => ({ ...s, punto: ultimo(s.clave) }));
  const [ea, ed] = etiquetas;
  let yAntes = ea.punto ? y(ea.punto.v) : 0;
  let yDespues = ed.punto ? y(ed.punto.v) : 0;
  if (ea.punto && ed.punto && Math.abs(yAntes - yDespues) < 14) {
    const medio = (yAntes + yDespues) / 2;
    const arriba = ea.punto.v >= ed.punto.v;
    yAntes = medio + (arriba ? -7 : 7);
    yDespues = medio + (arriba ? 7 : -7);
  }

  function desdePuntero(e: React.PointerEvent<SVGRectElement>) {
    const caja = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const px = ((e.clientX - caja.left) / caja.width) * ANCHO;
    setActivo(Math.min(puntos.length - 1, Math.max(0, Math.round((px - M.izq) / paso))));
  }

  function conTeclado(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const actual = activo ?? conDatos[conDatos.length - 1];
    const lista = e.key === "ArrowLeft" ? [...conDatos].reverse() : conDatos;
    const siguiente = lista.find((i) => (e.key === "ArrowLeft" ? i < actual : i > actual));
    if (siguiente !== undefined) setActivo(siguiente);
  }

  const marcados = [0, Math.floor((puntos.length - 1) / 2), puntos.length - 1];
  const p = activo !== null ? puntos[activo] : null;

  return (
    <div className="mt-4">
      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-soft">
        {SERIES.map((s) => (
          <li key={s.clave} className="flex items-center gap-2">
            <svg width="22" height="10" aria-hidden>
              <line x1="0" y1="5" x2="22" y2="5" stroke={COLOR[s.clave]} strokeWidth="2" />
              <circle
                cx="11"
                cy="5"
                r="3.5"
                fill={s.clave === "antes" ? "var(--paper)" : COLOR[s.clave]}
                stroke={COLOR[s.clave]}
                strokeWidth="2"
              />
            </svg>
            {s.nombre}
          </li>
        ))}
      </ul>

      <div
        className="relative mt-2 outline-none focus-visible:ring-2 focus-visible:ring-teal rounded-sm"
        tabIndex={0}
        role="group"
        aria-label="Gráfico del dolor de los últimos 30 días. Usa las flechas para recorrer los días; la tabla de abajo tiene los mismos datos."
        onKeyDown={conTeclado}
        onFocus={() => setActivo((a) => a ?? conDatos[conDatos.length - 1])}
        onBlur={() => setActivo(null)}
      >
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full h-auto" aria-hidden>
          {[0, 5, 10].map((v) => (
            <g key={v}>
              <line x1={M.izq} x2={M.izq + AREA_X} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" />
              <text x={M.izq - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-soft)">
                {v}
              </text>
            </g>
          ))}
          {marcados.map((i, n) => (
            <text
              key={i}
              x={x(i)}
              y={ALTO - 8}
              textAnchor={n === 0 ? "start" : n === 2 ? "end" : "middle"}
              fontSize="11"
              fill="var(--ink-soft)"
            >
              {fechaCorta(puntos[i].fecha)}
            </text>
          ))}

          {activo !== null && (
            <line x1={x(activo)} x2={x(activo)} y1={M.arr} y2={M.arr + AREA_Y} stroke="var(--ink-soft)" strokeWidth="1" />
          )}

          {SERIES.map((s) => (
            <g key={s.clave}>
              <path d={trazo(s.clave)} fill="none" stroke={COLOR[s.clave]} strokeWidth="2" strokeLinejoin="round" />
              {puntos.map((pt, i) => {
                const v = pt[s.clave];
                if (v === undefined) return null;
                return (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(v)}
                    r={activo === i ? 5.5 : 4}
                    fill={s.clave === "antes" ? "var(--paper)" : COLOR[s.clave]}
                    stroke={s.clave === "antes" ? COLOR[s.clave] : "var(--paper)"}
                    strokeWidth="2"
                  />
                );
              })}
            </g>
          ))}

          {ea.punto && (
            <text x={x(ea.punto.i) + 10} y={yAntes + 4} fontSize="11" fill="var(--ink-soft)">
              Antes
            </text>
          )}
          {ed.punto && (
            <text x={x(ed.punto.i) + 10} y={yDespues + 4} fontSize="11" fill="var(--ink-soft)">
              Después
            </text>
          )}

          <rect
            x={M.izq - paso / 2}
            y={0}
            width={AREA_X + paso}
            height={ALTO}
            fill="transparent"
            onPointerMove={desdePuntero}
            onPointerDown={desdePuntero}
            onPointerLeave={() => setActivo(null)}
          />
        </svg>

        {p && activo !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-2 bg-paper border border-line rounded-sm px-3 py-2 text-xs shadow-sm"
            style={
              activo > puntos.length / 2
                ? { right: `${100 - (x(activo) / ANCHO) * 100 + 2}%` }
                : { left: `${(x(activo) / ANCHO) * 100 + 2}%` }
            }
          >
            <p className="text-ink-soft">{fechaCorta(p.fecha)}</p>
            {SERIES.map((s) => (
              <p key={s.clave} className="mt-1 flex items-center gap-2">
                <span className="inline-block w-3 h-0.5" style={{ background: COLOR[s.clave] }} aria-hidden />
                <strong className="text-ink">{p[s.clave] ?? "—"}</strong>
                <span className="text-ink-soft">{s.clave === "antes" ? "antes" : "después"}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-teal-deep">Ver como tabla</summary>
        <table className="mt-3 w-full max-w-sm text-left text-sm">
          <thead className="text-xs text-ink-soft">
            <tr>
              <th className="py-1 font-normal">Día</th>
              <th className="py-1 font-normal">Antes</th>
              <th className="py-1 font-normal">Después</th>
            </tr>
          </thead>
          <tbody>
            {conDatos.map((i) => (
              <tr key={i} className="border-t border-line">
                <td className="py-1 text-ink-soft">{fechaCorta(puntos[i].fecha)}</td>
                <td className="py-1 text-ink">{puntos[i].antes ?? "—"}</td>
                <td className="py-1 text-ink">{puntos[i].despues ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

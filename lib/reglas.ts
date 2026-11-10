import { inclinacionCabeza, inclinacionHombros } from "./cuello";
import { anguloEntrePuntos, VIS_MIN, type Lado, type Punto } from "./pose";

/**
 * Reglas de corrección en tiempo real, calculadas sobre los puntos del
 * cuerpo que entrega MediaPipe (vista lateral, plano 2D).
 *
 * `evaluar` devuelve:
 *  - true  → hay una desviación que conviene avisar
 *  - false → la postura está dentro del umbral
 *  - null  → no se puede evaluar (puntos poco visibles)
 *
 * Los puntos deben venir con el aspecto corregido (`corregirAspecto`) y
 * `lado` es el lado del cuerpo que mira a la cámara (`SelectorLado`).
 *
 * LIMITACIONES: con una sola cámara 2D no se puede medir la curvatura de la
 * columna, solo la inclinación del tronco. Los umbrales de abajo son
 * PROVISORIOS y deben ser definidos y aprobados por el kinesiólogo revisor.
 */

export type Regla = {
  id: string;
  mensaje: string;
  prioridad: number; // 1 = más importante
  evaluar: (lm: Punto[], lado: Lado) => boolean | null;
};

const IDX = {
  izq: { hombro: 11, codo: 13, cadera: 23, rodilla: 25, tobillo: 27, talon: 29, punta: 31 },
  der: { hombro: 12, codo: 14, cadera: 24, rodilla: 26, tobillo: 28, talon: 30, punta: 32 },
} as const;

const visible = (p?: Punto) => (p?.visibility ?? 0) >= VIS_MIN;

/** Inclinación del tronco respecto de la vertical, en grados. */
function inclinacionTronco(lm: Punto[], lado: Lado): number | null {
  const i = IDX[lado];
  const h = lm[i.hombro];
  const c = lm[i.cadera];
  if (!visible(h) || !visible(c)) return null;
  return (Math.atan2(Math.abs(h.x - c.x), Math.abs(h.y - c.y)) * 180) / Math.PI;
}

function anguloRodilla(lm: Punto[], lado: Lado): number | null {
  const i = IDX[lado];
  const c = lm[i.cadera];
  const r = lm[i.rodilla];
  const t = lm[i.tobillo];
  if (!visible(c) || !visible(r) || !visible(t)) return null;
  return anguloEntrePuntos(c, r, t);
}

/** Cuánto está elevado el talón respecto de la punta del pie, en grados. */
function elevacionTalon(lm: Punto[], lado: Lado): number | null {
  const i = IDX[lado];
  const talon = lm[i.talon];
  const punta = lm[i.punta];
  if (!visible(talon) || !visible(punta)) return null;
  return (
    (Math.atan2(punta.y - talon.y, Math.abs(punta.x - talon.x) || 1e-6) * 180) / Math.PI
  );
}

/** Separación del brazo respecto del tronco (cadera-hombro-codo), en grados. */
function separacionBrazo(lm: Punto[], lado: Lado): number | null {
  const i = IDX[lado];
  const c = lm[i.cadera];
  const h = lm[i.hombro];
  const co = lm[i.codo];
  if (!visible(c) || !visible(h) || !visible(co)) return null;
  return anguloEntrePuntos(c, h, co);
}

const reglasElevacionTalones: Regla[] = [
  {
    id: "rodillas",
    prioridad: 1,
    mensaje: "Mantén las rodillas estiradas mientras subes.",
    evaluar: (lm, lado) => {
      const a = anguloRodilla(lm, lado);
      return a === null ? null : a < 160;
    },
  },
  {
    id: "tronco",
    prioridad: 2,
    mensaje: "Mantén el tronco más vertical, sin inclinarte hacia adelante.",
    evaluar: (lm, lado) => {
      const t = inclinacionTronco(lm, lado);
      return t === null ? null : t > 12;
    },
  },
];

export const reglasPorEjercicio: Record<string, Regla[]> = {
  // Elevación de talones
  "et-03": reglasElevacionTalones,

  // Sentadilla en step
  "et-06": [
    {
      id: "talon",
      prioridad: 1,
      mensaje: "Mantén el talón apoyado en el suelo.",
      evaluar: (lm, lado) => {
        const e = elevacionTalon(lm, lado);
        return e === null ? null : e > 12;
      },
    },
    {
      id: "tronco",
      prioridad: 2,
      mensaje: "Mantén el pecho más erguido, no te inclines tanto hacia adelante.",
      evaluar: (lm, lado) => {
        const t = inclinacionTronco(lm, lado);
        return t === null ? null : t > 35;
      },
    },
  ],

  // Elevación de talón en escalón: mismas reglas que la elevación de talones
  "fp-04": reglasElevacionTalones,

  // Movilidad de codo activa
  "ep-06": [
    {
      id: "codo-pegado",
      prioridad: 1,
      mensaje: "Mantén el codo junto al cuerpo; mueve solo el antebrazo.",
      evaluar: (lm, lado) => {
        const s = separacionBrazo(lm, lado);
        return s === null ? null : s > 35;
      },
    },
  ],

  // Rotación cervical suave
  "cv-02": [
    {
      id: "cabeza-derecha",
      prioridad: 1,
      mensaje: "Gira la cabeza sin inclinarla, como si miraras por sobre tu hombro.",
      evaluar: (lm) => {
        const i = inclinacionCabeza(lm);
        return i === null ? null : Math.abs(i) > 20;
      },
    },
  ],

  // Inclinación lateral de cuello
  "cv-03": [
    {
      id: "hombros-abajo",
      prioridad: 1,
      mensaje: "No subas el hombro: acerca la oreja al hombro, no el hombro a la oreja.",
      evaluar: (lm) => {
        const h = inclinacionHombros(lm);
        return h === null ? null : Math.abs(h) > 10;
      },
    },
  ],
};

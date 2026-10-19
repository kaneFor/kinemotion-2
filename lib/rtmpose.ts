import type { Punto } from "./pose";

/**
 * Núcleo de RTMPose (OpenMMLab, licencia Apache 2.0) para correr en el
 * navegador con ONNX Runtime. Son funciones puras sobre píxeles RGBA, sin
 * depender del DOM, para poder probarlas fuera del navegador.
 *
 * Flujo "top-down" de dos modelos:
 *  1. YOLOX (detector, entrenado en Human-Art) encuentra la caja de la
 *     persona. Solo se usa al inicio o cuando se pierde el seguimiento.
 *  2. RTMPose (variante Halpe26: cuerpo + talón y dedos de cada pie) estima
 *     los 26 puntos dentro de esa caja.
 *
 * El preprocesamiento replica exactamente el `pipeline.json` que acompaña a
 * cada modelo exportado (mmdeploy).
 */

export type Imagen = { data: Uint8ClampedArray | Uint8Array; width: number; height: number };
export type Caja = { x1: number; y1: number; x2: number; y2: number; score: number };
export type Region = { cx: number; cy: number; w: number; h: number };
export type PuntoRTM = { x: number; y: number; score: number };

// --- tamaños de entrada de los modelos ---
export const DET_TAM = 416;
export const POSE_W = 192;
export const POSE_H = 256;
const SIMCC_SPLIT = 2; // las salidas SimCC tienen el doble de resolución que la entrada
const PADDING_CAJA = 1.25;

// Normalización de RTMPose (en orden RGB).
const MEDIA = [123.675, 116.28, 103.53];
const DESV = [58.395, 57.12, 57.375];

/** Lee un canal de la imagen con interpolación bilineal; fuera de la imagen devuelve `fuera`. */
function bilineal(img: Imagen, x: number, y: number, c: number, fuera: number): number {
  if (x < -0.5 || y < -0.5 || x > img.width - 0.5 || y > img.height - 0.5) return fuera;
  const x0 = Math.max(0, Math.min(img.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(img.height - 1, Math.floor(y)));
  const x1 = Math.min(img.width - 1, x0 + 1);
  const y1 = Math.min(img.height - 1, y0 + 1);
  const fx = Math.max(0, Math.min(1, x - x0));
  const fy = Math.max(0, Math.min(1, y - y0));
  const d = img.data;
  const w = img.width;
  const a = d[(y0 * w + x0) * 4 + c];
  const b = d[(y0 * w + x1) * 4 + c];
  const e = d[(y1 * w + x0) * 4 + c];
  const f = d[(y1 * w + x1) * 4 + c];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (e * (1 - fx) + f * fx) * fy;
}

// ---------------------------------------------------------------------------
// Detector (YOLOX)
// ---------------------------------------------------------------------------

/**
 * Redimensiona manteniendo proporción, rellena con gris 114 abajo/derecha y
 * entrega el tensor [1,3,416,416] en orden BGR y sin normalizar.
 */
export function prepararDetector(img: Imagen): { tensor: Float32Array; ratio: number } {
  const ratio = Math.min(DET_TAM / img.height, DET_TAM / img.width);
  const anchoUtil = Math.round(img.width * ratio);
  const altoUtil = Math.round(img.height * ratio);
  const plano = DET_TAM * DET_TAM;
  const tensor = new Float32Array(3 * plano).fill(114);
  for (let dy = 0; dy < altoUtil; dy++) {
    const sy = (dy + 0.5) / ratio - 0.5;
    for (let dx = 0; dx < anchoUtil; dx++) {
      const sx = (dx + 0.5) / ratio - 0.5;
      const i = dy * DET_TAM + dx;
      tensor[i] = bilineal(img, sx, sy, 2, 114); // B
      tensor[plano + i] = bilineal(img, sx, sy, 1, 114); // G
      tensor[2 * plano + i] = bilineal(img, sx, sy, 0, 114); // R
    }
  }
  return { tensor, ratio };
}

/** De la salida `dets` [1,N,5] (x1,y1,x2,y2,score) toma la persona con mayor puntaje. */
export function mejorPersona(dets: Float32Array, ratio: number, umbral = 0.5): Caja | null {
  let mejor: Caja | null = null;
  for (let i = 0; i + 4 < dets.length; i += 5) {
    const score = dets[i + 4];
    if (score < umbral || (mejor && score <= mejor.score)) continue;
    mejor = {
      x1: dets[i] / ratio,
      y1: dets[i + 1] / ratio,
      x2: dets[i + 2] / ratio,
      y2: dets[i + 3] / ratio,
      score,
    };
  }
  return mejor;
}

// ---------------------------------------------------------------------------
// Pose (RTMPose, SimCC)
// ---------------------------------------------------------------------------

/** Caja → región centrada con 25% de margen y la proporción 3:4 del modelo. */
export function regionDeCaja(c: Caja): Region {
  let w = (c.x2 - c.x1) * PADDING_CAJA;
  let h = (c.y2 - c.y1) * PADDING_CAJA;
  const aspecto = POSE_W / POSE_H;
  if (w > h * aspecto) h = w / aspecto;
  else w = h * aspecto;
  return { cx: (c.x1 + c.x2) / 2, cy: (c.y1 + c.y2) / 2, w, h };
}

/** Recorta la región, la lleva a 192×256 y normaliza (RGB). Fuera de la imagen = negro. */
export function prepararPose(img: Imagen, r: Region): Float32Array {
  const plano = POSE_W * POSE_H;
  const tensor = new Float32Array(3 * plano);
  const escX = r.w / POSE_W;
  const escY = r.h / POSE_H;
  for (let dy = 0; dy < POSE_H; dy++) {
    const sy = r.cy + (dy - POSE_H / 2) * escY;
    for (let dx = 0; dx < POSE_W; dx++) {
      const sx = r.cx + (dx - POSE_W / 2) * escX;
      const i = dy * POSE_W + dx;
      for (let c = 0; c < 3; c++) {
        tensor[c * plano + i] = (bilineal(img, sx, sy, c, 0) - MEDIA[c]) / DESV[c];
      }
    }
  }
  return tensor;
}

/** Decodifica SimCC: el máximo de cada eje da la posición; el menor de ambos máximos, la confianza. */
export function decodificarPose(
  simccX: Float32Array,
  simccY: Float32Array,
  numPuntos: number,
  r: Region
): PuntoRTM[] {
  const largoX = simccX.length / numPuntos;
  const largoY = simccY.length / numPuntos;
  const puntos: PuntoRTM[] = [];
  for (let k = 0; k < numPuntos; k++) {
    let ix = 0;
    let mx = -Infinity;
    for (let i = 0; i < largoX; i++) {
      const v = simccX[k * largoX + i];
      if (v > mx) {
        mx = v;
        ix = i;
      }
    }
    let iy = 0;
    let my = -Infinity;
    for (let i = 0; i < largoY; i++) {
      const v = simccY[k * largoY + i];
      if (v > my) {
        my = v;
        iy = i;
      }
    }
    const px = ix / SIMCC_SPLIT;
    const py = iy / SIMCC_SPLIT;
    puntos.push({
      x: r.cx + (px - POSE_W / 2) * (r.w / POSE_W),
      y: r.cy + (py - POSE_H / 2) * (r.h / POSE_H),
      score: Math.max(0, Math.min(mx, my)),
    });
  }
  return puntos;
}

/** Caja que encierra los puntos confiables; sirve para seguir a la persona sin volver a detectar. */
export function cajaDePuntos(puntos: PuntoRTM[], umbral = 0.3): Caja | null {
  const ok = puntos.filter((p) => p.score >= umbral);
  if (ok.length < 6) return null;
  const xs = ok.map((p) => p.x);
  const ys = ok.map((p) => p.y);
  return {
    x1: Math.min(...xs),
    y1: Math.min(...ys),
    x2: Math.max(...xs),
    y2: Math.max(...ys),
    score: ok.reduce((s, p) => s + p.score, 0) / ok.length,
  };
}

// ---------------------------------------------------------------------------
// Conversión al formato que usa el resto de la app (BlazePose, 33 puntos)
// ---------------------------------------------------------------------------

/**
 * Halpe26 → índices de BlazePose, para que reglas, ángulos y dibujo sigan
 * funcionando igual. "Izquierdo" es el del paciente en ambos formatos.
 * Halpe: 0 nariz, 1-2 ojos, 3-4 orejas, 5-6 hombros, 7-8 codos, 9-10
 * muñecas, 11-12 caderas, 13-14 rodillas, 15-16 tobillos, 20-21 dedo gordo,
 * 22-23 dedo chico, 24-25 talones.
 */
const HALPE_A_BLAZEPOSE: [number, number][] = [
  [0, 0], [1, 2], [2, 5], [3, 7], [4, 8],
  [5, 11], [6, 12], [7, 13], [8, 14], [9, 15], [10, 16],
  [11, 23], [12, 24], [13, 25], [14, 26], [15, 27], [16, 28],
  [24, 29], [25, 30], [20, 31], [21, 32],
];

/**
 * La confianza de RTMPose no es una probabilidad: ~0,3 ya es un punto
 * fiable. Se reescala para que ese valor quede en 0,5, el umbral de
 * visibilidad que usa el resto de la app (VIS_MIN).
 */
const ESCALA_CONFIANZA = 0.5 / 0.3;

export function aBlazePose(puntos: PuntoRTM[], ancho: number, alto: number): Punto[] {
  const salida: Punto[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  for (const [h, b] of HALPE_A_BLAZEPOSE) {
    const p = puntos[h];
    if (!p) continue;
    salida[b] = {
      x: p.x / ancho,
      y: p.y / alto,
      visibility: Math.min(1, p.score * ESCALA_CONFIANZA),
    };
  }
  return salida;
}

import { LANDMARKS, VIS_MIN, type Punto } from "./pose";

/**
 * Movimientos del cuello vistos DE FRENTE, con la cabeza y los hombros en
 * el encuadre. Ambos modelos (MediaPipe y RTMPose) entregan nariz, ojos y
 * orejas con los índices de BlazePose.
 *
 * Los dos valores tienen signo (hacia un lado positivo, hacia el otro
 * negativo); la cámara los usa en modo relativo, restando la postura base y
 * tomando el valor absoluto, así cuenta igual hacia la izquierda o hacia la
 * derecha.
 *
 * Los puntos deben venir con el aspecto corregido (`corregirAspecto`).
 * Mediciones APROXIMADAS con una cámara 2D: los umbrales de lib/data.ts son
 * provisorios y deben ser calibrados por el kinesiólogo revisor.
 */

const CARA = { NARIZ: 0, OJO_IZQ: 2, OJO_DER: 5, OREJA_IZQ: 7, OREJA_DER: 8 };

const visible = (p?: Punto) => Boolean(p) && (p!.visibility ?? 0) >= VIS_MIN;

/** Ángulo de la línea a→b respecto de la horizontal, en grados (−90 a 90). */
function inclinacionLinea(a: Punto, b: Punto): number {
  const izq = a.x <= b.x ? a : b;
  const der = a.x <= b.x ? b : a;
  return (Math.atan2(der.y - izq.y, der.x - izq.x) * 180) / Math.PI;
}

function hombros(lm: Punto[]): [Punto, Punto] | null {
  const a = lm[LANDMARKS.HOMBRO_IZQ];
  const b = lm[LANDMARKS.HOMBRO_DER];
  return visible(a) && visible(b) ? [a, b] : null;
}

/** Inclinación de los hombros respecto de la horizontal, en grados. */
export function inclinacionHombros(lm: Punto[]): number | null {
  const h = hombros(lm);
  return h ? inclinacionLinea(h[0], h[1]) : null;
}

/**
 * Inclinación lateral de la cabeza (oreja hacia el hombro): ángulo entre la
 * línea de las orejas (o de los ojos, si no se ven las orejas) y la de los
 * hombros. Se mide contra los hombros y no contra la horizontal para que no
 * influya si la cámara está un poco torcida.
 */
export function inclinacionCabeza(lm: Punto[]): number | null {
  const h = hombros(lm);
  if (!h) return null;
  const pares: [number, number][] = [
    [CARA.OREJA_IZQ, CARA.OREJA_DER],
    [CARA.OJO_IZQ, CARA.OJO_DER],
  ];
  const par = pares.find(([a, b]) => visible(lm[a]) && visible(lm[b]));
  if (!par) return null;
  return inclinacionLinea(lm[par[0]], lm[par[1]]) - inclinacionLinea(h[0], h[1]);
}

// La nariz queda, de media, a ~0,26 anchos de hombros por delante del eje
// de giro del cuello. Con eso, cuánto se corre hacia un lado se traduce en
// grados de giro aproximados.
const RADIO_CABEZA = 0.26;

/**
 * Giro de la cabeza (mirar hacia un lado), en grados aproximados: cuánto se
 * corre la nariz respecto del centro de los hombros. Se usan los hombros y
 * no las orejas porque al girar una oreja queda tapada.
 */
export function rotacionCabeza(lm: Punto[]): number | null {
  const h = hombros(lm);
  const nariz = lm[CARA.NARIZ];
  if (!h || !visible(nariz)) return null;
  const ancho = Math.hypot(h[0].x - h[1].x, h[0].y - h[1].y);
  if (ancho === 0) return null;
  const centro = (h[0].x + h[1].x) / 2;
  const desplazamiento = (nariz.x - centro) / ancho / RADIO_CABEZA;
  return (Math.asin(Math.max(-1, Math.min(1, desplazamiento))) * 180) / Math.PI;
}

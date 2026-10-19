import { LANDMARKS, VIS_MIN, type Punto } from "./pose";

/**
 * Mide cuánto SUBE el cuerpo respecto de la postura base, en % del largo
 * del tronco (hombros → caderas).
 *
 * Se usa en la elevación de talones: al ponerse en puntas con las rodillas
 * estiradas, todo el cuerpo sube 5–8 cm. Hombros y caderas son puntos
 * grandes y centrales que cualquier modelo detecta bien, a diferencia del
 * pie (pequeño, en el borde del cuadro, a menudo tapado). Dividir por el
 * tronco hace que no importe la distancia a la cámara, y funciona tanto de
 * lado como de frente.
 *
 * Los puntos deben venir con el aspecto corregido (`corregirAspecto`).
 */

const PUNTOS_TRONCO = {
  hombros: [LANDMARKS.HOMBRO_IZQ, LANDMARKS.HOMBRO_DER],
  caderas: [LANDMARKS.CADERA_IZQ, LANDMARKS.CADERA_DER],
};

type MedidaTronco = { y: number; largo: number };

/** Altura media del tronco y su largo; null si no se ven al menos un hombro y una cadera. */
export function medirTronco(lm: Punto[]): MedidaTronco | null {
  const visibles = (idx: number[]) =>
    idx.map((i) => lm[i]).filter((p) => p && (p.visibility ?? 0) >= VIS_MIN);
  const hombros = visibles(PUNTOS_TRONCO.hombros);
  const caderas = visibles(PUNTOS_TRONCO.caderas);
  if (hombros.length === 0 || caderas.length === 0) return null;
  const media = (ps: Punto[], k: "x" | "y") => ps.reduce((s, p) => s + p[k], 0) / ps.length;
  const h = { x: media(hombros, "x"), y: media(hombros, "y") };
  const c = { x: media(caderas, "x"), y: media(caderas, "y") };
  const largo = Math.hypot(h.x - c.x, h.y - c.y);
  if (largo === 0) return null;
  return { y: (h.y + c.y) / 2, largo };
}

const CUADROS_QUIETO = 30; // ~1 segundo
const QUIETUD_MAX = 0.03; // oscilación aceptada como "quieto", en fracción del tronco

const mediana = (xs: number[]) => {
  const o = [...xs].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)];
};

/**
 * Toma la postura base (de pie, quieto) y luego entrega cuánto se elevó el
 * cuerpo sobre ella. Misma idea que `Calibrador`, pero guardando también el
 * largo del tronco de referencia.
 */
export class MedidorElevacion {
  private muestras: MedidaTronco[] = [];
  base: MedidaTronco | null = null;

  /** Agrega una medición mientras calibra. Devuelve true en el cuadro en que fija la base. */
  agregar(m: MedidaTronco): boolean {
    if (this.base) return false;
    this.muestras.push(m);
    if (this.muestras.length > CUADROS_QUIETO) this.muestras.shift();
    if (this.muestras.length < CUADROS_QUIETO) return false;
    const ys = this.muestras.map((s) => s.y);
    const largo = mediana(this.muestras.map((s) => s.largo));
    if (Math.max(...ys) - Math.min(...ys) > QUIETUD_MAX * largo) return false;
    this.base = { y: mediana(ys), largo };
    return true;
  }

  /** % del tronco que subió el cuerpo sobre la base (y crece hacia abajo en la imagen). */
  elevacion(m: MedidaTronco): number | null {
    if (!this.base) return null;
    return ((this.base.y - m.y) / this.base.largo) * 100;
  }

  reiniciar() {
    this.muestras = [];
    this.base = null;
  }
}

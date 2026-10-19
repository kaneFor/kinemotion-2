export type Punto = { x: number; y: number; visibility?: number };
export type Lado = "izq" | "der";

/**
 * Calcula el ángulo (en grados) formado en el punto `b` por los segmentos
 * b→a y b→c. Por ejemplo, para el ángulo de rodilla: a=cadera, b=rodilla,
 * c=tobillo.
 *
 * Los puntos deben estar en un espacio con la MISMA escala en x e y (ver
 * `corregirAspecto`); si no, el ángulo sale deformado.
 */
export function anguloEntrePuntos(a: Punto, b: Punto, c: Punto): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cos = Math.min(1, Math.max(-1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * MediaPipe entrega x normalizado por el ANCHO de la imagen e y por el ALTO.
 * En una cámara 4:3 o 16:9 eso estira los ejes de forma distinta y deforma
 * todos los ángulos. Esta función lleva x a la misma escala que y.
 */
export function corregirAspecto(puntos: Punto[], ancho: number, alto: number): Punto[] {
  const aspecto = ancho / alto;
  return puntos.map((p) => ({ ...p, x: p.x * aspecto }));
}

// Índices de landmarks del modelo BlazePose (33 puntos) usados por
// MediaPipe Pose Landmarker.
export const LANDMARKS = {
  CADERA_IZQ: 23,
  CADERA_DER: 24,
  RODILLA_IZQ: 25,
  RODILLA_DER: 26,
  TOBILLO_IZQ: 27,
  TOBILLO_DER: 28,
  PIE_IZQ: 31,
  PIE_DER: 32,
  HOMBRO_IZQ: 11,
  HOMBRO_DER: 12,
  CODO_IZQ: 13,
  CODO_DER: 14,
  MUNECA_IZQ: 15,
  MUNECA_DER: 16,
};

/** Bajo esta confianza un punto se considera tapado o fuera de cuadro. */
export const VIS_MIN = 0.5;

const TRIADAS: Record<"rodilla" | "tobillo" | "codo", Record<Lado, [number, number, number]>> = {
  rodilla: {
    izq: [LANDMARKS.CADERA_IZQ, LANDMARKS.RODILLA_IZQ, LANDMARKS.TOBILLO_IZQ],
    der: [LANDMARKS.CADERA_DER, LANDMARKS.RODILLA_DER, LANDMARKS.TOBILLO_DER],
  },
  // tobillo: ángulo rodilla-tobillo-pie (flexión plantar/dorsal)
  tobillo: {
    izq: [LANDMARKS.RODILLA_IZQ, LANDMARKS.TOBILLO_IZQ, LANDMARKS.PIE_IZQ],
    der: [LANDMARKS.RODILLA_DER, LANDMARKS.TOBILLO_DER, LANDMARKS.PIE_DER],
  },
  codo: {
    izq: [LANDMARKS.HOMBRO_IZQ, LANDMARKS.CODO_IZQ, LANDMARKS.MUNECA_IZQ],
    der: [LANDMARKS.HOMBRO_DER, LANDMARKS.CODO_DER, LANDMARKS.MUNECA_DER],
  },
};

/**
 * Ángulo de la articulación en el lado indicado. Devuelve null si alguno de
 * los tres puntos no se ve con suficiente confianza: es preferible no medir
 * a medir un punto inventado por el modelo.
 */
export function anguloDeArticulacion(
  landmarks: Punto[],
  joint: "rodilla" | "tobillo" | "codo",
  lado: Lado
): number | null {
  const [a, b, c] = TRIADAS[joint][lado].map((i) => landmarks[i]);
  if ([a, b, c].some((p) => !p || (p.visibility ?? 0) < VIS_MIN)) return null;
  return anguloEntrePuntos(a, b, c);
}

/**
 * Elige qué lado del cuerpo medir (el que mira a la cámara) y lo mantiene:
 * solo cambia si el otro lado se ve claramente mejor durante un rato. Sin
 * esto, cuando ambos lados se ven parecido, la medición salta de una pierna
 * a la otra entre cuadros y el ángulo "brinca".
 */
export class SelectorLado {
  private lado: Lado | null = null;
  private cuadrosMejorOtro = 0;

  constructor(
    private joint: "rodilla" | "tobillo" | "codo",
    private margen = 0.3,
    private cuadrosParaCambiar = 20
  ) {}

  private visibilidad(lm: Punto[], lado: Lado) {
    return TRIADAS[this.joint][lado].reduce((s, i) => s + (lm[i]?.visibility ?? 0), 0);
  }

  actualizar(lm: Punto[]): Lado {
    const izq = this.visibilidad(lm, "izq");
    const der = this.visibilidad(lm, "der");
    if (this.lado === null) {
      this.lado = izq >= der ? "izq" : "der";
      return this.lado;
    }
    const actual = this.lado === "izq" ? izq : der;
    const otro = this.lado === "izq" ? der : izq;
    this.cuadrosMejorOtro = otro > actual + this.margen ? this.cuadrosMejorOtro + 1 : 0;
    if (this.cuadrosMejorOtro >= this.cuadrosParaCambiar) {
      this.lado = this.lado === "izq" ? "der" : "izq";
      this.cuadrosMejorOtro = 0;
    }
    return this.lado;
  }

  reiniciar() {
    this.lado = null;
    this.cuadrosMejorOtro = 0;
  }
}

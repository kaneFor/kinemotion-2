/**
 * Contador de repeticiones con histéresis.
 *
 * Una repetición es: salir de la posición de reposo → llegar a la zona
 * objetivo → VOLVER al reposo. Para volver no basta con salir de la zona
 * objetivo: hay que llegar claramente a la posición inicial. Así, quedarse
 * arriba (o abajo) con el temblor natural del modelo nunca suma
 * repeticiones extra.
 */

export type ZonaObjetivo = { min: number; max: number; relativo?: boolean };
export type EventoContador = "inicio" | "repeticion" | null;

const CUADROS_CONFIRMACION = 4; // ~130 ms seguidos para cambiar de fase
const DURACION_MIN_MS = 500; // una repetición más corta es ruido
// En modo relativo, se considera "de vuelta" al bajar de esta fracción del
// mínimo (p. ej. con min 6, volver por debajo de 2,4).
const FRACCION_REPOSO_RELATIVO = 0.4;
// En modo absoluto, margen (en grados) más allá del rango objetivo.
const MARGEN_REPOSO_ABSOLUTO = 12;

export class ContadorReps {
  private fase: "reposo" | "activo" = "reposo";
  private cuadros = 0;
  private inicio = 0;
  // En modo absoluto, de qué lado del rango empieza la persona (p. ej. en
  // una sentadilla parte de pie, con la rodilla por ENCIMA del rango).
  private ladoReposo: "arriba" | "abajo" | null = null;

  constructor(private zona: ZonaObjetivo) {}

  private enZona(v: number) {
    return v >= this.zona.min && v <= this.zona.max;
  }

  private enReposo(v: number) {
    if (this.zona.relativo) return v <= this.zona.min * FRACCION_REPOSO_RELATIVO;
    return this.ladoReposo === "abajo"
      ? v < this.zona.min - MARGEN_REPOSO_ABSOLUTO
      : v > this.zona.max + MARGEN_REPOSO_ABSOLUTO;
  }

  /** Procesa una medición. Devuelve "inicio" al empezar el movimiento y "repeticion" al completarlo. */
  actualizar(v: number, tMs: number): EventoContador {
    if (this.ladoReposo === null && !this.enZona(v)) {
      this.ladoReposo = v < this.zona.min ? "abajo" : "arriba";
    }

    if (this.fase === "reposo") {
      this.cuadros = this.enZona(v) ? this.cuadros + 1 : 0;
      if (this.cuadros >= CUADROS_CONFIRMACION) {
        this.fase = "activo";
        this.cuadros = 0;
        this.inicio = tMs;
        return "inicio";
      }
      return null;
    }

    this.cuadros = this.enReposo(v) ? this.cuadros + 1 : 0;
    if (this.cuadros >= CUADROS_CONFIRMACION) {
      this.fase = "reposo";
      this.cuadros = 0;
      if (tMs - this.inicio >= DURACION_MIN_MS) return "repeticion";
    }
    return null;
  }

  reiniciar() {
    this.fase = "reposo";
    this.cuadros = 0;
    this.ladoReposo = null;
  }
}

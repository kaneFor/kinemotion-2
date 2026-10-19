/**
 * Toma la "postura base" del paciente: el ángulo que tiene quieto antes de
 * empezar. Se usa en los ejercicios medidos en modo relativo (por ejemplo,
 * la elevación de talones), donde lo que importa es cuánto se mueve
 * respecto de su propia postura y no el ángulo absoluto, que varía según la
 * anatomía de cada persona y la altura de la cámara.
 */

const CUADROS_QUIETO = 30; // ~1 segundo a 30 cuadros/s
const VARIACION_MAX = 4; // grados de oscilación aceptados como "quieto"

export class Calibrador {
  private muestras: number[] = [];
  base: number | null = null;

  /** Agrega una medición. Devuelve true en el cuadro en que se fija la base. */
  agregar(angulo: number): boolean {
    if (this.base !== null) return false;
    this.muestras.push(angulo);
    if (this.muestras.length > CUADROS_QUIETO) this.muestras.shift();
    if (this.muestras.length < CUADROS_QUIETO) return false;
    if (Math.max(...this.muestras) - Math.min(...this.muestras) > VARIACION_MAX) return false;
    const orden = [...this.muestras].sort((a, b) => a - b);
    this.base = orden[Math.floor(orden.length / 2)]; // mediana
    return true;
  }

  reiniciar() {
    this.muestras = [];
    this.base = null;
  }
}

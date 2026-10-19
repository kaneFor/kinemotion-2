import type { Punto } from "./pose";

/**
 * Filtro "One Euro" (Casiraghi, Roussel y Vogel, 2012): suaviza mucho cuando
 * el punto está casi quieto (elimina el temblor del modelo) y poco cuando se
 * mueve rápido (no agrega retraso al movimiento real). Es el filtro estándar
 * para seguimiento de pose en tiempo real.
 */

const alpha = (cutoff: number, dt: number) => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
};

class OneEuro {
  private x: number | null = null;
  private dx = 0;

  constructor(
    private minCutoff: number,
    private beta: number,
    private dCutoff = 1
  ) {}

  filtrar(valor: number, dt: number): number {
    if (this.x === null || dt <= 0) {
      this.x = valor;
      return valor;
    }
    const dxCrudo = (valor - this.x) / dt;
    this.dx += alpha(this.dCutoff, dt) * (dxCrudo - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += alpha(cutoff, dt) * (valor - this.x);
    return this.x;
  }
}

/** Aplica un filtro One Euro a cada coordenada de cada punto de la pose. */
export class FiltroPose {
  private filtros: { x: OneEuro; y: OneEuro }[] = [];
  private ultimoT: number | null = null;

  // Valores ajustados para coordenadas normalizadas (0–1) a ~30 cuadros/s.
  constructor(private minCutoff = 1.2, private beta = 4) {}

  filtrar(puntos: Punto[], tMs: number): Punto[] {
    const dt = this.ultimoT === null ? 0 : (tMs - this.ultimoT) / 1000;
    this.ultimoT = tMs;
    return puntos.map((p, i) => {
      const f = (this.filtros[i] ??= {
        x: new OneEuro(this.minCutoff, this.beta),
        y: new OneEuro(this.minCutoff, this.beta),
      });
      return { ...p, x: f.x.filtrar(p.x, dt), y: f.y.filtrar(p.y, dt) };
    });
  }

  /** Olvida el estado (por ejemplo, si la persona salió del encuadre). */
  reiniciar() {
    this.filtros = [];
    this.ultimoT = null;
  }
}

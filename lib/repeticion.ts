import { MAX_MUESTRAS_POR_REP, type MetricasRep } from "@/lib/supervision";

/**
 * Acumula, cuadro a cuadro, lo que pasa durante una repetición, para
 * resumirla en números cuando el contador la cierra. Ese resumen es lo que
 * revisa la supervisión con IA.
 */

const INTERVALO_MUESTRA_MS = 100;
// Al empezar el movimiento se conserva este tramo previo (la bajada o
// preparación), y se descarta el tiempo quieto anterior.
const TRAMO_PREVIO_MS = 2000;

type Muestra = { t: number; angulo: number };

export type BufferRep = {
  muestras: Muestra[];
  cuadros: number;
  cuadrosSinPersona: number;
  desviaciones: Record<string, number>; // cuadros con cada desviación
};

export const nuevoBuffer = (): BufferRep => ({
  muestras: [],
  cuadros: 0,
  cuadrosSinPersona: 0,
  desviaciones: {},
});

export function registrarCuadro(
  b: BufferRep,
  t: number,
  angulo: number | null,
  desviacionesActivas: string[]
) {
  b.cuadros += 1;
  if (angulo === null) {
    b.cuadrosSinPersona += 1;
  } else {
    const ultima = b.muestras[b.muestras.length - 1];
    if (!ultima || t - ultima.t >= INTERVALO_MUESTRA_MS) {
      b.muestras.push({ t, angulo });
    }
  }
  for (const id of desviacionesActivas) {
    b.desviaciones[id] = (b.desviaciones[id] ?? 0) + 1;
  }
}

/** Llamar cuando el contador detecta que empezó el movimiento. */
export function marcarInicio(b: BufferRep, t: number) {
  const desde = t - TRAMO_PREVIO_MS;
  b.muestras = b.muestras.filter((m) => m.t >= desde);
  // Los contadores de cuadros se reinician: el tiempo quieto no cuenta.
  b.cuadros = 0;
  b.cuadrosSinPersona = 0;
  b.desviaciones = {};
}

// Variación menor a esto se considera quietud (ruido del modelo).
const UMBRAL_QUIETO = 4;

/** Quita el tramo quieto del inicio y del final, dejando una muestra de cada uno. */
function recortarQuietud(muestras: Muestra[]): Muestra[] {
  if (muestras.length < 3) return muestras;
  let ini = 0;
  while (ini < muestras.length - 2 && Math.abs(muestras[ini + 1].angulo - muestras[0].angulo) < UMBRAL_QUIETO) ini++;
  const ultima = muestras[muestras.length - 1].angulo;
  let fin = muestras.length - 1;
  while (fin > ini + 1 && Math.abs(muestras[fin - 1].angulo - ultima) < UMBRAL_QUIETO) fin--;
  return muestras.slice(ini, fin + 1);
}

export function cerrarRep(b: BufferRep, n: number): MetricasRep | null {
  const muestras = recortarQuietud(b.muestras);
  const angulos = muestras.map((m) => m.angulo);
  if (angulos.length < 2 || b.cuadros === 0) return null;

  // Reduce la serie si la repetición fue muy larga.
  const paso = Math.ceil(angulos.length / MAX_MUESTRAS_POR_REP);
  const serie = angulos.filter((_, i) => i % paso === 0);

  const desviaciones: Record<string, number> = {};
  for (const [id, c] of Object.entries(b.desviaciones)) {
    desviaciones[id] = Math.min(1, c / b.cuadros);
  }

  return {
    n,
    duracionSeg: (muestras[muestras.length - 1].t - muestras[0].t) / 1000,
    anguloMin: Math.min(...angulos),
    anguloMax: Math.max(...angulos),
    serie,
    desviaciones,
    sinVisibilidad: Math.min(1, b.cuadrosSinPersona / b.cuadros),
  };
}

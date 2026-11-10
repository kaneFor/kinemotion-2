import type { ObjectId } from "mongodb";
import { leerCifrado, leerLesiones } from "@/lib/acceso";
import { descifrar, type CampoCifrado } from "@/lib/crypto";
import { lesiones } from "@/lib/data";
import { getDb } from "@/lib/mongodb";
import {
  cumplimientoSemana,
  diasDeRutina,
  diaVacio,
  hizoAlgo,
  lunesDe,
  sumarDias,
  type CumplimientoSemana,
  type DiaProgreso,
} from "@/lib/progreso";
import { hoyEnChile } from "@/lib/recordatorios";
import { lesionesActivas } from "@/lib/rutina";

/**
 * Indicadores agregados y anonimizados para el administrador (RF16).
 *
 * Solo salen de aquí totales y promedios, nunca datos de una persona. Un
 * grupo con menos de MINIMO_GRUPO pacientes no se muestra, para que un
 * promedio no delate a nadie.
 */

export const MINIMO_GRUPO = 5;
export const SEMANAS = 8;

export type SemanaAgregada = CumplimientoSemana & { pacientes: number };

export type Promedio = { valor: number | null; pacientes: number; respuestas: number };

export type Indicadores = {
  pacientes: number;
  demo: number;
  activosSemana: number;
  semanas: SemanaAgregada[];
  actual: SemanaAgregada;
  encuesta: { utilidad: Promedio; claridad: Promedio; dificultad: Promedio; omitidas: number };
  dolor: { antes: Promedio; despues: Promedio };
  camara: { reps: number; revisadas: number; correctas: number; pacientes: number };
  porLesion: {
    slug: string;
    nombre: string;
    pacientes: number;
    cumplimiento: number | null;
    utilidad: number | null;
  }[];
};

type Paciente = {
  id: ObjectId;
  desde: string;
  diasRutina: number[];
  dias: Map<string, DiaProgreso>;
  lesiones: string[];
  encuestas: { semana: string; utilidad?: number; claridad?: number; dificultad?: number; omitida?: boolean }[];
};

function descifrarJson<T>(campo: unknown): T | null {
  try {
    return JSON.parse(descifrar(campo as CampoCifrado)) as T;
  } catch {
    return null;
  }
}

const redondear = (n: number) => Math.round(n * 10) / 10;

/** Promedio de valores de varios pacientes; null si son menos del mínimo. */
function promedio(valores: { paciente: string; valor: number }[]): Promedio {
  const pacientes = new Set(valores.map((v) => v.paciente)).size;
  const valor =
    pacientes >= MINIMO_GRUPO
      ? redondear(valores.reduce((a, v) => a + v.valor, 0) / valores.length)
      : null;
  return { valor, pacientes, respuestas: valores.length };
}

/** Cumplimiento de un grupo en una semana: sesiones de todos sumadas. */
function semanaDelGrupo(grupo: Paciente[], lunes: string, hoy: string): SemanaAgregada {
  const total: SemanaAgregada = {
    lunes,
    programadas: 0,
    completadas: 0,
    suspendidas: 0,
    porcentaje: null,
    pacientes: 0,
  };
  for (const p of grupo) {
    const s = cumplimientoSemana(p.dias, p.diasRutina, lunes, hoy, p.desde);
    total.suspendidas += s.suspendidas;
    if (s.programadas === 0) continue;
    total.programadas += s.programadas;
    total.completadas += s.completadas;
    total.pacientes++;
  }
  if (total.pacientes >= MINIMO_GRUPO) {
    total.porcentaje = Math.round((total.completadas / total.programadas) * 100);
  }
  return total;
}

export async function calcularIndicadores(incluirDemo: boolean): Promise<Indicadores> {
  const db = await getDb();
  const hoy = hoyEnChile();
  const estaSemana = lunesDe(hoy);
  const lunesLista = Array.from({ length: SEMANAS }, (_, i) => sumarDias(estaSemana, (i - SEMANAS + 1) * 7));
  const desde = lunesLista[0];

  const base = { rol: { $ne: "admin" }, deshabilitadaEn: { $exists: false } };
  const demo = await db.collection("usuarios").countDocuments({ ...base, demo: true });
  const usuarios = await db
    .collection("usuarios")
    .find(incluirDemo ? base : { ...base, demo: { $ne: true } }, {
      projection: { creadoEn: 1, diasRutina: 1, recordatorios: 1 },
    })
    .toArray();
  const ids = usuarios.map((u) => u._id);

  const pacientes = new Map<string, Paciente>(
    usuarios.map((u) => [
      u._id.toString(),
      {
        id: u._id,
        desde: u.creadoEn instanceof Date ? hoyEnChile(u.creadoEn) : desde,
        diasRutina: diasDeRutina({ diasRutina: u.diasRutina, recordatorios: u.recordatorios }),
        dias: new Map(),
        lesiones: [],
        encuestas: [],
      },
    ])
  );

  const [historial, encuestas, perfiles] = await Promise.all([
    db.collection("historial_progreso").find({ usuarioId: { $in: ids }, fecha: { $gte: desde } }).toArray(),
    db.collection("encuestas").find({ usuarioId: { $in: ids }, semana: { $gte: desde } }).toArray(),
    db.collection("perfiles_clinicos").find({ usuarioId: { $in: ids } }).toArray(),
  ]);

  for (const doc of historial) {
    const dia = descifrarJson<DiaProgreso>(doc.datos);
    if (dia) pacientes.get(doc.usuarioId.toString())?.dias.set(doc.fecha, { ...diaVacio(), ...dia });
  }
  for (const doc of encuestas) {
    const e = descifrarJson<Paciente["encuestas"][number]>(doc.datos);
    if (e) pacientes.get(doc.usuarioId.toString())?.encuestas.push({ ...e, semana: doc.semana });
  }
  for (const perfil of perfiles) {
    const p = pacientes.get(perfil.usuarioId.toString());
    if (!p) continue;
    const prescripcion = leerCifrado(perfil.prescripcion);
    p.lesiones = prescripcion
      ? (JSON.parse(prescripcion) as { lesiones: string[] }).lesiones
      : lesionesActivas(leerLesiones(perfil)).map((l) => l.slug);
  }

  const todos = [...pacientes.values()];
  const semanas = lunesLista.map((lunes) => semanaDelGrupo(todos, lunes, hoy));

  const enVentana = (p: Paciente) => [...p.dias].filter(([fecha]) => fecha >= desde && fecha <= hoy);
  const activosSemana = todos.filter((p) =>
    [...p.dias].some(([fecha, d]) => fecha >= estaSemana && fecha <= hoy && hizoAlgo(d))
  ).length;

  const respuestas = todos.flatMap((p) =>
    p.encuestas
      .filter((e) => !e.omitida && e.utilidad)
      .map((e) => ({ paciente: p.id.toString(), ...e }))
  );
  const deEncuesta = (campo: "utilidad" | "claridad" | "dificultad") =>
    promedio(respuestas.map((r) => ({ paciente: r.paciente, valor: r[campo] ?? 0 })));

  const dolor = (momento: "dolorAntes" | "dolorDespues") =>
    promedio(
      todos.flatMap((p) =>
        enVentana(p)
          .filter(([, d]) => d[momento] !== undefined)
          .map(([, d]) => ({ paciente: p.id.toString(), valor: d[momento]! }))
      )
    );

  const camara = { reps: 0, revisadas: 0, correctas: 0, pacientes: 0 };
  for (const p of todos) {
    const series = enVentana(p).flatMap(([, d]) => d.series);
    if (series.length === 0) continue;
    camara.pacientes++;
    for (const s of series) {
      camara.reps += s.reps;
      camara.revisadas += s.revisadas ?? 0;
      camara.correctas += s.correctas ?? 0;
    }
  }
  if (camara.pacientes < MINIMO_GRUPO) Object.assign(camara, { reps: 0, revisadas: 0, correctas: 0 });

  const porLesion = lesiones.map((l) => {
    const grupo = todos.filter((p) => p.lesiones.includes(l.slug));
    const visible = grupo.length >= MINIMO_GRUPO;
    const sumas = lunesLista
      .map((lunes) => semanaDelGrupo(grupo, lunes, hoy))
      .reduce((a, s) => ({ prog: a.prog + s.programadas, comp: a.comp + s.completadas }), { prog: 0, comp: 0 });
    const ids = new Set(grupo.map((p) => p.id.toString()));
    const utilidad = promedio(
      respuestas.filter((r) => ids.has(r.paciente)).map((r) => ({ paciente: r.paciente, valor: r.utilidad ?? 0 }))
    );
    return {
      slug: l.slug,
      nombre: l.nombre,
      pacientes: grupo.length,
      cumplimiento: visible && sumas.prog > 0 ? Math.round((sumas.comp / sumas.prog) * 100) : null,
      utilidad: visible ? utilidad.valor : null,
    };
  });

  return {
    pacientes: todos.length,
    demo,
    activosSemana,
    semanas,
    actual: semanas[semanas.length - 1],
    encuesta: {
      utilidad: deEncuesta("utilidad"),
      claridad: deEncuesta("claridad"),
      dificultad: deEncuesta("dificultad"),
      omitidas: todos.reduce((a, p) => a + p.encuestas.filter((e) => e.omitida).length, 0),
    },
    dolor: { antes: dolor("dolorAntes"), despues: dolor("dolorDespues") },
    camara,
    porLesion,
  };
}

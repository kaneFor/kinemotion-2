import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { obtenerAcceso } from "@/lib/acceso";
import { ejercicios } from "@/lib/data";
import { pistaDeError } from "@/lib/errores";
import { modificarDia } from "@/lib/historial";
import { aplicarEvento, estadoRutina, type EventoProgreso } from "@/lib/progreso";
import { hoyEnChile } from "@/lib/recordatorios";
import { obtenerUsuario } from "@/lib/sesion";

const idEjercicio = z.string().refine((id) => ejercicios.some((e) => e.id === id));
const reps = z.number().int().min(0).max(500);

const Evento = z.discriminatedUnion("accion", [
  z.object({ accion: z.enum(["hecho", "deshacer", "saltar"]), ejercicioId: idEjercicio }),
  z.object({ accion: z.literal("reintentar") }),
  z.object({
    accion: z.literal("dolor"),
    momento: z.enum(["antes", "despues"]),
    valor: z.number().int().min(0).max(10),
  }),
  z.object({
    accion: z.literal("serie"),
    ejercicioId: idEjercicio,
    reps: reps.min(1),
    correctas: reps.optional(),
    revisadas: reps.optional(),
  }),
]);

/** Registra el avance de hoy: ejercicios hechos o saltados, series y dolor. */
export async function POST(req: NextRequest) {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const parsed = Evento.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  }
  const evento = parsed.data as EventoProgreso;

  try {
    const rutina = (await obtenerAcceso(usuario.id)).ejercicios.map((e) => e.id);
    // Desmarcar se permite aunque el ejercicio ya no esté en la rutina.
    if (
      "ejercicioId" in evento &&
      evento.accion !== "deshacer" &&
      !rutina.includes(evento.ejercicioId)
    ) {
      return NextResponse.json({ error: "Ese ejercicio no está en tu rutina." }, { status: 403 });
    }

    const dia = await modificarDia(usuario.id, hoyEnChile(), (d) => ({
      ...aplicarEvento(d, evento),
      totalRutina: rutina.length,
    }));
    return NextResponse.json({ ok: true, estado: estadoRutina(rutina, dia) });
  } catch (err) {
    console.error("Error en /api/progreso:", err);
    const respuesta: { error: string; pista?: string } = {
      error: "No se pudo guardar tu avance. Intenta de nuevo.",
    };
    if (process.env.NODE_ENV !== "production") {
      respuesta.pista = pistaDeError(err);
    }
    return NextResponse.json(respuesta, { status: 500 });
  }
}

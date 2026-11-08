import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { lesiones } from "@/lib/data";
import { obtenerUsuario } from "@/lib/sesion";
import { cifrarLesiones, obtenerAcceso } from "@/lib/acceso";
import { ACCIONES_LESION, cambiarLesiones, type AccionLesion } from "@/lib/rutina";
import { pistaDeError } from "@/lib/errores";

/**
 * Cambia las lesiones de la cuenta: agregar, elegir la principal, terminar o
 * reactivar. Con una prescripción vigente la rutina la define el documento,
 * así que no se permite: hay que quitarla o reemplazarla.
 */
export async function POST(req: NextRequest) {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!lesiones.some((l) => l.slug === body?.lesion)) {
    return NextResponse.json({ error: "Lesión no válida." }, { status: 400 });
  }
  if (!ACCIONES_LESION.includes(body?.accion)) {
    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
  }

  try {
    const acceso = await obtenerAcceso(usuario.id);
    if (acceso.prescripcion) {
      return NextResponse.json(
        { error: "Tu rutina la define tu prescripción. Quítala para elegir tus lesiones." },
        { status: 409 }
      );
    }

    const resultado = cambiarLesiones(
      acceso.lesionesPaciente,
      body.accion as AccionLesion,
      body.lesion
    );
    if ("error" in resultado) {
      return NextResponse.json({ error: resultado.error }, { status: 409 });
    }

    const db = await getDb();
    await db.collection("perfiles_clinicos").updateOne(
      { usuarioId: new ObjectId(usuario.id) },
      {
        $set: { lesiones: cifrarLesiones(resultado.lista), actualizadoEn: new Date() },
        // También se descarta una prescripción ilegible; se puede volver a subir.
        $unset: { lesion: "", prescripcion: "" },
      },
      { upsert: true }
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/lesion:", err);
    const respuesta: { error: string; pista?: string } = {
      error: "No se pudo guardar la lesión. Intenta más tarde.",
    };
    if (process.env.NODE_ENV !== "production") {
      respuesta.pista = pistaDeError(err);
    }
    return NextResponse.json(respuesta, { status: 500 });
  }
}

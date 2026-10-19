import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { cifrar } from "@/lib/crypto";
import { lesiones } from "@/lib/data";
import { obtenerUsuario } from "@/lib/sesion";
import { obtenerAcceso } from "@/lib/acceso";
import { pistaDeError } from "@/lib/errores";

/**
 * Vuelve a guardar la lesión del registro. Solo se permite cuando el
 * perfil no tiene una lesión legible (por ejemplo, si se cifró con una
 * ENCRYPTION_KEY anterior): así no sirve para saltarse la restricción.
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

  try {
    const acceso = await obtenerAcceso(usuario.id);
    if (acceso.lesionRegistro) {
      return NextResponse.json(
        { error: "Tu lesión ya está registrada." },
        { status: 409 }
      );
    }

    const db = await getDb();
    await db.collection("perfiles_clinicos").updateOne(
      { usuarioId: new ObjectId(usuario.id) },
      {
        $set: { lesion: cifrar(String(body.lesion)), actualizadoEn: new Date() },
        // Una prescripción ilegible también se descarta; se puede volver a subir.
        ...(acceso.prescripcion ? {} : { $unset: { prescripcion: "" } }),
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

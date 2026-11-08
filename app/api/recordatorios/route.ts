import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { MODOS_RECORDATORIO } from "@/lib/recordatorios";
import { obtenerUsuario } from "@/lib/sesion";

const Preferencias = z.object({
  modo: z.enum(MODOS_RECORDATORIO),
  dias: z.array(z.number().int().min(0).max(6)).max(7),
});

export async function POST(req: NextRequest) {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const parsed = Preferencias.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Preferencias no válidas." }, { status: 400 });
  }
  const { modo, dias } = parsed.data;

  if (modo !== "apagado" && !usuario.correoVerificado) {
    return NextResponse.json(
      { error: "Confirma tu correo para activar los recordatorios." },
      { status: 403 }
    );
  }
  if (modo === "personalizado" && dias.length === 0) {
    return NextResponse.json({ error: "Elige al menos un día." }, { status: 400 });
  }

  try {
    const db = await getDb();
    await db
      .collection("usuarios")
      .updateOne(
        { _id: new ObjectId(usuario.id) },
        { $set: { recordatorios: { modo, dias: [...new Set(dias)] } } }
      );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/recordatorios:", err);
    return NextResponse.json(
      { error: "No se pudieron guardar tus recordatorios. Intenta más tarde." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { getDb } from "@/lib/mongodb";
import { obtenerUsuario } from "@/lib/sesion";

const Dias = z.object({
  dias: z.array(z.number().int().min(0).max(6)).min(1).max(7),
});

/** Días de la semana en que el paciente debe hacer su rutina. */
export async function POST(req: NextRequest) {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const parsed = Dias.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Elige al menos un día." }, { status: 400 });
  }

  try {
    const db = await getDb();
    await db
      .collection("usuarios")
      .updateOne(
        { _id: new ObjectId(usuario.id) },
        { $set: { diasRutina: [...new Set(parsed.data.dias)].sort() } }
      );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/cuenta/dias:", err);
    return NextResponse.json(
      { error: "No se pudieron guardar tus días. Intenta más tarde." },
      { status: 500 }
    );
  }
}

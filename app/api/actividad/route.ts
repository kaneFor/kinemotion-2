import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { hoyEnChile } from "@/lib/recordatorios";
import { obtenerUsuario } from "@/lib/sesion";

/** Registra que el paciente abrió su rutina hoy, para los recordatorios. */
export async function POST() {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  try {
    const db = await getDb();
    await db
      .collection("usuarios")
      .updateOne({ _id: new ObjectId(usuario.id) }, { $set: { ultimoDiaActivo: hoyEnChile() } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/actividad:", err);
    return NextResponse.json({ error: "No se pudo registrar." }, { status: 500 });
  }
}

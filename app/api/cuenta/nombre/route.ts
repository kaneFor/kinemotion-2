import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { obtenerUsuario } from "@/lib/sesion";

const MAX_NOMBRE = 100;

export async function POST(req: NextRequest) {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim().replace(/\s+/g, " ") : "";
  if (!nombre || nombre.length > MAX_NOMBRE) {
    return NextResponse.json(
      { error: `Escribe tu nombre (máximo ${MAX_NOMBRE} caracteres).` },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    await db
      .collection("usuarios")
      .updateOne({ _id: new ObjectId(usuario.id) }, { $set: { nombre } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/cuenta/nombre:", err);
    return NextResponse.json(
      { error: "No se pudo guardar tu nombre. Intenta más tarde." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { usuarioDeTokenBaja } from "@/lib/recordatorios";

/**
 * Baja sin iniciar sesión. Recibe el token en la URL porque así lo envían los
 * clientes de correo en su botón de baja con un clic (List-Unsubscribe-Post).
 */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";

  try {
    const usuarioId = usuarioDeTokenBaja(token);
    if (!usuarioId) {
      return NextResponse.json({ error: "Enlace no válido." }, { status: 400 });
    }
    const db = await getDb();
    await db
      .collection("usuarios")
      .updateOne({ _id: new ObjectId(usuarioId) }, { $set: { "recordatorios.modo": "apagado" } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/recordatorios/baja:", err);
    return NextResponse.json(
      { error: "No se pudo completar la baja. Intenta más tarde." },
      { status: 500 }
    );
  }
}

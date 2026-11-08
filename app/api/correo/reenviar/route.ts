import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { obtenerUsuario } from "@/lib/sesion";
import { enviarConfirmacion, limiteDeEnvios } from "@/lib/verificacion";

export async function POST() {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }
  if (usuario.correoVerificado) {
    return NextResponse.json({ error: "Tu correo ya está confirmado." }, { status: 409 });
  }

  try {
    const _id = new ObjectId(usuario.id);
    const limite = await limiteDeEnvios(_id);
    if (limite) {
      return NextResponse.json({ error: limite }, { status: 429 });
    }
    await enviarConfirmacion({ _id, nombre: usuario.nombre, correo: usuario.correo });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/correo/reenviar:", err);
    return NextResponse.json(
      { error: "No se pudo enviar el correo. Intenta más tarde." },
      { status: 500 }
    );
  }
}

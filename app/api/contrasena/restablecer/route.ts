import { NextRequest, NextResponse, after } from "next/server";
import { avisarContrasenaCambiada, LARGO_MINIMO, restablecerContrasena } from "@/lib/contrasena";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (typeof body?.token !== "string" || !body.token) {
    return NextResponse.json({ error: "Enlace no válido." }, { status: 400 });
  }
  if (typeof body?.password !== "string" || body.password.length < LARGO_MINIMO) {
    return NextResponse.json(
      { error: `La contraseña debe tener al menos ${LARGO_MINIMO} caracteres.` },
      { status: 400 }
    );
  }

  try {
    const usuario = await restablecerContrasena(body.token, body.password);
    if (!usuario) {
      return NextResponse.json(
        { error: "El enlace no es válido o ya venció. Pide uno nuevo." },
        { status: 410 }
      );
    }
    after(() =>
      avisarContrasenaCambiada(usuario.nombre, usuario.correo).catch((err) =>
        console.error("Contraseña cambiada, pero falló el aviso:", err)
      )
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/contrasena/restablecer:", err);
    return NextResponse.json(
      { error: "No se pudo cambiar la contraseña. Intenta más tarde." },
      { status: 500 }
    );
  }
}

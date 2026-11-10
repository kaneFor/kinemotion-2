import { NextRequest, NextResponse, after } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { avisarContrasenaCambiada, cambiarContrasena, LARGO_MINIMO } from "@/lib/contrasena";
import { getDb } from "@/lib/mongodb";
import { cerrarOtrasSesiones, obtenerUsuario } from "@/lib/sesion";

/** Cambio de contraseña con la sesión iniciada; cierra las demás sesiones. */
export async function POST(req: NextRequest) {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.actual !== "string" || !body.actual) {
    return NextResponse.json({ error: "Ingresa tu contraseña actual." }, { status: 400 });
  }
  if (typeof body?.nueva !== "string" || body.nueva.length < LARGO_MINIMO) {
    return NextResponse.json(
      { error: `La contraseña nueva debe tener al menos ${LARGO_MINIMO} caracteres.` },
      { status: 400 }
    );
  }

  try {
    const guardado = await (await getDb())
      .collection("usuarios")
      .findOne({ _id: new ObjectId(usuario.id) }, { projection: { passwordHash: 1 } });
    if (!guardado || !(await bcrypt.compare(body.actual, guardado.passwordHash))) {
      return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 403 });
    }

    await cambiarContrasena(usuario.id, body.nueva);
    await cerrarOtrasSesiones(usuario.id);
    after(() =>
      avisarContrasenaCambiada(usuario.nombre, usuario.correo).catch((err) =>
        console.error("Contraseña cambiada, pero falló el aviso:", err)
      )
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error en /api/cuenta/contrasena:", err);
    return NextResponse.json(
      { error: "No se pudo cambiar la contraseña. Intenta más tarde." },
      { status: 500 }
    );
  }
}

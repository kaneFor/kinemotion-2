import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { avisarCorreoCambiado } from "@/lib/cuenta";
import { correoPuedeRecibir } from "@/lib/correo";
import { getDb } from "@/lib/mongodb";
import { obtenerUsuario } from "@/lib/sesion";
import { enviarConfirmacion, limiteDeEnvios } from "@/lib/verificacion";

/**
 * Cambia el correo. El nuevo queda sin confirmar, así que los recordatorios
 * se pausan solos hasta que el paciente abra el enlace. Las confirmaciones
 * pendientes del correo anterior dejan de servir porque no coinciden con el
 * correo de la cuenta, y siguen contando para el límite de envíos.
 */
export async function POST(req: NextRequest) {
  const usuario = await obtenerUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const correo = typeof body?.correo === "string" ? body.correo.trim().toLowerCase() : "";
  if (typeof body?.password !== "string" || !body.password) {
    return NextResponse.json({ error: "Ingresa tu contraseña." }, { status: 400 });
  }
  if (correo === usuario.correo.toLowerCase()) {
    return NextResponse.json({ error: "Ese ya es el correo de tu cuenta." }, { status: 400 });
  }
  if (!(await correoPuedeRecibir(correo))) {
    return NextResponse.json(
      { error: "Ese correo no parece válido. Revisa que esté bien escrito." },
      { status: 400 }
    );
  }

  try {
    const _id = new ObjectId(usuario.id);
    const usuarios = (await getDb()).collection("usuarios");

    const guardado = await usuarios.findOne({ _id }, { projection: { passwordHash: 1 } });
    if (!guardado || !(await bcrypt.compare(body.password, guardado.passwordHash))) {
      return NextResponse.json({ error: "La contraseña no es correcta." }, { status: 403 });
    }
    if (await usuarios.findOne({ correo })) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese correo." }, { status: 409 });
    }
    const limite = await limiteDeEnvios(_id);
    if (limite) {
      return NextResponse.json({ error: limite }, { status: 429 });
    }

    await usuarios.updateOne({ _id }, { $set: { correo }, $unset: { correoVerificadoEn: "" } });

    let enviado = true;
    try {
      await enviarConfirmacion({ _id, nombre: usuario.nombre, correo });
    } catch (err) {
      enviado = false;
      console.error("Correo cambiado, pero falló el enlace de confirmación:", err);
    }
    if (usuario.correoVerificado) {
      await avisarCorreoCambiado(usuario.nombre, usuario.correo, correo).catch((err) =>
        console.error("No se pudo avisar al correo anterior:", err)
      );
    }
    return NextResponse.json({ ok: true, enviado });
  } catch (err) {
    console.error("Error en /api/cuenta/correo:", err);
    return NextResponse.json(
      { error: "No se pudo cambiar el correo. Intenta más tarde." },
      { status: 500 }
    );
  }
}

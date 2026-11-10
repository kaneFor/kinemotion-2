import crypto from "crypto";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { enviarCorreo, escaparHtml, urlApp } from "@/lib/correo";

/**
 * Recuperación de contraseña. Como en las sesiones, en la base (colección
 * `recuperaciones_contrasena`) solo se guarda el hash SHA-256 del token.
 */

const DURACION_MS = 60 * 60 * 1000;
const MAX_POR_HORA = 3;
export const LARGO_MINIMO = 8;

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

/**
 * Envía el enlace si el correo es de una cuenta y no superó el límite. No
 * informa nada a quien lo pidió: la respuesta debe ser la misma exista o
 * no la cuenta.
 */
export async function pedirRecuperacion(correoEscrito: string): Promise<void> {
  const db = await getDb();
  const correo = correoEscrito.trim();
  const usuario = await db
    .collection("usuarios")
    .findOne({ correo: { $in: [correo.toLowerCase(), correo] } }, { projection: { nombre: 1, correo: 1 } });
  if (!usuario) return;

  const recuperaciones = db.collection("recuperaciones_contrasena");
  const ahora = Date.now();
  const token = crypto.randomBytes(32).toString("hex");
  // Se registra antes de contar: si llegan varios pedidos a la vez, cada
  // uno ve a los demás y ninguno supera el límite.
  const { insertedId } = await recuperaciones.insertOne({
    tokenHash: hashToken(token),
    usuarioId: usuario._id,
    expiraEn: new Date(ahora + DURACION_MS),
    creadoEn: new Date(ahora),
  });
  const recientes = await recuperaciones.countDocuments({
    usuarioId: usuario._id,
    creadoEn: { $gt: new Date(ahora - DURACION_MS) },
  });
  if (recientes > MAX_POR_HORA) {
    await recuperaciones.deleteOne({ _id: insertedId });
    return;
  }

  const enlace = `${urlApp()}/restablecer?token=${token}`;
  await enviarCorreo({
    para: usuario.correo,
    asunto: "Restablece tu contraseña de KineMotion",
    texto:
      `Hola ${usuario.nombre}:\n\n` +
      `Para elegir una contraseña nueva, abre este enlace:\n${enlace}\n\n` +
      "El enlace dura 1 hora y sirve una sola vez. Si no lo pediste, ignora este mensaje: tu contraseña no cambiará.",
    html:
      `<p>Hola ${escaparHtml(usuario.nombre)}:</p>` +
      `<p><a href="${enlace}">Elegir una contraseña nueva</a></p>` +
      "<p>El enlace dura 1 hora y sirve una sola vez. Si no lo pediste, ignora este mensaje: tu contraseña no cambiará.</p>",
  });
}

/**
 * Cambia la contraseña con un enlace válido y cierra todas las sesiones de
 * la cuenta. Devuelve los datos para avisar por correo, o null si el
 * enlace no sirve.
 */
export async function restablecerContrasena(
  token: string,
  nueva: string
): Promise<{ nombre: string; correo: string } | null> {
  const db = await getDb();
  const recuperaciones = db.collection("recuperaciones_contrasena");
  // Se borra al leerlo: si dos pedidos usan el mismo enlace, solo uno gana.
  const registro = await recuperaciones.findOneAndDelete({
    tokenHash: hashToken(token),
    expiraEn: { $gt: new Date() },
  });
  if (!registro) return null;

  const usuario = await db
    .collection("usuarios")
    .findOneAndUpdate(
      { _id: registro.usuarioId },
      { $set: { passwordHash: await bcrypt.hash(nueva, 12) } },
      { projection: { nombre: 1, correo: 1 } }
    );
  if (!usuario) return null;

  await recuperaciones.deleteMany({ usuarioId: registro.usuarioId });
  await db.collection("sesiones").deleteMany({ usuarioId: registro.usuarioId });
  return { nombre: usuario.nombre, correo: usuario.correo };
}

export async function cambiarContrasena(usuarioId: string, nueva: string): Promise<void> {
  await (await getDb())
    .collection("usuarios")
    .updateOne({ _id: new ObjectId(usuarioId) }, { $set: { passwordHash: await bcrypt.hash(nueva, 12) } });
}

export function avisarContrasenaCambiada(nombre: string, correo: string) {
  return enviarCorreo({
    para: correo,
    asunto: "Tu contraseña de KineMotion cambió",
    texto:
      `Hola ${nombre}:\n\n` +
      "La contraseña de tu cuenta de KineMotion acaba de cambiar.\n\n" +
      `Si no fuiste tú, restablécela ahora en ${urlApp()}/olvide-contrasena y responde a este mensaje para avisarnos.`,
    html:
      `<p>Hola ${escaparHtml(nombre)}:</p>` +
      "<p>La contraseña de tu cuenta de KineMotion acaba de cambiar.</p>" +
      `<p>Si no fuiste tú, <a href="${urlApp()}/olvide-contrasena">restablécela ahora</a> y responde a este mensaje para avisarnos.</p>`,
  });
}

export async function limpiarRecuperacionesVencidas(): Promise<void> {
  await (await getDb())
    .collection("recuperaciones_contrasena")
    .deleteMany({ expiraEn: { $lte: new Date() } });
}

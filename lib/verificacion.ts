import crypto from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { botonCorreo, enviarCorreo, escaparHtml, primerNombre, urlApp } from "@/lib/correo";

/**
 * Confirmación del correo. Como en las sesiones, en la base (colección
 * `verificaciones_correo`) solo se guarda el hash SHA-256 del token.
 */

const DURACION_MS = 24 * 60 * 60 * 1000;
const ESPERA_ENTRE_ENVIOS_MS = 60 * 1000;
const MAX_ENVIOS_POR_DIA = 5;

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export async function enviarConfirmacion(
  usuario: { _id: ObjectId; nombre: string; correo: string }
): Promise<void> {
  const token = crypto.randomBytes(32).toString("hex");
  const ahora = Date.now();

  const db = await getDb();
  await db.collection("verificaciones_correo").insertOne({
    tokenHash: hashToken(token),
    usuarioId: usuario._id,
    correo: usuario.correo,
    expiraEn: new Date(ahora + DURACION_MS),
    creadoEn: new Date(ahora),
  });

  const enlace = `${urlApp()}/verificar?token=${token}`;
  const nombre = primerNombre(usuario.nombre);
  const bienvenida = "¡Estamos felices de acompañarte en este camino hacia tu bienestar! 💙";
  const activar =
    "Para activar tus recordatorios de KineMotion y comenzar a recibir recordatorios que te ayudarán a mantener tu rutina, solo necesitas confirmar tu correo electrónico.";
  const cierre =
    "¡Gracias por confiar en KineMotion! Cada pequeño paso cuenta y queremos acompañarte en cada uno de ellos. 🌿";
  await enviarCorreo({
    para: usuario.correo,
    asunto: "Confirma tu correo en KineMotion",
    texto:
      `¡Hola, ${nombre}!\n\n${bienvenida}\n\n${activar}\n\n` +
      `Confirmar mi correo:\n${enlace}\n\n` +
      "Este enlace estará disponible durante 24 horas.\n\n" +
      `${cierre}\n\n¡Tu bienestar comienza hoy!\n\n` +
      "Si no creaste esta cuenta, ignora este mensaje.",
    html:
      `<p>¡Hola, ${escaparHtml(nombre)}!</p>` +
      `<p>${bienvenida}</p>` +
      `<p>${activar}</p>` +
      botonCorreo(enlace, "Confirmar mi correo") +
      "<p>Este enlace estará disponible durante 24 horas.</p>" +
      `<p>${cierre}</p>` +
      "<p><strong>¡Tu bienestar comienza hoy!</strong></p>" +
      '<p style="font-size:12px;color:#666">Si no creaste esta cuenta, ignora este mensaje.</p>',
  });
}

/** Mensaje de espera si el usuario ya pidió demasiados correos. */
export async function limiteDeEnvios(usuarioId: ObjectId): Promise<string | null> {
  const ahora = Date.now();
  const verificaciones = (await getDb()).collection("verificaciones_correo");

  const reciente = await verificaciones.findOne({
    usuarioId,
    creadoEn: { $gt: new Date(ahora - ESPERA_ENTRE_ENVIOS_MS) },
  });
  if (reciente) return "Espera un minuto antes de pedir otro correo.";

  const delDia = await verificaciones.countDocuments({
    usuarioId,
    creadoEn: { $gt: new Date(ahora - DURACION_MS) },
  });
  return delDia >= MAX_ENVIOS_POR_DIA
    ? "Ya pediste varios correos hoy. Inténtalo de nuevo mañana."
    : null;
}

/** Marca el correo como confirmado. Devuelve false si el enlace no sirve. */
export async function confirmarCorreo(token: string): Promise<boolean> {
  const db = await getDb();
  const verificaciones = db.collection("verificaciones_correo");

  const registro = await verificaciones.findOne({
    tokenHash: hashToken(token),
    expiraEn: { $gt: new Date() },
  });
  if (!registro) return false;

  const r = await db.collection("usuarios").updateOne(
    { _id: registro.usuarioId, correo: registro.correo },
    { $set: { correoVerificadoEn: new Date() } }
  );
  if (r.matchedCount === 0) {
    // Enlace de un correo anterior: no debe invalidar el del correo actual.
    await verificaciones.deleteOne({ _id: registro._id });
    return false;
  }
  await verificaciones.deleteMany({ usuarioId: registro.usuarioId });
  return true;
}

export async function limpiarVerificacionesVencidas(): Promise<void> {
  await (await getDb())
    .collection("verificaciones_correo")
    .deleteMany({ expiraEn: { $lte: new Date() } });
}

import crypto from "crypto";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { enviarCorreo, escaparHtml, urlApp } from "@/lib/correo";

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
  await enviarCorreo({
    para: usuario.correo,
    asunto: "Confirma tu correo en KineMotion",
    texto:
      `Hola ${usuario.nombre}:\n\n` +
      `Confirma tu correo para activar los recordatorios de KineMotion:\n${enlace}\n\n` +
      "El enlace dura 24 horas. Si no creaste esta cuenta, ignora este mensaje.",
    html:
      `<p>Hola ${escaparHtml(usuario.nombre)}:</p>` +
      "<p>Confirma tu correo para activar los recordatorios de KineMotion.</p>" +
      `<p><a href="${enlace}">Confirmar mi correo</a></p>` +
      "<p>El enlace dura 24 horas. Si no creaste esta cuenta, ignora este mensaje.</p>",
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
  await verificaciones.deleteMany({ usuarioId: registro.usuarioId });
  return r.matchedCount === 1;
}

export async function limpiarVerificacionesVencidas(): Promise<void> {
  await (await getDb())
    .collection("verificaciones_correo")
    .deleteMany({ expiraEn: { $lte: new Date() } });
}

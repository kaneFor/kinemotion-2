import crypto from "crypto";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

/**
 * Sesiones con token opaco guardado en una cookie httpOnly.
 *
 * En la base de datos (colección `sesiones`) solo se guarda el hash SHA-256
 * del token: si alguien lee la base, no puede reutilizar las sesiones.
 * Cerrar sesión borra el documento, así el token queda inválido de verdad
 * aunque alguien haya copiado la cookie.
 */

const COOKIE = "km_sesion";
const DURACION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export type UsuarioSesion = {
  id: string;
  nombre: string;
  correo: string;
  correoVerificado: boolean;
  /** Administrador de contenido: entra a /admin y no tiene rutina. */
  admin: boolean;
};

const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export async function crearSesion(usuarioId: ObjectId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiraEn = new Date(Date.now() + DURACION_MS);

  const db = await getDb();
  await db.collection("sesiones").insertOne({
    tokenHash: hashToken(token),
    usuarioId,
    expiraEn,
    creadoEn: new Date(),
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiraEn,
  });
}

/** Usuario de la sesión actual, o null si no hay sesión válida. */
export async function obtenerUsuario(): Promise<UsuarioSesion | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  try {
    const db = await getDb();
    const sesion = await db.collection("sesiones").findOne({
      tokenHash: hashToken(token),
      expiraEn: { $gt: new Date() },
    });
    if (!sesion) return null;

    const usuario = await db
      .collection("usuarios")
      .findOne({ _id: sesion.usuarioId }, { projection: { passwordHash: 0 } });
    // Una cuenta deshabilitada por el administrador no tiene sesión.
    if (!usuario || usuario.deshabilitadaEn) return null;

    return {
      id: usuario._id.toString(),
      nombre: usuario.nombre,
      correo: usuario.correo,
      correoVerificado: Boolean(usuario.correoVerificadoEn),
      admin: usuario.rol === "admin",
    };
  } catch (err) {
    // Sin base de datos no hay sesión, pero las páginas públicas siguen
    // funcionando.
    console.error("Error leyendo la sesión:", err);
    return null;
  }
}

/** Usuario de la sesión si es administrador, o null. */
export async function obtenerAdmin(): Promise<UsuarioSesion | null> {
  const usuario = await obtenerUsuario();
  return usuario?.admin ? usuario : null;
}

/** Cierra todas las sesiones de la cuenta salvo la de este navegador. */
export async function cerrarOtrasSesiones(usuarioId: string) {
  const token = (await cookies()).get(COOKIE)?.value;
  const db = await getDb();
  await db.collection("sesiones").deleteMany({
    usuarioId: new ObjectId(usuarioId),
    ...(token ? { tokenHash: { $ne: hashToken(token) } } : {}),
  });
}

export async function cerrarSesion() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  // La cookie se borra primero, así el navegador sale de la sesión aunque
  // falle la base de datos.
  cookieStore.delete(COOKIE);
  if (token) {
    const db = await getDb();
    await db.collection("sesiones").deleteOne({ tokenHash: hashToken(token) });
  }
}

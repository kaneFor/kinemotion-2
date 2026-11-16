import dns from "node:dns/promises";
import nodemailer from "nodemailer";
import { leerEnv } from "@/lib/env";

/**
 * Envío por Gmail con contraseña de aplicación (GMAIL_USUARIO y
 * GMAIL_CLAVE_APP). Los correos nunca mencionan la lesión ni otros datos
 * clínicos: esos datos viven cifrados y un correo los dejaría a la vista.
 */

export const correoConfigurado = () =>
  Boolean(leerEnv("GMAIL_USUARIO") && leerEnv("GMAIL_CLAVE_APP"));

/** Dirección pública para los enlaces de los correos. */
export function urlApp(): string {
  const propia = leerEnv("APP_URL");
  if (propia) return propia.replace(/\/$/, "");
  const vercel = leerEnv("VERCEL_PROJECT_PRODUCTION_URL");
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

export const escaparHtml = (texto: string) =>
  texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Botón para el HTML de los correos (estilos en línea: los clientes de correo ignoran las hojas de estilo). */
export const botonCorreo = (href: string, texto: string) =>
  `<p style="margin:24px 0"><a href="${href}" style="background:#1f5f52;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:4px;font-weight:600;display:inline-block">${escaparHtml(texto)}</a></p>`;

export const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0] || nombre;

export type Mensaje = {
  para: string;
  asunto: string;
  texto: string;
  html: string;
  /** URL de baja con un clic, para el botón que muestran los clientes de correo. */
  baja?: string;
};

export async function enviarCorreo(mensaje: Mensaje): Promise<void> {
  if (!correoConfigurado()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[correo sin configurar] ${mensaje.asunto}\n${mensaje.texto}`);
      return;
    }
    throw new Error("Faltan GMAIL_USUARIO o GMAIL_CLAVE_APP.");
  }

  const user = leerEnv("GMAIL_USUARIO");
  const pass = leerEnv("GMAIL_CLAVE_APP")?.replace(/\s/g, "");
  const transporte = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporte.sendMail({
    from: `KineMotion <${user}>`,
    to: mensaje.para,
    subject: mensaje.asunto,
    text: mensaje.texto,
    html: mensaje.html,
    ...(mensaje.baja
      ? {
          headers: {
            "List-Unsubscribe": `<${mensaje.baja}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }
      : {}),
  });
}

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DOMINIO_INEXISTENTE = new Set(["ENOTFOUND", "ENODATA"]);

/**
 * Descarta formatos inválidos y dominios que no pueden recibir correo, como
 * `gmial.con`. No demuestra que la casilla exista: eso lo prueba el enlace de
 * confirmación. Si el DNS falla por otra causa se deja pasar, para no
 * rechazar registros válidos por un problema pasajero.
 */
export async function correoPuedeRecibir(correo: string): Promise<boolean> {
  if (!FORMATO_CORREO.test(correo) || correo.length > 254) return false;
  const dominio = correo.split("@")[1];
  const resolver = new dns.Resolver({ timeout: 2500, tries: 2 });

  try {
    const mx = await resolver.resolveMx(dominio);
    return mx.some((r) => r.exchange !== "" && r.exchange !== ".");
  } catch (err) {
    if (!DOMINIO_INEXISTENTE.has((err as NodeJS.ErrnoException).code ?? "")) return true;
  }

  // Sin registros MX, el correo se entrega a la dirección del propio dominio.
  try {
    return (await resolver.resolve4(dominio)).length > 0;
  } catch (err) {
    return !DOMINIO_INEXISTENTE.has((err as NodeJS.ErrnoException).code ?? "");
  }
}

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { obtenerAcceso } from "@/lib/acceso";
import { enviarCorreo, escaparHtml, urlApp } from "@/lib/correo";
import { leerEnv } from "@/lib/env";
import { leerDia } from "@/lib/historial";
import { getDb } from "@/lib/mongodb";
import { estadoRutina } from "@/lib/progreso";
import { hoyEnChile, tocaRecordatorio, tokenBaja, type Recordatorios } from "@/lib/recordatorios";
import { limpiarRecuperacionesVencidas } from "@/lib/contrasena";
import { limpiarVerificacionesVencidas } from "@/lib/verificacion";

// Una cuenta normal de Gmail admite 500 mensajes al día; se deja margen para
// los correos de confirmación.
const MAX_POR_EJECUCION = 400;

function autorizado(req: NextRequest): boolean {
  const secreto = leerEnv("CRON_SECRET");
  if (!secreto) return false;
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const recibido = Buffer.from(req.headers.get("authorization") ?? "");
  return esperado.length === recibido.length && crypto.timingSafeEqual(esperado, recibido);
}

/** Lo llama Vercel Cron una vez al día (ver vercel.json). */
export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const hoy = hoyEnChile();
  const usuarios = (await getDb()).collection("usuarios");
  const candidatos = await usuarios
    .find(
      {
        correoVerificadoEn: { $exists: true },
        "recordatorios.modo": { $in: ["personalizado", "inactividad"] },
      },
      {
        projection: {
          nombre: 1,
          correo: 1,
          recordatorios: 1,
          diasRutina: 1,
          ultimoRecordatorio: 1,
        },
      }
    )
    .toArray();

  let enviados = 0;
  let fallidos = 0;

  for (const usuario of candidatos) {
    if (enviados >= MAX_POR_EJECUCION) break;
    const estado = {
      recordatorios: usuario.recordatorios as Recordatorios,
      diasRutina: usuario.diasRutina as number[] | undefined,
      ultimoRecordatorio: usuario.ultimoRecordatorio as string | undefined,
    };
    if (!tocaRecordatorio(estado, hoy)) continue;

    try {
      // Quien terminó todas sus lesiones ya no tiene nada que recordar, y
      // quien completó la rutina de hoy tampoco.
      const id = usuario._id.toString();
      const { ejercicios } = await obtenerAcceso(id);
      if (ejercicios.length === 0) continue;
      const dia = await leerDia(id, hoy);
      if (dia.suspendido) continue;
      const hoyRutina = estadoRutina(
        ejercicios.map((e) => e.id),
        dia
      );
      if (hoyRutina.completa) continue;

      // Vercel puede repetir una ejecución: se reserva el envío de hoy antes
      // de mandarlo, y solo una de las dos gana.
      const reserva = await usuarios.updateOne(
        { _id: usuario._id, ultimoRecordatorio: { $ne: hoy } },
        { $set: { ultimoRecordatorio: hoy } }
      );
      if (reserva.modifiedCount === 0) continue;

      try {
        await enviarRecordatorio(id, usuario.nombre, usuario.correo, {
          hechos: hoyRutina.hechos.length,
          faltan: hoyRutina.pendientes.length,
        });
        enviados++;
      } catch (err) {
        await usuarios.updateOne(
          { _id: usuario._id },
          estado.ultimoRecordatorio
            ? { $set: { ultimoRecordatorio: estado.ultimoRecordatorio } }
            : { $unset: { ultimoRecordatorio: "" } }
        );
        throw err;
      }
    } catch (err) {
      fallidos++;
      console.error("No se pudo enviar un recordatorio:", err);
    }
  }

  await limpiarVerificacionesVencidas();
  await limpiarRecuperacionesVencidas();
  return NextResponse.json({ ok: true, enviados, fallidos });
}

function enviarRecordatorio(
  usuarioId: string,
  nombre: string,
  correo: string,
  avance: { hechos: number; faltan: number }
) {
  const base = urlApp();
  const token = tokenBaja(usuarioId);
  const rutina = `${base}/sesion`;
  const baja = `${base}/baja?token=${token}`;

  const ejerciciosFaltan = avance.faltan === 1 ? "1 ejercicio" : `${avance.faltan} ejercicios`;
  const { asunto, cuerpo, boton } =
    avance.hechos === 0
      ? {
          asunto: "No esperes a que la molestia empeore",
          cuerpo:
            "No esperes a que la molestia empeore para empezar. Tu rutina de hoy toma unos minutos y cada día cuenta para tu recuperación.",
          boton: "Empezar mi rutina",
        }
      : {
          asunto: `Te ${avance.faltan === 1 ? "falta" : "faltan"} ${ejerciciosFaltan} de tu rutina de hoy`,
          cuerpo: `Ya empezaste: te ${avance.faltan === 1 ? "falta" : "faltan"} ${ejerciciosFaltan} para completar tu rutina de hoy.`,
          boton: "Continuar mi rutina",
        };

  return enviarCorreo({
    para: correo,
    asunto,
    texto:
      `Hola ${nombre}:\n\n${cuerpo}\n${rutina}\n\n` +
      `Si no quieres recibir más recordatorios, date de baja aquí:\n${baja}`,
    html:
      `<p>Hola ${escaparHtml(nombre)}:</p>` +
      `<p>${cuerpo}</p>` +
      `<p><a href="${rutina}">${boton}</a></p>` +
      `<p style="font-size:12px;color:#666"><a href="${baja}">Dejar de recibir recordatorios</a></p>`,
    baja: `${base}/api/recordatorios/baja?token=${token}`,
  });
}

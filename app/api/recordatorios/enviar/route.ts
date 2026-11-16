import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { obtenerAcceso } from "@/lib/acceso";
import { botonCorreo, enviarCorreo, escaparHtml, primerNombre, urlApp } from "@/lib/correo";
import { leerEnv } from "@/lib/env";
import { leerDia } from "@/lib/historial";
import { getDb } from "@/lib/mongodb";
import { estadoRutina } from "@/lib/progreso";
import { conReintentos, describirError, registrarEnvio } from "@/lib/envios";
import {
  horaEnChile,
  hoyEnChile,
  MAX_INTENTOS_DIA,
  tocaRecordatorio,
  tokenBaja,
  type IntentosRecordatorio,
  type Recordatorios,
} from "@/lib/recordatorios";
import { limpiarRecuperacionesVencidas } from "@/lib/contrasena";
import { limpiarVerificacionesVencidas } from "@/lib/verificacion";

// Una cuenta normal de Gmail admite 500 mensajes al día; se deja margen para
// los correos de confirmación.
const MAX_POR_EJECUCION = 400;
// Se deja de procesar antes del límite de la función; lo pendiente lo toma
// la ejecución de la hora siguiente.
const TIEMPO_MAX_MS = 45_000;
export const maxDuration = 60;

/** Solo en desarrollo: las pruebas fijan la hora o simulan que Gmail falla. */
const deDesarrollo = (req: NextRequest, cabecera: string) =>
  process.env.NODE_ENV !== "production" ? req.headers.get(cabecera) : null;

function autorizado(req: NextRequest): boolean {
  const secreto = leerEnv("CRON_SECRET");
  if (!secreto) return false;
  const esperado = Buffer.from(`Bearer ${secreto}`);
  const recibido = Buffer.from(req.headers.get("authorization") ?? "");
  return esperado.length === recibido.length && crypto.timingSafeEqual(esperado, recibido);
}

/** Lo llama Vercel Cron una vez por hora (ver vercel.json). */
export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const inicio = Date.now();
  const hoy = hoyEnChile();
  const horaSimulada = deDesarrollo(req, "x-hora-simulada");
  const hora = horaSimulada ? Number(horaSimulada) : horaEnChile();
  const simularFallo = deDesarrollo(req, "x-simular-fallo") === "1";
  const usuarios = (await getDb()).collection("usuarios");
  const candidatos = await usuarios
    .find(
      {
        correoVerificadoEn: { $exists: true },
        deshabilitadaEn: { $exists: false },
        demo: { $ne: true },
        "recordatorios.modo": { $in: ["personalizado", "inactividad"] },
      },
      {
        projection: {
          nombre: 1,
          correo: 1,
          recordatorios: 1,
          diasRutina: 1,
          ultimoRecordatorio: 1,
          intentosRecordatorio: 1,
        },
      }
    )
    .toArray();

  let enviados = 0;
  let fallidos = 0;
  let pendientes = 0;

  for (const usuario of candidatos) {
    if (enviados >= MAX_POR_EJECUCION || Date.now() - inicio > TIEMPO_MAX_MS) {
      pendientes++;
      continue;
    }
    const estado = {
      recordatorios: usuario.recordatorios as Recordatorios,
      diasRutina: usuario.diasRutina as number[] | undefined,
      ultimoRecordatorio: usuario.ultimoRecordatorio as string | undefined,
      intentosRecordatorio: usuario.intentosRecordatorio as IntentosRecordatorio | undefined,
    };
    if (!tocaRecordatorio(estado, hoy, hora)) continue;

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
      // de mandarlo, y solo una de las dos gana. La reserva también cuenta
      // la ejecución, para rendirse tras MAX_INTENTOS_DIA fallos.
      const reserva = await usuarios.updateOne(
        {
          _id: usuario._id,
          ultimoRecordatorio: { $ne: hoy },
          $nor: [{ "intentosRecordatorio.fecha": hoy, "intentosRecordatorio.n": { $gte: MAX_INTENTOS_DIA } }],
        },
        [
          {
            $set: {
              ultimoRecordatorio: hoy,
              intentosRecordatorio: {
                $cond: [
                  { $eq: ["$intentosRecordatorio.fecha", hoy] },
                  { fecha: hoy, n: { $add: ["$intentosRecordatorio.n", 1] } },
                  { fecha: hoy, n: 1 },
                ],
              },
            },
          },
        ]
      );
      if (reserva.modifiedCount === 0) continue;
      const ronda = (estado.intentosRecordatorio?.fecha === hoy ? estado.intentosRecordatorio.n : 0) + 1;

      const { intentos, error } = await conReintentos(() => {
        if (simularFallo) return Promise.reject(Object.assign(new Error("Fallo simulado"), { code: "ESIMULADO" }));
        return enviarRecordatorio(id, usuario.nombre, usuario.correo, {
          hechos: hoyRutina.hechos.length,
          faltan: hoyRutina.pendientes.length,
        });
      });

      if (!error) {
        await registrarEnvio(usuario._id, { fecha: hoy, hora, ronda, intentos, estado: "enviado" });
        enviados++;
        continue;
      }

      // Falló: se libera el día para que la hora siguiente lo reintente,
      // salvo que ya se agotaron los intentos.
      await usuarios.updateOne(
        { _id: usuario._id, ultimoRecordatorio: hoy },
        estado.ultimoRecordatorio
          ? { $set: { ultimoRecordatorio: estado.ultimoRecordatorio } }
          : { $unset: { ultimoRecordatorio: "" } }
      );
      await registrarEnvio(usuario._id, {
        fecha: hoy,
        hora,
        ronda,
        intentos,
        estado: ronda >= MAX_INTENTOS_DIA ? "agotado" : "fallido",
        error: describirError(error),
      });
      fallidos++;
      console.error("No se pudo enviar un recordatorio:", describirError(error));
    } catch (err) {
      fallidos++;
      console.error("No se pudo enviar un recordatorio:", err);
    }
  }

  await limpiarVerificacionesVencidas();
  await limpiarRecuperacionesVencidas();
  return NextResponse.json({ ok: true, hora, enviados, fallidos, pendientes });
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
  const falta = avance.faltan === 1 ? "falta" : "faltan";
  const { asunto, cuerpo, boton } =
    avance.hechos === 0
      ? {
          asunto: "Un momento para ti 💙",
          cuerpo:
            "Queremos recordarte que tu bienestar es importante. Dedica unos minutos al día a cuidarte y no esperes a que las molestias aumenten.",
          boton: "Empezar mi rutina",
        }
      : {
          asunto: `Un momento para ti 💙 Te ${falta} ${ejerciciosFaltan}`,
          cuerpo: `Ya empezaste: te ${falta} ${ejerciciosFaltan} para completar tu rutina de hoy. Dedica unos minutos más a cuidarte.`,
          boton: "Continuar mi rutina",
        };
  const cierre = "¡Cada pequeño paso cuenta! Estamos aquí para acompañarte. 🌿";
  const saludo = `Hola, ${primerNombre(nombre)}.`;

  return enviarCorreo({
    para: correo,
    asunto,
    texto:
      `${saludo} ${cuerpo}\n\n${boton}:\n${rutina}\n\n${cierre}\n\n` +
      `Si no quieres recibir más recordatorios, date de baja aquí:\n${baja}`,
    html:
      `<p>${escaparHtml(saludo)} ${cuerpo}</p>` +
      botonCorreo(rutina, boton) +
      `<p>${cierre}</p>` +
      `<p style="font-size:12px;color:#666"><a href="${baja}">Dejar de recibir recordatorios</a></p>`,
    baja: `${base}/api/recordatorios/baja?token=${token}`,
  });
}

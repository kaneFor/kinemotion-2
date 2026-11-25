// Cuentas de DEMOSTRACIÓN para mostrar el panel del administrador con datos.
// Son inventadas: no son resultados de la validación y no deben presentarse
// como tales.
// Uso:
//   npm run datos-demo            crea 12 pacientes con ~2 semanas de uso intermitente
//   npm run datos-demo -- --borrar  elimina todas las cuentas de demostración
//
// Cada cuenta lleva `demo: true`: el panel las marca, el script de
// exportación de la validación las excluye, no pueden iniciar sesión
// (contraseña al azar que nadie conoce), su correo no existe (.invalid) y
// no reciben recordatorios.
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { ejercicios } from "../lib/data.ts";
import { cifrar, conectar, enChile, exigir } from "./entorno.mjs";

exigir({ cifrado: true });
const borrar = process.argv.includes("--borrar");
const { cliente, db, nombre: base } = await conectar();
const usuarios = db.collection("usuarios");

const COLECCIONES_DEL_USUARIO = [
  "perfiles_clinicos",
  "historial_progreso",
  "encuestas",
  "sesiones",
  "verificaciones_correo",
  "recuperaciones_contrasena",
];

try {
  const existentes = await usuarios.find({ demo: true }, { projection: { _id: 1 } }).toArray();

  if (borrar) {
    const ids = existentes.map((u) => u._id);
    for (const c of COLECCIONES_DEL_USUARIO) await db.collection(c).deleteMany({ usuarioId: { $in: ids } });
    await usuarios.deleteMany({ _id: { $in: ids }, demo: true });
    console.log(`Se eliminaron ${ids.length} cuentas de demostración (base: ${base}).`);
  } else if (existentes.length > 0) {
    console.log(`Ya hay ${existentes.length} cuentas de demostración. Bórralas primero con: npm run datos-demo -- --borrar`);
  } else {
    const creadas = await crear();
    console.log(`Se crearon ${creadas} cuentas de demostración en la base "${base}".`);
    console.log("Recuerda: son datos inventados, solo para mostrar el panel.");
  }
} finally {
  await cliente.close();
}

async function crear() {
  // Siempre los mismos datos, para que la demostración sea repetible.
  let semilla = 20261110;
  const azar = () => {
    semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entre = (min, max) => min + Math.floor(azar() * (max - min + 1));
  const elegir = (lista) => lista[Math.floor(azar() * lista.length)];
  const acotar = (n, min, max) => Math.min(max, Math.max(min, n));

  // 12 pacientes, como la muestra de validación, con unas dos semanas de uso.
  const NOMBRES = [
    "Valentina R.", "Matías S.", "Catalina M.", "Benjamín A.", "Antonia P.", "Vicente L.",
    "Javiera C.", "Tomás F.", "Fernanda G.", "Diego N.", "Isidora V.", "Joaquín H.",
  ];
  // Dos grupos llegan a 5 pacientes; los demás se ocultan en el panel por privacidad.
  const LESIONES = [
    ...Array(5).fill("esguince-tobillo"),
    ...Array(5).fill("cervicalgia"),
    "fascitis-plantar",
    "epicondilitis",
  ];
  const DIAS = [[1, 3, 5], [1, 2, 3, 4, 5], [1, 2, 4, 5], [2, 4, 6], [1, 3, 5, 6]];
  const CON_CAMARA = new Set(ejercicios.filter((e) => e.angleTarget).map((e) => e.id));

  const ahora = new Date();
  const hoy = enChile(ahora);
  const sumarDias = (fecha, n) => {
    const d = new Date(`${fecha}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const diaSemana = (fecha) => new Date(`${fecha}T12:00:00Z`).getUTCDay();
  // Contraseña que nadie conoce: las cuentas de demostración no se usan.
  const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);

  for (let n = 0; n < NOMBRES.length; n++) {
    const inicio = sumarDias(hoy, -entre(13, 16));
    const creadoEn = new Date(`${inicio}T14:00:00Z`);
    const lesion = LESIONES[n];
    const otra = null;
    const diasRutina = elegir(DIAS);
    const constancia = 0.5 + azar() * 0.35; // qué tan seguido completa su rutina
    // Uno de cada cuatro deja de usarla después de la primera semana.
    const ultimoDia = azar() < 0.25 ? sumarDias(inicio, entre(7, 10)) : hoy;
    const rutina = ejercicios.filter((e) => e.lesionSlug === lesion).map((e) => e.id);
    const { insertedId: usuarioId } = await usuarios.insertOne({
      nombre: NOMBRES[n],
      correo: `demo${String(n + 1).padStart(2, "0")}@demo.kinemotion.invalid`,
      passwordHash,
      demo: true,
      diasRutina,
      creadoEn,
    });

    const lesiones = [{ slug: lesion, principal: true, estado: "activa", agregadaEn: creadoEn.toISOString() }];
    if (otra) lesiones.push({ slug: otra, principal: false, estado: "activa", agregadaEn: creadoEn.toISOString() });
    await db.collection("perfiles_clinicos").insertOne({
      usuarioId,
      lesiones: cifrar(lesiones),
      consentimiento: { aceptado: true, fecha: creadoEn },
      creadoEn,
    });

    const historial = [];
    let dolor = entre(3, 6);
    let ayerHizo = true;
    for (let fecha = inicio, i = 0; fecha <= ultimoDia; fecha = sumarDias(fecha, 1), i++) {
      const programado = diasRutina.includes(diaSemana(fecha));
      // La constancia baja con los días, y cuesta más retomar tras saltarse uno.
      const p = constancia - i * 0.012 - (ayerHizo ? 0 : 0.1);
      const azarDia = azar();
      if (!programado && azarDia > 0.05) continue;
      if (fecha === hoy && azarDia > 0.5) continue;

      const en = `${fecha}T${String(entre(12, 23)).padStart(2, "0")}:00:00.000Z`;
      if (azar() < 0.05) {
        historial.push({ fecha, dia: { hechos: [], saltados: [], series: [], dolorAntes: acotar(dolor + 3, 0, 10), suspendido: true, totalRutina: rutina.length } });
        continue;
      }
      let hechos;
      if (azarDia < p) hechos = rutina;
      else if (azarDia < p + 0.2) hechos = rutina.slice(0, entre(1, rutina.length - 1));
      else { ayerHizo = false; continue; }
      ayerHizo = true;

      const series = hechos
        .filter((id) => CON_CAMARA.has(id))
        .map((ejercicioId) => {
          const reps = entre(8, 12);
          return { ejercicioId, reps, revisadas: reps, correctas: acotar(reps - entre(0, 3), 0, reps), en };
        });
      dolor = acotar(dolor + (azar() < 0.6 ? -0.15 : 0.1), 0, 9);
      const antes = Math.round(dolor);
      historial.push({
        fecha,
        dia: {
          hechos: hechos.map((ejercicioId) => ({ ejercicioId, en })),
          saltados: [],
          series,
          dolorAntes: antes,
          dolorDespues: acotar(antes + entre(-2, 1), 0, 10),
          totalRutina: rutina.length,
        },
      });
    }
    if (historial.length) {
      await db.collection("historial_progreso").insertMany(
        historial.map(({ fecha, dia }) => ({ usuarioId, fecha, datos: cifrar(dia), version: 1, actualizadoEn: ahora }))
      );
    }

    const encuestas = [];
    const lunesInicio = sumarDias(inicio, -((diaSemana(inicio) + 6) % 7));
    // Solo responde la encuesta las semanas en que usó la plataforma.
    const lunesDeFecha = (f) => sumarDias(f, -((diaSemana(f) + 6) % 7));
    const semanasActivas = new Set(historial.filter((h) => h.dia.hechos.length).map((h) => lunesDeFecha(h.fecha)));
    for (let semana = lunesInicio; semana <= ultimoDia; semana = sumarDias(semana, 7)) {
      if (!semanasActivas.has(semana)) continue;
      const r = azar();
      if (r < 0.7) {
        encuestas.push({
          usuarioId,
          semana,
          datos: cifrar({
            utilidad: acotar(Math.round(3 + constancia * 2 + (azar() - 0.4)), 2, 5),
            claridad: entre(3, 5),
            dificultad: entre(2, 4),
          }),
          actualizadoEn: ahora,
        });
      } else if (r < 0.75) {
        encuestas.push({ usuarioId, semana, datos: cifrar({ omitida: true }), actualizadoEn: ahora });
      }
    }
    if (encuestas.length) await db.collection("encuestas").insertMany(encuestas);
  }
  return NOMBRES.length;
}

// Crea la cuenta del administrador de contenido. Nadie puede hacerse
// administrador desde la web: solo con este script.
// Uso:
//   npm run crear-admin -- correo@ejemplo.cl "Nombre"
//   npm run crear-admin -- --quitar correo@ejemplo.cl
// La contraseña inicial se genera al azar y se muestra una sola vez; se
// puede cambiar con "¿Olvidaste tu contraseña?" en el inicio de sesión.
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { conectar, exigir } from "./entorno.mjs";

exigir();
const args = process.argv.slice(2);
const quitar = args[0] === "--quitar";
const correo = String((quitar ? args[1] : args[0]) ?? "").trim().toLowerCase();
const nombre = String(args[1] ?? "Administración").trim();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
  console.log('Uso: npm run crear-admin -- correo@ejemplo.cl "Nombre"');
  process.exit(1);
}

const { cliente, db, nombre: base } = await conectar();
const usuarios = db.collection("usuarios");
try {
  const existente = await usuarios.findOne({ correo });

  if (quitar) {
    if (existente?.rol !== "admin") {
      console.log(`${correo} no es administrador.`);
    } else {
      await usuarios.deleteOne({ _id: existente._id });
      await db.collection("sesiones").deleteMany({ usuarioId: existente._id });
      console.log(`Se eliminó la cuenta de administrador ${correo} (base: ${base}).`);
    }
  } else if (existente?.rol === "admin") {
    console.log(`${correo} ya es administrador.`);
  } else if (existente) {
    // Mezclar la cuenta de un paciente con la del administrador juntaría
    // datos clínicos con permisos de gestión.
    console.log(`${correo} ya es la cuenta de un paciente. Usa otro correo para el administrador.`);
    process.exitCode = 1;
  } else {
    const password = crypto.randomBytes(12).toString("base64url");
    await usuarios.insertOne({
      nombre,
      correo,
      passwordHash: await bcrypt.hash(password, 12),
      rol: "admin",
      correoVerificadoEn: new Date(),
      creadoEn: new Date(),
    });
    console.log(`Administrador creado en la base "${base}":`);
    console.log(`  Correo:     ${correo}`);
    console.log(`  Contraseña: ${password}`);
    console.log("Guárdala ahora: no se vuelve a mostrar.");
  }
} finally {
  await cliente.close();
}

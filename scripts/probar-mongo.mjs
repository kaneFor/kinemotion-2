// Diagnóstico de la conexión a MongoDB Atlas.
// Uso: npm run probar-mongo
// No imprime la contraseña ni la llave de cifrado.
import fs from "node:fs";
import { MongoClient } from "mongodb";

if (!fs.existsSync(".env.local")) {
  console.log("ERROR: no existe .env.local en esta carpeta.");
  console.log("Crea el archivo copiando .env.local.example y completa los valores.");
  process.exit(1);
}

const env = {};
for (const linea of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = linea.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const uri = env.MONGODB_URI;
const llave = env.ENCRYPTION_KEY || "";
const ok = (b) => (b ? "OK" : "REVISAR");

console.log("1) MONGODB_URI definida:        ", ok(Boolean(uri)));
console.log("2) MONGODB_DB:                  ", env.MONGODB_DB || "(vacía: se usa 'kinemotion')");
console.log("3) ENCRYPTION_KEY (64 hex):     ", ok(/^[0-9a-fA-F]{64}$/.test(llave)), `(largo ${llave.length})`);

if (!uri) process.exit(1);

if (uri.includes("<") || uri.includes(">")) {
  console.log("\nPROBLEMA: la URI todavía contiene < >. Reemplaza <db_password> por la contraseña real, sin los signos.");
}
if (!uri.startsWith("mongodb+srv://") && !uri.startsWith("mongodb://")) {
  console.log("\nPROBLEMA: la URI debe empezar con mongodb+srv://");
  process.exit(1);
}

// Muestra usuario y servidor (nunca la contraseña) para detectar errores de copia
try {
  const u = new URL(uri.replace("mongodb+srv://", "https://").replace("mongodb://", "https://"));
  console.log("4) Usuario en la URI:           ", decodeURIComponent(u.username) || "(vacío)");
  console.log("5) Servidor en la URI:          ", u.hostname);
  if (/[@#/?:%\s]/.test(decodeURIComponent(u.password))) {
    console.log("   AVISO: la contraseña tiene símbolos especiales; si falla, usa una solo con letras y números.");
  }
} catch {
  console.log("AVISO: no se pudo leer la URI; revisa que esté bien copiada.");
}

console.log("\nConectando a Atlas (máx. 8 s)...");
const cliente = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
try {
  await cliente.connect();
  await cliente.db("admin").command({ ping: 1 });
  console.log("OK  conexión y autenticación correctas");

  const db = cliente.db(env.MONGODB_DB || "kinemotion");
  const r = await db.collection("_prueba").insertOne({ prueba: true, en: new Date() });
  await db.collection("_prueba").deleteOne({ _id: r.insertedId });
  console.log(`OK  escritura y borrado en la base '${db.databaseName}'`);
  console.log("\nTodo bien: ya puedes registrarte desde la app.");
} catch (e) {
  console.log("\nERROR:", e.name, "-", e.message);
  const m = e.message.toLowerCase();
  if (m.includes("bad auth") || m.includes("authentication failed")) {
    console.log("CAUSA PROBABLE: usuario o contraseña incorrectos. En Atlas, Database Access > Edit > genera una contraseña solo con letras y números, y cópiala en la URI.");
  } else if (m.includes("querysrv") || m.includes("enotfound") || m.includes("getaddrinfo")) {
    console.log("CAUSA PROBABLE: no se resuelve el servidor. Revisa el nombre del cluster en la URI, tu conexión a internet y tu VPN.");
  } else if (m.includes("not authorized") || m.includes("requires authentication")) {
    console.log("CAUSA PROBABLE: el usuario no tiene permisos. En Atlas, Database Access > Edit > rol 'Read and write to any database'.");
  } else if (m.includes("server selection") || m.includes("timed out") || m.includes("timeout")) {
    console.log("CAUSA PROBABLE: tu IP no está permitida (Atlas > Network Access > Add Current IP Address) o tu red bloquea la conexión. Prueba con los datos del celular.");
  }
  process.exitCode = 1;
} finally {
  await cliente.close();
}

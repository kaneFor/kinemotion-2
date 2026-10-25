import { MongoClient } from "mongodb";
import { leerEnv } from "@/lib/env";

// Un solo cliente por proceso, guardado en `global`: en desarrollo sobrevive
// a las recargas de Next.js, y en producción (Vercel) se reutiliza entre
// peticiones en vez de abrir una conexión nueva cada vez, que agotaría el
// límite de conexiones del plan gratuito de Atlas.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function connect(): Promise<MongoClient> {
  const uri = leerEnv("MONGODB_URI");
  if (!uri) {
    throw new Error(
      "Falta la variable de entorno MONGODB_URI. Revisa .env.local (desarrollo) " +
        "o las variables de entorno del proyecto en Vercel (producción)."
    );
  }
  if (!uri.startsWith("mongodb+srv://") && !uri.startsWith("mongodb://")) {
    // Sin mostrar el valor: contiene la contraseña.
    throw new Error(
      "MONGODB_URI tiene un formato inválido: debe empezar con mongodb+srv:// " +
        "(revisa que no tenga comillas ni texto extra en Vercel o en .env.local)."
    );
  }

  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect().catch((err) => {
      // Si falla, se olvida para reintentar en la próxima petición.
      global._mongoClientPromise = undefined;
      throw err;
    });
  }
  return global._mongoClientPromise;
}

// La conexión se crea recién cuando algo llama getDb(), nunca al importar
// el archivo. Esto evita que `next build` falle si todavía no existen las
// variables de entorno (por ejemplo, en esta primera fase del proyecto).
export async function getDb() {
  const client = await connect();
  return client.db(leerEnv("MONGODB_DB") || "kinemotion");
}

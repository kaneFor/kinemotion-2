import { MongoClient } from "mongodb";

// En desarrollo, Next.js recarga los módulos en cada cambio (hot reload),
// lo que abriría una conexión nueva cada vez si no la guardamos en `global`.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function connect(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Falta la variable de entorno MONGODB_URI. Revisa .env.local (desarrollo) " +
        "o las variables de entorno del proyecto en Vercel (producción)."
    );
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    return global._mongoClientPromise;
  }

  return new MongoClient(uri).connect();
}

// La conexión se crea recién cuando algo llama getDb(), nunca al importar
// el archivo. Esto evita que `next build` falle si todavía no existen las
// variables de entorno (por ejemplo, en esta primera fase del proyecto).
export async function getDb() {
  const client = await connect();
  return client.db(process.env.MONGODB_DB || "kinemotion");
}

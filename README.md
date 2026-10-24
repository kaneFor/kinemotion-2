# KineMotion — Frontend (fase 1)

Plataforma web responsiva de orientación kinesiológica. Este paquete contiene
el **frontend** (landing, registro y biblioteca de ejercicios), construido con
Next.js 16 (App Router), TypeScript y Tailwind CSS v4.

## Qué incluye esta fase

- `/` — Landing con la propuesta de valor, comparación folleto vs. GIF dinámico,
  las 5 lesiones cubiertas y el flujo "cómo funciona".
- `/registro` — Formulario de registro con consentimiento digital informado.
  Al crear la cuenta la sesión queda iniciada.
- `/login` — Inicio de sesión. El botón "Cerrar sesión" está en la barra
  superior.
- `/biblioteca` — "Mi rutina" (requiere sesión): muestra **solo** los
  ejercicios permitidos al paciente.
- `/prescripcion` — Subida de la prescripción médica (PDF digital o .txt).
  Se detecta la lesión y los ejercicios indicados (`lib/prescripcion.ts`):
  - si nombra ejercicios → el paciente solo ve esos;
  - si solo nombra la lesión → ve los ejercicios de esa lesión;
  - si no sube prescripción → ve los de la lesión elegida al registrarse.
  El archivo no se guarda; solo el resultado, cifrado, en `perfiles_clinicos`.
- `/practica/[id]` — Solo accesible para ejercicios de la rutina del paciente.

### Videos de los ejercicios

Cada ejercicio de `lib/data.ts` tiene un video de YouTube (`youtube`). 27 son
de **ProET**, la plataforma de ejercicio terapéutico de los Colegios de
Fisioterapeutas (clips de 10–20 s de un solo ejercicio); el resto, de
Sanitas, FisioOnline, Clínica Fisalia, el NHS y Recupera't Online. Los
marcados `aproximado` muestran una variante parecida y conviene
reemplazarlos cuando haya uno exacto. `components/VideoEjercicio.tsx` carga
el reproductor (youtube-nocookie) solo al tocar reproducir.

### Análisis de movimiento (RTMPose / MediaPipe)

La práctica con cámara estima la pose **en el navegador del paciente**
(ningún video sale del dispositivo). Hay dos motores, intercambiables desde
la misma página (`lib/motores.ts`):

- **RTMPose** (opcional, OpenMMLab, Apache 2.0): detector YOLOX +
  RTMPose Halpe26 (cuerpo + talón y dedos de cada pie), corriendo con
  ONNX Runtime Web (WebGPU si está disponible; si no, CPU). El núcleo de
  pre/posprocesamiento está en `lib/rtmpose.ts`.
- **MediaPipe Pose** (por defecto; "heavy", o "full" en celular). También
  es el respaldo automático si RTMPose no carga.

La elevación de talones no se mide por el ángulo del tobillo (el pie es lo
que peor detectan los modelos) sino por cuánto sube el cuerpo — hombros y
caderas — respecto de la postura base, en % del tronco (`lib/elevacion.ts`).
El contador (`lib/contador.ts`) exige volver a la posición inicial para
sumar, así que quedarse arriba no cuenta repeticiones extra.

Los modelos ONNX están en `public/modelos/` (~100 MB en total; el navegador
descarga solo los que usa: ~76 MB en computador, ~26 MB en celular):

| Archivo | Uso |
|---|---|
| `rtmpose-m-halpe26.onnx` | Pose, computador |
| `rtmpose-s-halpe26.onnx` | Pose, celular |
| `yolox-tiny-humanart.onnx` | Detector de persona, computador |
| `yolox-nano-humanart.onnx` | Detector de persona, celular |

Se obtuvieron del paquete oficial `onnx_sdk` de RTMPose
(download.openmmlab.com/mmpose/v1/projects/rtmposev1/onnx_sdk/). Si el
proyecto pasa a uso comercial, revisar las licencias de los conjuntos de
datos con que se entrenaron (Halpe, Human-Art, etc.).

### Supervisión del movimiento con IA (Claude)

En `/practica/[id]`, el paciente puede activar la "Supervisión con IA":

- El **conteo** de repeticiones sigue siendo local e inmediato (MediaPipe en
  el navegador).
- Al cerrar cada repetición, `lib/repeticion.ts` la resume en números
  (serie de ángulos cada ~100 ms, duración, mínimos/máximos, fracción de
  cuadros con cada desviación postural) y `/api/supervision` se la envía a
  Claude (`claude-opus-5-5`, esfuerzo bajo para responder rápido).
- Claude devuelve, por repetición, si fue **correcta** y por qué, más una
  indicación corta que se lee en voz alta. Al terminar la serie entrega un
  resumen.
- Nunca se envían imágenes ni video. La supervisión es opcional y requiere
  `ANTHROPIC_API_KEY` en `.env.local` (y en Vercel); sin ella, la cámara y
  el conteo funcionan igual.
- Límite: 60 revisiones cada 10 minutos por usuario (en memoria del
  servidor).

Sesiones: cookie httpOnly con un token aleatorio; en la colección
`sesiones` se guarda solo su hash SHA-256 (`lib/sesion.ts`). Cerrar sesión
borra el documento, invalidando el token.

Los datos de ejercicios y lesiones están en `lib/data.ts` — hoy son mock,
listos para ser reemplazados por llamadas reales a la API/DB.

## Correr localmente

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## Compilar para producción

```bash
npm run build
npm run start
```

## Conexión a MongoDB (ya implementada)

`/api/registro` ya persiste en MongoDB de verdad:

- `lib/mongodb.ts` — cliente singleton, se conecta solo cuando se usa (no
  rompe el build si aún no configuraste las variables de entorno).
- `lib/crypto.ts` — cifra/descifra campos sensibles con AES-256-GCM.
- Colección `usuarios`: nombre, correo, `passwordHash` (bcrypt, nunca la
  contraseña en texto plano).
- Colección `perfiles_clinicos`: el tipo de lesión va **cifrado** (AES-256-GCM)
  y separado de las credenciales, tal como plantea el modelo de datos del
  proyecto.

### Paso a paso para conectarlo a tu propio MongoDB

**1. Crea un cluster gratuito en MongoDB Atlas**
1. Ve a https://www.mongodb.com/cloud/atlas/register y crea una cuenta.
2. Crea un cluster gratuito (M0).
3. En "Database Access", crea un usuario de base de datos con contraseña
   (guárdala, la necesitas para la cadena de conexión).
4. En "Network Access", agrega tu IP (o `0.0.0.0/0` para permitir acceso
   desde cualquier IP mientras desarrollas — restringe esto en producción).
5. En "Database" → "Connect" → "Drivers", copia la cadena de conexión.
   Se ve así:
   ```
   mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

**2. Configura las variables de entorno localmente**
```bash
cp .env.local.example .env.local
```
Edita `.env.local` y completa:
```
MONGODB_URI=mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=kinemotion
ENCRYPTION_KEY=   <- genera una con el comando de abajo
```

Genera la llave de cifrado (32 bytes en hex):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Pega el resultado en `ENCRYPTION_KEY`. Guarda esta llave en un lugar seguro
fuera del repositorio (gestor de contraseñas, secret manager) — si la
pierdes, los perfiles clínicos cifrados ya guardados no se podrán leer.

**3. Prueba localmente**
```bash
npm install
npm run dev
```
Ve a `http://localhost:3000/registro`, completa el formulario y créalo.
Deberías ver dos documentos nuevos en Atlas: uno en `usuarios` (con
`passwordHash`) y otro en `perfiles_clinicos` (con `lesion` cifrado como
`{ iv, tag, data }`).

**4. Configura las mismas variables en Vercel al desplegar**
En tu proyecto de Vercel: Settings → Environment Variables, agrega
`MONGODB_URI`, `MONGODB_DB` y `ENCRYPTION_KEY` con los mismos valores
(o una base de datos y llave distintas para producción, lo cual es más
seguro). Nunca subas `.env.local` a git.

### Backups cifrados de la base de datos

Para respaldar los datos ya cifrados:
```bash
mongodump --uri="mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net" --out=./backup
tar -czf - backup | openssl enc -aes-256-cbc -pbkdf2 -out backup.tar.gz.enc
```
El campo `lesion` ya viaja cifrado dentro del dump; el paso de `openssl`
cifra además el respaldo completo (incluye `passwordHash` y metadatos) antes
de subirlo a almacenamiento externo (S3, Google Cloud Storage, etc.). MongoDB
Atlas (planes de pago) también ofrece backups automáticos programados con
cifrado en reposo integrado, si prefieres no gestionarlo tú mismo.

### Qué falta para el backend completo

- Lectura de prescripciones escaneadas o en foto (OCR); hoy solo PDF con texto.
- Revisión de los sinónimos de `lib/prescripcion.ts` por el kinesiólogo.
- Colecciones `rutinas` e `historial_progreso` (para el seguimiento de adherencia).
- Notificaciones por correo (SendGrid/Nodemailer) usando `Historial Progreso`
  para calcular cuándo recordar la siguiente sesión.

## Despliegue

Este proyecto está listo para desplegarse en Vercel:

1. Sube este proyecto a un repositorio de GitHub.
2. Impórtalo en https://vercel.com/new
3. Vercel detecta Next.js automáticamente — no requiere configuración adicional
   para esta fase (sin variables de entorno aún, porque no hay base de datos
   conectada todavía).

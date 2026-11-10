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
  - puede detectar varias lesiones, y cada una se resuelve por separado;
  - si nombra ejercicios de una lesión → el paciente solo ve esos;
  - si solo nombra la lesión → ve todos los ejercicios de esa lesión;
  - si no sube prescripción → ve los de sus lesiones activas de "Mi cuenta".
  El archivo no se guarda; solo el resultado, cifrado, en `perfiles_clinicos`.
- `/practica/[id]` — Solo accesible para ejercicios de la rutina del paciente.
- `/cuenta` — "Mi cuenta": lesiones (principal, activas y terminadas),
  confirmación del correo y recordatorios.
- `/sesion` — Recorrido guiado por la rutina de hoy: un ejercicio a la vez,
  "Terminé este ejercicio" pasa al siguiente y "Saltar" lo deja pendiente.
  Pregunta el dolor (0 a 10, opcional) al empezar y al terminar.
- `/progreso` — "Mi progreso": días seguidos, calendario del mes, gráfico del
  dolor y conteo por ejercicio de los últimos 30 días.

### Tus datos: descargar, corregir y eliminar

En "Mi cuenta" el paciente puede:

- **Descargar sus datos** (`/api/cuenta/datos`): un JSON con la cuenta, las
  lesiones, la prescripción, el consentimiento y todo el historial,
  descifrados. Nunca incluye la contraseña ni tokens.
- **Cambiar su nombre y su correo**. El correo nuevo se valida como en el
  registro y queda sin confirmar, así que los recordatorios se pausan hasta
  abrir el enlace. Si el correo anterior estaba confirmado, recibe un aviso.
- **Eliminar su cuenta** con su contraseña: se borra al instante de todas las
  colecciones (`lib/cuenta.ts`). **Toda colección nueva que guarde datos de un
  usuario debe agregarse a `COLECCIONES_DEL_USUARIO`.**

La app no puede borrar los correos ya enviados: quedan en la bandeja del
paciente y en "Enviados" de la cuenta de Gmail, que conviene vaciar cada cierto
tiempo.

### Recuperar y cambiar la contraseña

- "¿Olvidaste tu contraseña?" (`/olvide-contrasena`): siempre responde lo
  mismo y al instante; el correo se envía después de responder (`after`), para
  no revelar qué correos tienen cuenta. Máximo 3 enlaces por hora y cuenta.
- El enlace (`/restablecer`) dura 1 hora y sirve una vez; en la colección
  `recuperaciones_contrasena` solo se guarda su hash. Al usarlo se cierran
  todas las sesiones y llega un aviso por correo.
- En "Mi cuenta" se cambia con la contraseña actual; cierra las demás sesiones.

La recuperación de contraseña figuraba fuera del MVP en el Proyecto de Título
(secciones 2.4 y 4.1.3); se incorporó el 10 de noviembre de 2026.

### Cumplimiento semanal y encuesta

- **Días de rutina** (Mi cuenta): los días en que el profesional indicó
  ejercitarse. Por defecto, todos. Los recordatorios "En mis días de rutina"
  usan esos mismos días.
- **Cumplimiento autodeclarado semanal** (`cumplimientoSemana` en
  `lib/progreso.ts`), según la sección 2.4 del proyecto: días con la rutina
  completa ÷ días de rutina de la semana × 100, sin contar en el denominador
  los días suspendidos por dolor ("Tengo dolor: suspender la rutina de hoy").
  Se calcula con los días de rutina actuales, también para semanas pasadas.
- **Encuesta semanal** (colección `encuestas`, cifrada): utilidad, claridad y
  dificultad de 1 a 5, más un comentario opcional. Aparece al completar la
  rutina y en "Mi progreso".
- **Exportar para la validación**: `npm run exportar-validacion` escribe en
  `validacion/<fecha>/` (ignorada por git) tres CSV anonimizados con códigos
  P01, P02… y muestra los promedios. Con `-- --excluir a@x.cl,b@x.cl` se
  dejan fuera cuentas de prueba.

### Historial de progreso

Colección `historial_progreso` (`lib/historial.ts`): un documento por paciente
y día (hora de Chile). Los ejercicios hechos, saltados, las series con cámara
y el dolor van **cifrados**, porque revelan la lesión; solo `usuarioId` y
`fecha` quedan legibles para buscar. Las reglas están en `lib/progreso.ts`,
incluido el aviso de dolor (≥ 7, o un alza de 3 o más durante la rutina),
cuyos umbrales son provisorios y debe validar el kinesiólogo.

### Panel del administrador (RF15, RF16)

El administrador de contenido entra con el mismo inicio de sesión y llega a
`/admin`. Nadie puede hacerse administrador desde la web: la cuenta se crea
con un script, que muestra una contraseña al azar una sola vez:

```bash
npm run crear-admin -- correo@ejemplo.cl "Nombre"
npm run crear-admin -- --quitar correo@ejemplo.cl
```

- **Indicadores** (`/admin`, `lib/indicadores.ts`): cumplimiento
  autodeclarado de todos los pacientes (sesiones completadas ÷ programadas,
  8 semanas), promedios de la encuesta, dolor declarado, uso de la cámara y
  una tabla por lesión. Sin nombres ni comentarios, y un grupo con menos de
  5 pacientes no se muestra.
- **Cuentas** (`/admin/cuentas`): nombre, correo, fecha de registro y
  estado. Habilitar o deshabilitar una cuenta; deshabilitada no puede
  iniciar sesión ni recibe recordatorios. Los datos clínicos no se ven.

Para una presentación se pueden cargar **datos de demostración** (30
pacientes inventados con ~8 semanas de historial). Llevan `demo: true`, el
panel los marca y permite esconderlos, no pueden iniciar sesión ni reciben
correos, y `exportar-validacion` los excluye. **No son resultados de la
validación.**

```bash
npm run datos-demo              # crear
npm run datos-demo -- --borrar  # eliminar
```

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

Ejercicios con cámara (6 de 30, en 4 de las 5 lesiones):

| Ejercicio | Qué se mide | Vista |
|---|---|---|
| et-03 Elevación de talones · fp-04 Elevación de talón en escalón | Cuánto sube el cuerpo (% del tronco) | Lado o frente, cuerpo completo |
| et-06 Sentadilla en step | Ángulo de rodilla | Lado |
| ep-06 Movilidad de codo activa | Ángulo de codo | Lado |
| cv-02 Rotación cervical · cv-03 Inclinación lateral | Giro e inclinación de la cabeza, hacia cualquier lado (`lib/cuello.ts`) | Frente, cabeza y hombros |

Los ejercicios de dedos, agarre y giro del antebrazo no se pueden medir con
un modelo de cuerpo; necesitarían un modelo de manos (trabajo futuro). Todos
los umbrales de `lib/data.ts` y `lib/reglas.ts` son provisorios y debe
calibrarlos el kinesiólogo revisor.

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
- Colección `perfiles_clinicos`: la lista de lesiones va **cifrada**
  (AES-256-GCM) y separada de las credenciales, tal como plantea el modelo de
  datos del proyecto. Las cuentas anteriores guardan una sola lesión en el
  campo `lesion`, que se lee como la principal.

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
`passwordHash`) y otro en `perfiles_clinicos` (con `lesiones` cifrado como
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
El campo `lesiones` ya viaja cifrado dentro del dump; el paso de `openssl`
cifra además el respaldo completo (incluye `passwordHash` y metadatos) antes
de subirlo a almacenamiento externo (S3, Google Cloud Storage, etc.). MongoDB
Atlas (planes de pago) también ofrece backups automáticos programados con
cifrado en reposo integrado, si prefieres no gestionarlo tú mismo.

### Qué falta para el backend completo

- Lectura de prescripciones escaneadas o en foto (OCR); hoy solo PDF con texto.
- Revisión de los sinónimos de `lib/prescripcion.ts` por el kinesiólogo.
- Informe de progreso para el kinesiólogo (enlace o PDF que comparte el paciente).

### Correos y recordatorios

Los correos salen por Gmail con Nodemailer (`lib/correo.ts`), sin dominio propio.

1. Usa una cuenta de Gmail dedicada y activa la verificación en dos pasos.
2. Crea una contraseña de aplicación en https://myaccount.google.com/apppasswords
3. Agrega a `.env.local` y a Vercel: `GMAIL_USUARIO`, `GMAIL_CLAVE_APP` y
   `CRON_SECRET` (genérala igual que `ENCRYPTION_KEY`).

Sin Gmail configurado, en desarrollo los correos se imprimen en la terminal.

- Al registrarse se revisa que el dominio pueda recibir correo y se envía un
  enlace de confirmación (`lib/verificacion.ts`). Quien no confirma puede usar
  la app, pero no activar recordatorios.
- Cada paciente elige en "Mi cuenta" el modo: días personalizados o cada día
  sin entrar a su rutina (`lib/recordatorios.ts`). Parten apagados.
- Vercel Cron llama una vez al día a `/api/recordatorios/enviar` (`vercel.json`,
  22:00 UTC). Solo se escribe a quien no completó la rutina de hoy: un mensaje
  si no hizo ningún ejercicio y otro con los que le faltan si la dejó a medias.
  No se recuerda a quien terminó todas sus lesiones.
- Los correos nunca mencionan la lesión ni otros datos clínicos.

## Despliegue

Este proyecto está listo para desplegarse en Vercel:

1. Sube este proyecto a un repositorio de GitHub.
2. Impórtalo en https://vercel.com/new
3. Vercel detecta Next.js automáticamente — no requiere configuración adicional
   para esta fase (sin variables de entorno aún, porque no hay base de datos
   conectada todavía).

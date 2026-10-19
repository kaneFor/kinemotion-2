import type { Punto } from "./pose";
import {
  aBlazePose,
  cajaDePuntos,
  decodificarPose,
  DET_TAM,
  mejorPersona,
  POSE_H,
  POSE_W,
  prepararDetector,
  prepararPose,
  regionDeCaja,
  type Caja,
} from "./rtmpose";

/**
 * Motores de estimación de pose para la práctica con cámara. Todos entregan
 * los puntos en el formato de BlazePose (33 puntos, coordenadas 0–1), así el
 * resto de la app no depende de qué modelo esté corriendo.
 *
 *  - RTMPose (por defecto): más preciso, sobre todo en pies (talón y dedos).
 *  - MediaPipe: respaldo si RTMPose no puede cargar en el equipo.
 *
 * Solo para el navegador.
 */

export type MotorPose = {
  nombre: "RTMPose" | "MediaPipe";
  detectar(video: HTMLVideoElement, tMs: number): Promise<Punto[] | null>;
  cerrar(): void;
};

const ORT_VERSION = "1.30.0"; // debe coincidir con onnxruntime-web en package.json

export const esMovil = () =>
  typeof navigator !== "undefined" &&
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

// ---------------------------------------------------------------------------
// RTMPose
// ---------------------------------------------------------------------------

// Cada cuántos cuadros se vuelve a correr el detector aunque el
// seguimiento vaya bien (corrige la caja si la persona se desplazó).
const REDETECTAR_CADA = 90;
// Ancho máximo del cuadro que se analiza: más no mejora la pose (el
// recorte se lleva a 192×256) y cuesta más leer los píxeles.
const ANCHO_MAX = 960;

const SUAVIZADO_CAJA = 0.3; // peso de la caja nueva

function suavizarCaja(anterior: Caja, nueva: Caja): Caja {
  const m = (a: number, b: number) => a + (b - a) * SUAVIZADO_CAJA;
  return {
    x1: m(anterior.x1, nueva.x1),
    y1: m(anterior.y1, nueva.y1),
    x2: m(anterior.x2, nueva.x2),
    y2: m(anterior.y2, nueva.y2),
    score: nueva.score,
  };
}

export async function crearMotorRTMPose(): Promise<MotorPose> {
  const ort = await import("onnxruntime-web/webgpu");
  // Los binarios WebAssembly se bajan del CDN, no se empaquetan con la app.
  ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
  ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;

  // En celulares, modelos más livianos para mantener la fluidez.
  const movil = esMovil();
  const urlPose = movil ? "/modelos/rtmpose-s-halpe26.onnx" : "/modelos/rtmpose-m-halpe26.onnx";
  const urlDet = movil ? "/modelos/yolox-nano-humanart.onnx" : "/modelos/yolox-tiny-humanart.onnx";

  // WebGPU si el navegador lo soporta; si no, WebAssembly (CPU).
  const crearSesion = async (url: string) => {
    if ("gpu" in navigator) {
      try {
        return await ort.InferenceSession.create(url, { executionProviders: ["webgpu"] });
      } catch (err) {
        console.warn("WebGPU no disponible para RTMPose, se usa CPU:", err);
      }
    }
    return ort.InferenceSession.create(url, { executionProviders: ["wasm"] });
  };
  // Una después de la otra: WebGPU no admite crear dos sesiones a la vez.
  const detector = await crearSesion(urlDet);
  const pose = await crearSesion(urlPose);

  const lienzo = document.createElement("canvas");
  const ctx = lienzo.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("No se pudo crear el lienzo para RTMPose.");

  let caja: Caja | null = null;
  let cuadrosDesdeDeteccion = 0;

  return {
    nombre: "RTMPose",
    async detectar(video) {
      const escala = Math.min(1, ANCHO_MAX / video.videoWidth);
      const ancho = Math.round(video.videoWidth * escala);
      const alto = Math.round(video.videoHeight * escala);
      if (lienzo.width !== ancho) lienzo.width = ancho;
      if (lienzo.height !== alto) lienzo.height = alto;
      ctx.drawImage(video, 0, 0, ancho, alto);
      const img = ctx.getImageData(0, 0, ancho, alto);

      // 1. Detector solo al inicio, si se perdió a la persona o cada tanto.
      if (!caja || cuadrosDesdeDeteccion >= REDETECTAR_CADA) {
        const { tensor, ratio } = prepararDetector(img);
        const salida = await detector.run({
          input: new ort.Tensor("float32", tensor, [1, 3, DET_TAM, DET_TAM]),
        });
        caja = mejorPersona(salida.dets.data as Float32Array, ratio);
        cuadrosDesdeDeteccion = 0;
        if (!caja) return null;
      }
      cuadrosDesdeDeteccion++;

      // 2. Pose dentro de la caja.
      const region = regionDeCaja(caja);
      const salida = await pose.run({
        input: new ort.Tensor("float32", prepararPose(img, region), [1, 3, POSE_H, POSE_W]),
      });
      const simccX = salida.simcc_x;
      const puntos = decodificarPose(
        simccX.data as Float32Array,
        salida.simcc_y.data as Float32Array,
        simccX.dims[1],
        region
      );

      // 3. La caja del próximo cuadro sale de estos puntos (seguimiento).
      //    Si la pose es poco confiable, se vuelve a detectar.
      const siguiente = cajaDePuntos(puntos);
      if (!siguiente || siguiente.score < 0.35) {
        caja = null;
        return null;
      }
      // La caja se suaviza: si salta de un cuadro a otro, el recorte cambia
      // y los puntos tiemblan aunque la persona esté quieta.
      caja = suavizarCaja(caja, siguiente);

      return aBlazePose(puntos, ancho, alto);
    },
    cerrar() {
      void detector.release();
      void pose.release();
    },
  };
}

// ---------------------------------------------------------------------------
// MediaPipe (respaldo)
// ---------------------------------------------------------------------------

// "heavy" (~31 MB) en computador; "full" (~9 MB) en celular.
const MODELO_MEDIAPIPE = (variante: "full" | "heavy") =>
  `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_${variante}/float16/1/pose_landmarker_${variante}.task`;

export async function crearMotorMediaPipe(): Promise<MotorPose> {
  const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
  );
  const crear = (delegate: "GPU" | "CPU") =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODELO_MEDIAPIPE(esMovil() ? "full" : "heavy"), delegate },
      runningMode: "VIDEO",
      numPoses: 1,
      // Valores por defecto: detectan a la persona con facilidad. Los puntos
      // dudosos se descartan después, por visibilidad (VIS_MIN).
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  // Algunos equipos no soportan la GPU desde el navegador.
  const landmarker = await crear("GPU").catch(() => crear("CPU"));

  return {
    nombre: "MediaPipe",
    async detectar(video, tMs) {
      const r = landmarker.detectForVideo(video, tMs);
      return (r.landmarks?.[0] as Punto[] | undefined) ?? null;
    },
    cerrar() {
      landmarker.close();
    },
  };
}

/**
 * Crea el motor elegido. Si se pide RTMPose y no puede cargar (navegador
 * antiguo, poca memoria, etc.), se usa MediaPipe.
 */
export async function crearMotor(preferido: MotorPose["nombre"] = "MediaPipe"): Promise<MotorPose> {
  if (preferido === "MediaPipe") return crearMotorMediaPipe();
  try {
    return await crearMotorRTMPose();
  } catch (err) {
    console.warn("No se pudo cargar RTMPose; se usa MediaPipe como respaldo.", err);
    return crearMotorMediaPipe();
  }
}

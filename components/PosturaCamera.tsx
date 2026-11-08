"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AngleTarget } from "@/lib/data";
import { anguloDeArticulacion, corregirAspecto, SelectorLado, VIS_MIN } from "@/lib/pose";
import { FiltroPose } from "@/lib/filtro";
import { crearMotor, type MotorPose } from "@/lib/motores";
import { detenerVoz, hablar, vozDisponible } from "@/lib/voz";
import { reglasPorEjercicio, type Regla } from "@/lib/reglas";
import { colocacionDe, guias, textoGuia } from "@/lib/guias";
import { Calibrador } from "@/lib/calibracion";
import { ContadorReps } from "@/lib/contador";
import { MedidorElevacion, medirTronco } from "@/lib/elevacion";
import { cerrarRep, marcarInicio, nuevoBuffer, registrarCuadro } from "@/lib/repeticion";
import {
  MAX_REPS_POR_SOLICITUD,
  type MetricasRep,
  type RespuestaSupervision,
  type VeredictoRep,
} from "@/lib/supervision";

type Estado = "cargando" | "pidiendo_camara" | "listo" | "sin_persona" | "error";

// MediaPipe es el motor por defecto: en las pruebas fue más estable.
// (La clave cambió para que todos vuelvan a empezar con MediaPipe.)
const CLAVE_MOTOR = "kinemotion.motorPose.v2";

const POSE_CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [27, 31],
  [24, 26], [26, 28], [28, 30], [28, 32],
];

// Un aviso solo se emite si la desviación se mantiene varios cuadros seguidos
// (evita falsas alarmas por el temblor del modelo) y respetando pausas para
// no saturar al usuario con mensajes.
const FRAMES_AVISO = 15;
const ESPERA_ENTRE_AVISOS = 6000;
const ESPERA_MISMA_REGLA = 12000;

// Tras contar una repetición se sigue registrando este tiempo antes de
// mandarla a revisar, para incluir el regreso a la posición inicial.
const MARGEN_CIERRE_MS = 1200;

export default function PosturaCamera({
  target,
  ejercicioId,
  desdeSesion = false,
}: {
  target: AngleTarget;
  ejercicioId: string;
  desdeSesion?: boolean;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [estado, setEstado] = useState<Estado>("cargando");
  const [motorNombre, setMotorNombre] = useState<MotorPose["nombre"] | null>(null);
  // El paciente puede cambiar de motor; la elección se recuerda en este navegador.
  const [motorPreferido, setMotorPreferido] = useState<MotorPose["nombre"]>(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(CLAVE_MOTOR) === "RTMPose"
        ? "RTMPose"
        : "MediaPipe";
    } catch {
      return "MediaPipe";
    }
  });

  function cambiarMotor() {
    const otro = motorNombre === "MediaPipe" ? "RTMPose" : "MediaPipe";
    try {
      localStorage.setItem(CLAVE_MOTOR, otro);
    } catch {}
    setMotorNombre(null);
    setEstado("cargando");
    setMotorPreferido(otro);
  }
  const [errorMsg, setErrorMsg] = useState("");
  const [angulo, setAngulo] = useState<number | null>(null);
  const [enRango, setEnRango] = useState(false);
  const [reps, setReps] = useState(0);
  const contadorRef = useRef<ContadorReps | null>(null);

  // --- voz y avisos de corrección ---
  const [vozDisp, setVozDisp] = useState(false);
  const [vozActiva, setVozActiva] = useState(false);
  const [explicando, setExplicando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const vozActivaRef = useRef(false);
  const conteoReglasRef = useRef<Record<string, number>>({});
  const ultimoAvisoRef = useRef(-Infinity);
  const ultimoPorReglaRef = useRef<Record<string, number>>({});
  const sinPersonaDesdeRef = useRef<number | null>(null);
  const ultimoSinPersonaRef = useRef(-Infinity);
  const msgTimerRef = useRef<number | null>(null);
  const guia = guias[ejercicioId];
  const colocacion = colocacionDe(ejercicioId);

  // --- postura base (ejercicios medidos en modo relativo) y encuadre ---
  const [calibrador] = useState(() => new Calibrador());
  const [medidorElevacion] = useState(() => new MedidorElevacion());
  const unidad = target.joint === "elevacion" ? "%" : "°";
  const [base, setBase] = useState<number | null>(null);
  const [encuadreMalo, setEncuadreMalo] = useState(false);

  function recalibrar() {
    calibrador.reiniciar();
    medidorElevacion.reiniciar();
    contadorRef.current?.reiniciar();
    setBase(null);
  }

  // --- supervisión con IA (Claude) ---
  // El conteo es local e inmediato; Claude revisa cada repetición cerrada
  // a partir de sus números (nunca imágenes) y decide si fue correcta.
  const [supervision, setSupervision] = useState(false);
  const [veredictos, setVeredictos] = useState<VeredictoRep[]>([]);
  const [mensajeIA, setMensajeIA] = useState<RespuestaSupervision | null>(null);
  const [resumenIA, setResumenIA] = useState<string | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [resumiendo, setResumiendo] = useState(false);
  const [errorIA, setErrorIA] = useState<string | null>(null);
  const supervisionRef = useRef(false);
  const repsRef = useRef(0);
  const bufferRef = useRef(nuevoBuffer());
  const pendientesRef = useRef<MetricasRep[]>([]);
  const todasRef = useRef<MetricasRep[]>([]);
  const enVueloRef = useRef(false);
  const cierrePendienteRef = useRef<{ n: number; t: number } | null>(null);

  const pedirSupervision = useCallback(
    async (modo: "repeticion" | "resumen", repeticiones: MetricasRep[]) => {
      const res = await fetch("/api/supervision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ejercicioId, modo, repeticiones }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Sin configuración no tiene sentido seguir intentando.
        if (res.status === 503) {
          supervisionRef.current = false;
          setSupervision(false);
        }
        throw new Error(
          [data.error, data.pista].filter(Boolean).join(" ") ||
            "No se pudo revisar el movimiento."
        );
      }
      return data as RespuestaSupervision;
    },
    [ejercicioId]
  );

  // Envía las repeticiones pendientes de a una tanda por vez; las que se
  // cierren mientras tanto van en la tanda siguiente.
  const revisarPendientes = useCallback(async () => {
    if (enVueloRef.current) return;
    enVueloRef.current = true;
    setRevisando(true);
    try {
      while (supervisionRef.current && pendientesRef.current.length > 0) {
        const lote = pendientesRef.current.splice(0, MAX_REPS_POR_SOLICITUD);
        try {
          const r = await pedirSupervision("repeticion", lote);
          setErrorIA(null);
          setVeredictos((prev) => [
            ...prev.filter((v) => !r.repeticiones.some((x) => x.n === v.n)),
            ...r.repeticiones,
          ]);
          setMensajeIA(r);
          if (vozActivaRef.current && r.mensaje) {
            hablar(r.mensaje, { interrumpir: false });
          }
        } catch (err) {
          setErrorIA(err instanceof Error ? err.message : "Sin conexión con la IA.");
        }
      }
    } finally {
      enVueloRef.current = false;
      setRevisando(false);
    }
  }, [pedirSupervision]);

  const validas = veredictos.filter((v) => v.valida).length;

  function alternarSupervision() {
    const activa = !supervisionRef.current;
    supervisionRef.current = activa;
    setSupervision(activa);
    setErrorIA(null);
    if (!activa) pendientesRef.current = [];
  }

  async function terminarSerie() {
    const reps = todasRef.current.slice(-MAX_REPS_POR_SOLICITUD);
    if (reps.length === 0) return;
    setResumiendo(true);
    setResumenIA(null);
    try {
      const r = await pedirSupervision("resumen", reps);
      setErrorIA(null);
      setVeredictos(r.repeticiones);
      setResumenIA(r.resumen || r.mensaje);
      if (vozActivaRef.current) hablar(r.resumen || r.mensaje);
    } catch (err) {
      setErrorIA(err instanceof Error ? err.message : "Sin conexión con la IA.");
    } finally {
      setResumiendo(false);
    }
  }

  const [guardando, setGuardando] = useState(false);
  const [avisoSerie, setAvisoSerie] = useState<string | null>(null);

  async function registrar(evento: object): Promise<boolean> {
    const res = await fetch("/api/progreso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ejercicioId, ...evento }),
    }).catch(() => null);
    return Boolean(res?.ok);
  }

  /** Guarda en el historial la serie en curso, si tiene repeticiones. */
  async function guardarSerie(): Promise<boolean> {
    const n = repsRef.current;
    if (n === 0) return true;
    const ok = await registrar({
      accion: "serie",
      reps: n,
      ...(supervisionRef.current ? { correctas: validas, revisadas: veredictos.length } : {}),
    });
    setAvisoSerie(
      ok
        ? `Serie guardada: ${n} ${n === 1 ? "repetición" : "repeticiones"}.`
        : "No se pudo guardar la serie. Revisa tu conexión."
    );
    return ok;
  }

  async function guardarYEmpezarOtra() {
    setGuardando(true);
    if (await guardarSerie()) nuevaSerie();
    setGuardando(false);
  }

  async function terminarEjercicio() {
    setGuardando(true);
    const ok = (await guardarSerie()) && (await registrar({ accion: "hecho" }));
    setGuardando(false);
    if (!ok) {
      setAvisoSerie("No se pudo guardar tu avance. Revisa tu conexión.");
      return;
    }
    router.push(desdeSesion ? "/sesion" : "/biblioteca");
    router.refresh();
  }

  function nuevaSerie() {
    repsRef.current = 0;
    setReps(0);
    cierrePendienteRef.current = null;
    bufferRef.current = nuevoBuffer();
    pendientesRef.current = [];
    todasRef.current = [];
    setVeredictos([]);
    setMensajeIA(null);
    setResumenIA(null);
    setErrorIA(null);
  }

  useEffect(() => {
    setVozDisp(vozDisponible());
    return () => {
      detenerVoz();
      if (msgTimerRef.current) window.clearTimeout(msgTimerRef.current);
    };
  }, []);

  function alternarVoz() {
    if (vozActiva) {
      vozActivaRef.current = false;
      setVozActiva(false);
      detenerVoz();
      return;
    }
    vozActivaRef.current = true;
    setVozActiva(true);
    hablar("Voz de correcciones activada.");
  }

  function escucharExplicacion() {
    if (!guia) return;
    if (explicando) {
      detenerVoz();
      setExplicando(false);
      return;
    }
    setExplicando(true);
    hablar(`${textoGuia(guia)} ${colocacion}`, { onFin: () => setExplicando(false) });
  }

  useEffect(() => {
    let motor: MotorPose | null = null;
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelado = false;

    async function iniciar() {
      try {
        // RTMPose (más preciso, en especial en los pies) o, si no puede
        // cargar en este equipo, MediaPipe.
        motor = await crearMotor(motorPreferido);
        if (cancelado) {
          motor.cerrar();
          return;
        }
        setMotorNombre(motor.nombre);

        if (cancelado) return;
        setEstado("pidiendo_camara");

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        if (cancelado || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setEstado("listo");

        const cerrarRepPendiente = () => {
          const cierre = cierrePendienteRef.current;
          if (!cierre) return;
          cierrePendienteRef.current = null;
          const metricas = cerrarRep(bufferRef.current, cierre.n);
          bufferRef.current = nuevoBuffer();
          if (!metricas) return;
          todasRef.current.push(metricas);
          if (supervisionRef.current) {
            pendientesRef.current.push(metricas);
            void revisarPendientes();
          }
        };

        const filtro = new FiltroPose();
        // En "elevacion" el lado solo lo usan las reglas de postura.
        const selectorLado = new SelectorLado(target.joint === "elevacion" ? "rodilla" : target.joint);
        const contador = new ContadorReps(target);
        contadorRef.current = contador;
        let ultimoTiempoVideo = -1;
        let cuadrosSinMedicion = 0;

        const loop = () => {
          paso().catch((err) => {
            console.error("Error analizando el movimiento:", err);
            if (cancelado) return;
            setEstado("error");
            setErrorMsg("El análisis de movimiento se detuvo. Intenta recargar la página.");
          });
        };

        const paso = async () => {
          if (cancelado || !videoRef.current || !canvasRef.current || !motor) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (!ctx || video.videoWidth === 0) {
            raf = requestAnimationFrame(loop);
            return;
          }

          // El navegador pide cuadros a 60 Hz, pero la cámara entrega ~30:
          // no se analiza dos veces el mismo cuadro (el modelo es costoso).
          if (video.currentTime === ultimoTiempoVideo) {
            raf = requestAnimationFrame(loop);
            return;
          }
          ultimoTiempoVideo = video.currentTime;

          if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
          if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

          const ahora = performance.now();
          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const poseCruda = await motor.detectar(video, ahora);
          if (cancelado) return;

          if (!poseCruda) {
            filtro.reiniciar();
            setEstado("sin_persona");
            setAngulo(null);
            registrarCuadro(bufferRef.current, ahora, null, []);
            if (sinPersonaDesdeRef.current === null) sinPersonaDesdeRef.current = ahora;
            if (
              vozActivaRef.current &&
              ahora - sinPersonaDesdeRef.current > 3000 &&
              ahora - ultimoSinPersonaRef.current > 15000
            ) {
              ultimoSinPersonaRef.current = ahora;
              hablar("No te veo bien. Colócate de lado, a unos dos metros de la cámara, con el cuerpo completo en el encuadre.");
            }
          } else {
            sinPersonaDesdeRef.current = null;
            setEstado("listo");

            // pose suavizada (para dibujar) y con el aspecto corregido (para
            // medir ángulos sin deformación), siempre del mismo lado
            const pose = filtro.filtrar(poseCruda, ahora);
            const medible = corregirAspecto(pose, video.videoWidth, video.videoHeight);
            const lado = selectorLado.actualizar(pose);

            // --- reglas de corrección postural ---
            const reglas: Regla[] = reglasPorEjercicio[ejercicioId] ?? [];
            let candidata: Regla | null = null;
            const activas: string[] = [];
            for (const r of reglas) {
              const incumple = r.evaluar(medible, lado) === true;
              if (incumple) activas.push(r.id);
              const n = incumple ? (conteoReglasRef.current[r.id] ?? 0) + 1 : 0;
              conteoReglasRef.current[r.id] = n;
              const listaParaAvisar =
                n >= FRAMES_AVISO &&
                ahora - (ultimoPorReglaRef.current[r.id] ?? -Infinity) > ESPERA_MISMA_REGLA;
              if (listaParaAvisar && (!candidata || r.prioridad < candidata.prioridad)) {
                candidata = r;
              }
            }
            if (candidata && ahora - ultimoAvisoRef.current > ESPERA_ENTRE_AVISOS) {
              ultimoAvisoRef.current = ahora;
              ultimoPorReglaRef.current[candidata.id] = ahora;
              setMensaje(candidata.mensaje);
              if (msgTimerRef.current) window.clearTimeout(msgTimerRef.current);
              msgTimerRef.current = window.setTimeout(() => setMensaje(null), 6000);
              if (vozActivaRef.current) hablar(candidata.mensaje);
            }

            // Medición según el ejercicio (los puntos ya vienen suavizados
            // por el filtro One Euro). En modo relativo se mide cuánto se
            // aleja de su postura base; mientras se calibra no se cuenta.
            let valor: number | null = null;
            let sinMedicion: boolean;
            let recienCalibrado = false;
            if (target.joint === "elevacion") {
              const tronco = medirTronco(medible);
              sinMedicion = tronco === null;
              if (tronco) {
                recienCalibrado = medidorElevacion.agregar(tronco);
                valor = medidorElevacion.elevacion(tronco);
              }
            } else {
              const anguloMedido = anguloDeArticulacion(medible, target.joint, lado);
              sinMedicion = anguloMedido === null;
              valor = anguloMedido;
              if (target.relativo && anguloMedido !== null) {
                recienCalibrado = calibrador.agregar(anguloMedido);
                valor = calibrador.base === null ? null : anguloMedido - calibrador.base;
              }
            }
            if (recienCalibrado) {
              setBase(0);
              if (vozActivaRef.current) hablar("Listo, ya puedes empezar.");
            }

            // Si la persona se ve pero lo que se mide no, el problema es el
            // encuadre (cuerpo cortado, poca luz, cámara muy cerca).
            cuadrosSinMedicion = sinMedicion ? cuadrosSinMedicion + 1 : 0;
            setEncuadreMalo(cuadrosSinMedicion > 45);

            let dentroActual = false;

            if (valor !== null) {
              registrarCuadro(bufferRef.current, ahora, valor, activas);

              const dentro = valor >= target.min && valor <= target.max;
              dentroActual = dentro;
              setEnRango(dentro);
              setAngulo(Math.round(valor));

              // Exige el recorrido completo reposo → zona objetivo → reposo;
              // quedarse en la zona objetivo no suma repeticiones.
              const evento = contador.actualizar(valor, ahora);
              if (evento === "inicio") {
                cerrarRepPendiente(); // si la siguiente empezó antes del margen
                marcarInicio(bufferRef.current, ahora);
              } else if (evento === "repeticion") {
                // Cuenta al instante; se envía a revisar un momento después,
                // para incluir el regreso a la posición inicial.
                repsRef.current += 1;
                setReps(repsRef.current);
                cierrePendienteRef.current = { n: repsRef.current, t: ahora };
              }
            } else {
              registrarCuadro(bufferRef.current, ahora, null, activas);
              setAngulo(null);
            }

            const cierre = cierrePendienteRef.current;
            if (cierre && ahora - cierre.t >= MARGEN_CIERRE_MS) cerrarRepPendiente();

            const color = dentroActual ? "#8FA815" : "#A4432C";
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 3;

            for (const [i, j] of POSE_CONNECTIONS) {
              const p1 = pose[i];
              const p2 = pose[j];
              // no se dibujan puntos que el modelo no ve con confianza
              if (!p1 || !p2 || (p1.visibility ?? 0) < VIS_MIN || (p2.visibility ?? 0) < VIS_MIN) continue;
              ctx.beginPath();
              ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
              ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
              ctx.stroke();
            }
            for (const p of pose) {
              if ((p.visibility ?? 0) < VIS_MIN) continue;
              ctx.beginPath();
              ctx.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
          ctx.restore();
          raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
      } catch (err) {
        console.error("Error en PosturaCamera:", err);
        if (cancelado) return;
        setEstado("error");
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setErrorMsg("Necesitamos permiso de cámara para poder guiarte. Revisa los permisos del navegador.");
        } else {
          setErrorMsg("No pudimos iniciar la cámara o el modelo de pose. Intenta recargar la página.");
        }
      }
    }

    iniciar();

    return () => {
      cancelado = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      motor?.cerrar();
    };
  }, [target, ejercicioId, revisarPendientes, calibrador, medidorElevacion, motorPreferido]);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="relative aspect-[4/3] bg-ink rounded-sm overflow-hidden">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} className="w-full h-full object-cover" />

        {estado !== "listo" && estado !== "sin_persona" && (
          <div className="absolute inset-0 flex items-center justify-center text-paper text-sm text-center px-6">
            {estado === "cargando" &&
              "Cargando el modelo de análisis de movimiento… La primera vez puede tardar un poco."}
            {estado === "pidiendo_camara" && "Solicitando acceso a tu cámara…"}
            {estado === "error" && errorMsg}
          </div>
        )}

        {mensaje && (
          <div
            role="status"
            aria-live="polite"
            className="absolute top-3 left-3 right-3 bg-ink/85 text-paper text-sm text-center rounded-sm px-3 py-2"
          >
            {mensaje}
          </div>
        )}

        {estado === "listo" && encuadreMalo && (
          <div className="absolute bottom-3 left-3 right-3 bg-ink/85 text-paper text-xs text-center rounded-sm px-3 py-2">
            {target.joint === "elevacion"
              ? "No veo bien tu cuerpo. Aléjate hasta que se vea completo, de la cabeza a los pies."
              : target.joint === "tobillo"
              ? "No veo bien tu pie. Baja la cámara a la altura de tus rodillas y aléjate hasta que se vean tus pies completos."
              : "No veo bien la articulación. Ponte de lado y aléjate hasta que se vea completa."}
          </div>
        )}

        {estado === "listo" && !encuadreMalo && target.relativo && base === null && (
          <div className="absolute bottom-3 left-3 right-3 bg-ink/85 text-paper text-xs text-center rounded-sm px-3 py-2">
            Quédate quieto de pie, de lado, un segundo: estoy tomando tu postura base.
          </div>
        )}

        {estado === "sin_persona" && (
          <div className="absolute bottom-3 left-0 right-0 text-center text-paper text-xs">
            No detectamos a nadie en el encuadre. Ubícate para que se vea la articulación completa.
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div>
          <p className="text-ink-soft label-tech">
            {target.descripcion} ·{" "}
            {target.relativo
              ? `objetivo: subir al menos ${target.min}${unidad} sobre tu base`
              : `objetivo ${target.min}${unidad}–${target.max}${unidad}`}
          </p>
          <p className="mt-1 font-display text-lg text-ink">
            {angulo !== null ? `${target.relativo && angulo > 0 ? "+" : ""}${angulo}${unidad}` : "—"}{" "}
            <span className={enRango ? "text-teal-deep" : "text-danger"}>
              {angulo !== null ? (enRango ? "en rango" : "fuera de rango") : ""}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-ink-soft label-tech">repeticiones detectadas</p>
          <p className="font-display text-2xl text-ink">{reps}</p>
          {supervision && (
            <p className="text-xs text-teal-deep">
              {validas} correctas de {veredictos.length} revisadas
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={guardarYEmpezarOtra}
          disabled={guardando || reps === 0}
          className="text-xs font-medium text-ink border border-line rounded-sm px-3 py-2 hover:border-ink transition-colors disabled:opacity-50"
        >
          Guardar serie y empezar otra
        </button>
        <button
          type="button"
          onClick={terminarEjercicio}
          disabled={guardando}
          className="text-sm font-medium bg-teal text-paper rounded-sm px-4 py-2 hover:bg-teal-deep transition-colors disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Terminé este ejercicio"}
        </button>
        {avisoSerie && (
          <p role="status" className="w-full text-xs text-ink-soft">
            {avisoSerie}
          </p>
        )}
      </div>

      <section className="mt-6 border-t border-line pt-4" aria-label="Supervisión con IA">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base text-ink">Supervisión con IA</h3>
            <p className="text-xs text-ink-soft max-w-sm">
              Claude revisa cada repetición y te dice si fue correcta y qué
              ajustar.
            </p>
          </div>
          <button
            type="button"
            onClick={alternarSupervision}
            aria-pressed={supervision}
            className={
              "text-xs font-medium rounded-sm px-3 py-2 border transition-colors " +
              (supervision
                ? "bg-teal text-paper border-teal"
                : "text-ink border-line hover:border-ink")
            }
          >
            {supervision ? "Supervisión: activada" : "Activar supervisión"}
          </button>
        </div>

        {supervision && (
          <div className="mt-4 space-y-3">
            <div
              role="status"
              aria-live="polite"
              className={
                "text-sm rounded-sm px-3 py-2 border " +
                (mensajeIA?.estado === "corregir"
                  ? "border-danger/40 text-danger"
                  : "border-teal/40 text-teal-deep")
              }
            >
              {mensajeIA?.mensaje ??
                (revisando
                  ? "Revisando tu repetición…"
                  : "Haz tu primera repetición: la revisaré al terminarla.")}
              {revisando && mensajeIA && (
                <span className="ml-2 text-xs text-ink-soft">(revisando…)</span>
              )}
            </div>

            {veredictos.length > 0 && (
              <ol className="text-xs space-y-1">
                {[...veredictos]
                  .sort((a, b) => b.n - a.n)
                  .slice(0, 5)
                  .map((v) => (
                    <li key={v.n} className="flex gap-2">
                      <span className={v.valida ? "text-teal-deep" : "text-danger"}>
                        {v.valida ? "✓" : "✗"} Rep. {v.n}
                      </span>
                      <span className="text-ink-soft">{v.motivo}</span>
                    </li>
                  ))}
              </ol>
            )}

            {resumenIA && (
              <div className="text-sm text-ink bg-paper-dim/60 rounded-sm px-3 py-2">
                <p className="label-tech text-xs text-ink-soft mb-1">Resumen de la serie</p>
                {resumenIA}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={terminarSerie}
                disabled={resumiendo || reps === 0}
                className="text-xs font-medium text-ink border border-line rounded-sm px-3 py-2 hover:border-ink transition-colors disabled:opacity-50"
              >
                {resumiendo ? "Preparando resumen…" : "Terminar serie y ver resumen"}
              </button>
              <button
                type="button"
                onClick={guardarYEmpezarOtra}
                disabled={guardando}
                className="text-xs font-medium text-ink-soft border border-line rounded-sm px-3 py-2 hover:border-ink transition-colors disabled:opacity-50"
              >
                Nueva serie
              </button>
            </div>
          </div>
        )}

        {errorIA && <p className="mt-3 text-xs text-danger">{errorIA}</p>}

        <p className="mt-3 text-xs text-ink-soft leading-relaxed">
          Al activarla, se envían a Claude (IA de Anthropic) solo números de
          tu movimiento: ángulos, tiempos y avisos de postura. Nunca imágenes
          ni video. El conteo funciona igual sin supervisión.
        </p>
      </section>

      {vozDisp && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {guia && (
            <button
              type="button"
              onClick={escucharExplicacion}
              aria-pressed={explicando}
              className="text-xs font-medium text-ink border border-line rounded-sm px-3 py-2 hover:border-ink transition-colors"
            >
              {explicando ? "Detener explicación" : "Escuchar explicación"}
            </button>
          )}
          <button
            type="button"
            onClick={alternarVoz}
            aria-pressed={vozActiva}
            className={
              "text-xs font-medium rounded-sm px-3 py-2 border transition-colors " +
              (vozActiva
                ? "bg-teal text-paper border-teal"
                : "text-ink border-line hover:border-ink")
            }
          >
            {vozActiva ? "Voz de correcciones: activada" : "Voz de correcciones: desactivada"}
          </button>
        </div>
      )}
      <div className="mt-3 text-xs text-ink-soft">
        <p>
          <strong className="text-ink">Dónde colocarte:</strong> {colocacion}
        </p>
        {target.relativo && (
          <p className="mt-2">
            {base === null
              ? "Al empezar, quédate quieto un segundo para tomar tu postura base."
              : "Postura base tomada."}{" "}
            <button type="button" onClick={recalibrar} className="text-teal-deep underline">
              Volver a tomar la postura base
            </button>
          </p>
        )}
      </div>

      {motorNombre && (
        <p className="mt-4 text-xs text-ink-soft label-tech">
          Análisis de movimiento: {motorNombre}
          {motorPreferido === "RTMPose" && motorNombre === "MediaPipe" &&
            " (RTMPose no pudo cargar en este equipo)"}{" "}
          <button type="button" onClick={cambiarMotor} className="text-teal-deep underline normal-case">
            Cambiar a {motorNombre === "MediaPipe" ? "RTMPose" : "MediaPipe"}
          </button>
        </p>
      )}

      <p className="mt-4 text-xs text-ink-soft leading-relaxed border-t border-line pt-4">
        El video se procesa en tu dispositivo: ninguna imagen ni grabación se
        envía a un servidor; con la supervisión activada solo viajan las
        medidas numéricas del movimiento. Esta guía es un apoyo referencial y no reemplaza
        la evaluación de un profesional kinésico. Los avisos de postura usan
        umbrales provisorios que deben ser validados por un kinesiólogo. Si
        sientes dolor, detén el ejercicio.
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import type { VideoYouTube } from "@/lib/data";

/**
 * Video de YouTube "liviano": al inicio solo muestra la miniatura, y el
 * reproductor se carga recién cuando la persona toca reproducir. Así la
 * biblioteca no carga 30 reproductores a la vez ni comparte datos con
 * YouTube hasta que alguien decide ver un video.
 *
 * Una vez abierto se reproduce en bucle y sin sonido, como un GIF, desde
 * youtube-nocookie.com (modo de privacidad mejorada de YouTube).
 */
export default function VideoEjercicio({
  video,
  nombre,
}: {
  video: VideoYouTube;
  nombre: string;
}) {
  const [activo, setActivo] = useState(false);
  const parametros = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    loop: "1",
    playlist: video.id, // necesario para que "loop" funcione con un solo video
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
  });

  if (activo) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${video.id}?${parametros}`}
        title={`Demostración: ${nombre}`}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setActivo(true)}
      aria-label={`Reproducir demostración: ${nombre}`}
      className="group/video absolute inset-0 w-full h-full"
    >
      <Image
        src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
        alt=""
        fill
        // YouTube ya entrega la miniatura comprimida; pasarla por el
        // optimizador de Next.js solo agrega fallos y consume cuota.
        unoptimized
        className="object-cover"
      />
      <span className="absolute inset-0 bg-ink/10 group-hover/video:bg-ink/20 transition-colors" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper/95 shadow-md group-hover/video:scale-105 transition-transform">
          <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-0.5 fill-ink" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  );
}

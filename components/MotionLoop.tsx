export default function MotionLoop() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <svg
        viewBox="0 0 340 340"
        className="w-full h-auto"
        role="img"
        aria-label="Animación de un ejercicio de flexo-extensión de rodilla en bucle, contrastando con una guía estática de fondo"
      >
        <circle cx="170" cy="170" r="150" fill="none" stroke="var(--line)" strokeWidth="1" />

        {/* guía estática de rango, tenue: representa el folleto de papel */}
        <path
          d="M 170 90 L 170 190 L 250 230"
          fill="none"
          stroke="var(--ink-soft)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.18"
        />
        <circle cx="170" cy="190" r="6" fill="var(--ink-soft)" opacity="0.18" />

        {/* arco de rango de movimiento */}
        <path
          d="M 170 190 m -60 0 a 60 60 0 0 1 90 -52"
          fill="none"
          stroke="var(--teal)"
          strokeWidth="1.5"
          strokeDasharray="3 5"
          opacity="0.5"
        />

        {/* cadera fija */}
        <circle cx="170" cy="90" r="7" fill="var(--ink)" />
        {/* muslo fijo */}
        <line x1="170" y1="90" x2="170" y2="190" stroke="var(--ink)" strokeWidth="7" strokeLinecap="round" />
        {/* rodilla */}
        <circle cx="170" cy="190" r="7" fill="var(--ink)" />

        {/* pierna animada: rota entre flexión y extensión sobre la rodilla */}
        <g style={{ transformOrigin: "170px 190px" }} className="kine-shin">
          <line x1="170" y1="190" x2="250" y2="230" stroke="var(--kinetic-deep)" strokeWidth="7" strokeLinecap="round" />
          <circle cx="250" cy="230" r="6" fill="var(--kinetic-deep)" />
        </g>
      </svg>

      <div className="flex items-center justify-between mt-4 text-xs label-tech text-ink-soft">
        <span>rango 0°–90°</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-kinetic-deep animate-pulse" />
          en bucle
        </span>
      </div>

      <style>{`
        .kine-shin {
          animation: kine-flex 2.4s ease-in-out infinite;
        }
        @keyframes kine-flex {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-46deg); }
        }
      `}</style>
    </div>
  );
}

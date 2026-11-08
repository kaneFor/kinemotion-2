"use client";

import { useState } from "react";
import ExerciseCard from "@/components/ExerciseCard";
import { lesiones, type Ejercicio } from "@/lib/data";

/** Pestañas por lesión, solo con los ejercicios a los que el paciente tiene acceso. */
export default function BibliotecaFiltro({
  ejercicios,
  principal,
}: {
  ejercicios: Ejercicio[];
  principal?: string;
}) {
  const disponibles = lesiones.filter((l) =>
    ejercicios.some((e) => e.lesionSlug === l.slug)
  );
  const [activa, setActiva] = useState(principal ?? disponibles[0]?.slug);
  const lesion = disponibles.find((l) => l.slug === activa) ?? disponibles[0];
  const visibles = ejercicios.filter((e) => e.lesionSlug === lesion?.slug);

  if (!lesion) {
    return (
      <p className="text-sm text-ink-soft">
        No tienes ejercicios asignados todavía.
      </p>
    );
  }

  return (
    <>
      {disponibles.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-line pb-6 mb-10">
          {disponibles.map((l) => {
            const on = l.slug === lesion.slug;
            return (
              <button
                key={l.slug}
                onClick={() => setActiva(l.slug)}
                className={
                  "text-sm px-4 py-2 rounded-sm border transition-colors " +
                  (on
                    ? "bg-ink text-paper border-ink"
                    : "border-line text-ink-soft hover:border-ink hover:text-ink")
                }
              >
                {l.nombre}
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-8 max-w-xl">
        <h2 className="font-display text-xl text-ink">{lesion.nombre}</h2>
        <p className="mt-2 text-xs label-tech text-teal-deep">
          {lesion.fase.join(" · ")}
        </p>
        <p className="mt-2 text-sm text-ink-soft leading-relaxed">
          {lesion.descripcion}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-10">
        {visibles.map((e) => (
          <ExerciseCard key={e.id} ejercicio={e} />
        ))}
      </div>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import hero from "@/assets/hero-anonymos.jpg";

export const Route = createFileRoute("/graficos")({
  head: () => ({
    meta: [
      { title: "Ajustes Gráficos & Vibrance — Anonymos Performance" },
      { name: "description", content: "Saturação, contraste, brilho e presets de perfis gamer." },
      { property: "og:title", content: "Ajustes Gráficos — Anonymos Performance" },
      { property: "og:description", content: "Ajuste cores e vibrance para cada jogo." },
    ],
  }),
  component: Graphics,
});

type V = { sat: number; con: number; bri: number; gamma: number; vib: number };
const presets: Record<string, V> = {
  Padrão: { sat: 100, con: 100, bri: 100, gamma: 100, vib: 50 },
  Competitivo: { sat: 140, con: 115, bri: 105, gamma: 110, vib: 80 },
  Cinemático: { sat: 90, con: 120, bri: 95, gamma: 95, vib: 40 },
  Noturno: { sat: 85, con: 95, bri: 80, gamma: 90, vib: 30 },
};

function Graphics() {
  const [v, setV] = useState<V>(presets.Padrão);
  const [active, setActive] = useState("Padrão");
  const rows: [keyof V, string, number][] = [["sat", "Saturação", 200], ["con", "Contraste", 200], ["bri", "Brilho", 200], ["gamma", "Gama", 200], ["vib", "Vibrance digital", 100]];
  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <section className="glass space-y-5 p-5">
        <h1 className="font-display text-lg font-bold">Ajustes Gráficos</h1>
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(presets).map((p) => (
            <button key={p} onClick={() => { setV(presets[p]); setActive(p); }} className={`rounded-lg border px-3 py-2 text-sm transition ${active === p ? "border-primary bg-primary/15" : "border-border hover:bg-secondary"}`}>{p}</button>
          ))}
        </div>
        {rows.map(([k, label, max]) => (
          <label key={k} className="block">
            <div className="flex justify-between text-sm"><span>{label}</span><span className="text-muted-foreground">{v[k]}</span></div>
            <input type="range" min={0} max={max} value={v[k]} onChange={(e) => { setV({ ...v, [k]: +e.target.value }); setActive("Personalizado"); }} className="mt-2 w-full accent-primary" />
          </label>
        ))}
      </section>
      <section className="glass overflow-hidden p-5">
        <div className="mb-3 text-sm font-semibold">Pré-visualização · {active}</div>
        <img src={hero} alt="Pré-visualização" loading="lazy" width={1600} height={704} className="w-full rounded-xl" style={{ filter: `saturate(${(v.sat / 100) * (1 + (v.vib - 50) / 200)}) contrast(${v.con / 100}) brightness(${(v.bri / 100) * (v.gamma / 100) ** 0.3})` }} />
      </section>
    </div>
  );
}

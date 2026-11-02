import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Rocket, Loader2, Check } from "lucide-react";

export const Route = createFileRoute("/jogos")({
  head: () => ({
    meta: [
      { title: "Biblioteca de Jogos — Anonymos Performance" },
      { name: "description", content: "Fortnite, FiveM, CS2 e Valorant com score de boost e inicialização otimizada." },
      { property: "og:title", content: "Biblioteca de Jogos — Anonymos Performance" },
      { property: "og:description", content: "Inicie seus jogos já otimizados." },
    ],
  }),
  component: Games,
});

const games = [
  { name: "Fortnite", store: "Epic Games", score: 24.59, tag: "F" },
  { name: "FiveM", store: "Cfx.re", score: 19.82, tag: "5M" },
  { name: "Counter-Strike 2", store: "Steam", score: 31.07, tag: "CS" },
  { name: "Valorant", store: "Riot Games", score: 27.44, tag: "V" },
];

function Games() {
  const [sel, setSel] = useState(0);
  const [state, setState] = useState<"idle" | "boost" | "ok">("idle");
  const [level, setLevel] = useState(40);
  const g = games[sel]!;
  const launch = () => { setState("boost"); setTimeout(() => setState("ok"), 1800); };
  return (
    <div className="space-y-5">
      <section className="glass grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="text-xs text-muted-foreground">{g.store} · Última otimização há poucos minutos</div>
          <h1 className="mt-2 font-display text-3xl font-bold">Iniciar {g.name}</h1>
          <div className="mt-4 text-xs text-muted-foreground">Score de Boost atual</div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display text-5xl font-bold">{(g.score * (1 + level / 200)).toFixed(2)}</span>
            <button onClick={launch} disabled={state === "boost"} className="flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow">
              {state === "boost" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "ok" ? <Check className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
              {state === "boost" ? "Otimizando…" : state === "ok" ? "Iniciado otimizado" : "Inicialização otimizada"}
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/40 p-4">
          <div className="flex justify-between text-sm font-semibold">Nível de Boost <span className="text-xs text-primary">{level < 34 ? "Eco" : level < 67 ? "Equilibrado" : "Extremo"}</span></div>
          <input type="range" value={level} onChange={(e) => setLevel(+e.target.value)} className="mt-6 w-full accent-primary" />
        </div>
      </section>
      <div className="text-sm text-muted-foreground">Jogos de ação & tiro populares</div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {games.map((x, i) => (
          <button key={x.name} onClick={() => { setSel(i); setState("idle"); }} className={`relative flex h-44 flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left transition ${sel === i ? "border-primary shadow-glow" : "border-border"}`} style={{ background: `linear-gradient(160deg, color-mix(in oklab, var(--chart-${i + 1}) 45%, var(--background)), var(--background))` }}>
            <span className="w-fit rounded-md bg-background/60 px-2 py-0.5 text-[10px]">{x.store}</span>
            <span className="absolute right-3 top-8 font-display text-6xl font-extrabold opacity-20">{x.tag}</span>
            <div><div className="font-display font-bold">{x.name}</div><div className="text-xs text-muted-foreground">Boost {x.score}</div></div>
          </button>
        ))}
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Clock, Loader2, Check, MoreHorizontal } from "lucide-react";
import hero from "@/assets/hero-anonymos.jpg";
import { LineChart, useSeries } from "@/lib/live-charts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Anonymos Performance" },
      { name: "description", content: "Painel de otimização de PC com telemetria em tempo real e ações de um clique." },
      { property: "og:title", content: "Anonymos Performance" },
      { property: "og:description", content: "Otimize seu PC Windows com um clique." },
    ],
  }),
  component: Dashboard,
});

type State = "idle" | "running" | "done";
function ActionCard({ title, task, button, result }: { title: string; task: string; button: string; result: string }) {
  const [s, setS] = useState<State>("idle");
  const [p, setP] = useState(0);
  const run = () => {
    setS("running"); setP(0);
    let v = 0;
    const id = setInterval(() => { v += 8 + Math.random() * 10; setP(Math.min(100, v)); if (v >= 100) { clearInterval(id); setS("done"); } }, 150);
  };
  return (
    <div className="glass flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between text-sm font-semibold">{title}<MoreHorizontal className="h-4 w-4 text-muted-foreground" /></div>
      <div className="flex items-center gap-3 rounded-lg bg-secondary/60 p-3">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <div className="text-xs font-bold tracking-wide">{task}</div>
          <div className="text-[11px] text-muted-foreground">{s === "idle" ? "Ainda não executado" : s === "running" ? `Executando… ${Math.round(p)}%` : result}</div>
        </div>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${s === "done" ? "bg-primary/20 text-primary" : "bg-success/15 text-success"}`}>{s === "done" ? "CONCLUÍDO" : "PRONTO"}</span>
      </div>
      {s === "running" && <div className="h-1 overflow-hidden rounded bg-secondary"><div className="h-full bg-brand transition-all" style={{ width: `${p}%` }} /></div>}
      <button onClick={run} disabled={s === "running"} className="flex items-center justify-center gap-2 rounded-lg bg-foreground py-2 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-60">
        {s === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : s === "done" ? <Check className="h-4 w-4" /> : null}
        {s === "done" ? "Executar novamente" : button}
      </button>
    </div>
  );
}

function Dashboard() {
  const gpu = useSeries(50, 30, 12);
  const now = Math.round(gpu[gpu.length - 1] ?? 0);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-4">
        <section className="relative overflow-hidden rounded-2xl border border-border">
          <img src={hero} alt="Arte Anonymos" width={1600} height={704} className="h-64 w-full object-cover object-right" />
          <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-r from-background via-background/60 to-transparent p-6">
            <div>
              <h1 className="font-display text-3xl font-extrabold italic">Bem-vindo de volta, <span className="bg-brand bg-clip-text text-transparent">Anonymos</span></h1>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">Otimize seu sistema, reduza os processos em segundo plano e libere um desempenho melhor.</p>
            </div>
            <Link to="/jogos" className="flex w-fit items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background">Mais Produtos <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
        <section className="glass p-5">
          <div className="flex items-start justify-between">
            <div><div className="font-display text-sm font-bold tracking-wider">GPUSENSE</div><div className="text-xs text-muted-foreground">NVIDIA GeForce RTX 4070 · Tempo real</div></div>
            <div className="text-right"><div className="font-display text-3xl font-bold">{now}%</div><div className="text-xs text-muted-foreground">Carga 3D · {48 + Math.round(now / 5)}°C</div></div>
          </div>
          <LineChart data={gpu} height={180} className="mt-4" />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>50s</span><span>25s</span><span>agora</span></div>
        </section>
      </div>
      <div className="flex flex-col gap-4">
        <ActionCard title="Modo Limpeza" task="VARREDURA DE PROCESSOS" button="Limpar agora" result="38 processos encerrados" />
        <ActionCard title="Liberar Memória" task="COMPRESSÃO" button="Liberar agora" result="2,4 GB liberados" />
        <ActionCard title="Segundo Plano" task="PROCESSOS" button="Parar agora" result="14 apps pausados" />
      </div>
    </div>
  );
}

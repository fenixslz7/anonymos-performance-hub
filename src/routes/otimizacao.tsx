import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, Shield, Gamepad2, RefreshCw, Package, Search, Zap, Bell, Cloud, Printer } from "lucide-react";

export const Route = createFileRoute("/otimizacao")({
  head: () => ({
    meta: [
      { title: "Árvore de Otimização — Anonymos Performance" },
      { name: "description", content: "Desative serviços desnecessários do Windows com um interruptor." },
      { property: "og:title", content: "Árvore de Otimização — Anonymos Performance" },
      { property: "og:description", content: "Telemetria, Game Bar, Windows Update e mais, sob controle." },
    ],
  }),
  component: Tree,
});

const left = [
  { id: "tel", label: "Telemetria", icon: Activity },
  { id: "def", label: "Windows Defender", icon: Shield },
  { id: "xbox", label: "Xbox Game Bar", icon: Gamepad2 },
  { id: "upd", label: "Windows Update", icon: RefreshCw },
  { id: "apps", label: "Apps pré-instalados", icon: Package },
];
const right = [
  { id: "idx", label: "Indexação de busca", icon: Search },
  { id: "perf", label: "Plano de energia máximo", icon: Zap },
  { id: "notif", label: "Notificações", icon: Bell },
  { id: "od", label: "Sincronização OneDrive", icon: Cloud },
  { id: "spool", label: "Spooler de impressão", icon: Printer },
];

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return <button role="switch" aria-checked={on} onClick={onClick} className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-brand" : "bg-muted"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-all ${on ? "left-4" : "left-0.5"}`} /></button>;
}

function Tree() {
  const [on, setOn] = useState<Record<string, boolean>>({ tel: true, xbox: true });
  const count = Object.values(on).filter(Boolean).length;
  const Node = ({ n }: { n: (typeof left)[number] }) => (
    <div className={`glass flex items-center gap-3 px-3 py-2.5 transition ${on[n.id] ? "shadow-glow" : ""}`}>
      <n.icon className={`h-4 w-4 ${on[n.id] ? "text-primary" : "text-muted-foreground"}`} />
      <span className="flex-1 text-sm">{n.label}</span>
      <Switch on={!!on[n.id]} onClick={() => setOn((s) => ({ ...s, [n.id]: !s[n.id] }))} />
    </div>
  );
  const lines = (side: "l" | "r") => left.map((_, i) => {
    const y = 10 + i * 20;
    return <path key={i} d={side === "l" ? `M0 ${y} C 50 ${y}, 50 50, 100 50` : `M100 ${y} C 50 ${y}, 50 50, 0 50`} fill="none" stroke={on[(side === "l" ? left : right)[i].id] ? "var(--primary)" : "var(--border)"} strokeWidth="0.6" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 2 }} />;
  });
  return (
    <div>
      <div className="mb-6 text-center"><h1 className="font-display text-2xl font-bold">Árvore de Otimização</h1><p className="text-sm text-muted-foreground">{count} otimizações ativas · desative o que não precisa</p></div>
      <div className="grid items-center gap-2 lg:grid-cols-[1fr_80px_auto_80px_1fr]">
        <div className="space-y-3">{left.map((n) => <Node key={n.id} n={n} />)}</div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="hidden h-72 w-full lg:block">{lines("l")}</svg>
        <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-brand shadow-glow">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-background text-center font-display text-xs font-bold tracking-widest">ANONY<br />MOS</div>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="hidden h-72 w-full lg:block">{lines("r")}</svg>
        <div className="space-y-3">{right.map((n) => <Node key={n.id} n={n} />)}</div>
      </div>
    </div>
  );
}

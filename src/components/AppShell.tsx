import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { LayoutDashboard, Hexagon, GitBranch, SlidersHorizontal, Gamepad2, Minus, Square, X, Bot, Wifi, Trash2, Power, History, Gauge } from "lucide-react";
import { Assistant } from "./Assistant";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/monitor", label: "Monitor", icon: Hexagon },
  { to: "/otimizacao", label: "Otimização", icon: GitBranch },
  { to: "/graficos", label: "Gráficos", icon: SlidersHorizontal },
  { to: "/jogos", label: "Jogos", icon: Gamepad2 },
  { to: "/internet", label: "Internet", icon: Wifi },
  { to: "/limpeza", label: "Limpeza", icon: Trash2 },
  { to: "/inicializacao", label: "Inicialização", icon: Power },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/benchmark", label: "Benchmark", icon: Gauge },
] as const;

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-brand shadow-glow">
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-primary-foreground" fill="currentColor"><path d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 4 5 3-5 3-5-3 5-3Z" /></svg>
      </div>
      <div className="leading-tight">
        <div className="font-display text-sm font-bold tracking-[0.2em]">ANONYMOS</div>
        <div className="text-[10px] tracking-[0.35em] text-muted-foreground">PERFORMANCE</div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState(false);
  const desktop = typeof window !== "undefined" ? window.anonymosDesktop : undefined;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <Logo />
        <div className="flex items-center gap-1">
          <button onClick={() => setOpen(!open)} className="assistant-launch mr-3 flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-[10px] font-bold tracking-wider transition hover:border-primary/60 hover:bg-primary/10">
            <span className="relative"><Bot className="h-4 w-4 text-primary" /><span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_8px_var(--success)]" /></span> ANONYMOS GUIDE
          </button>
          {desktop && (
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Minimizar janela" title="Minimizar" onClick={() => void desktop.minimize()} className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-secondary hover:text-foreground">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label="Maximizar ou restaurar janela" title="Maximizar ou restaurar" onClick={() => void desktop.toggleMaximize()} className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-secondary hover:text-foreground">
                <Square className="h-3 w-3" />
              </button>
              <button type="button" aria-label="Fechar aplicativo" title="Fechar" onClick={() => void desktop.close()} className="grid h-7 w-7 place-items-center rounded text-muted-foreground transition hover:bg-destructive hover:text-destructive-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border p-3 md:flex">
          {nav.map((n) => {
            const active = path === n.to;
            return (
              <Link key={n.to} to={n.to} className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide transition duration-200 ${active ? "bg-primary/10 text-foreground shadow-glow" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}>
                <span className={`absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-primary transition-opacity ${active ? "opacity-100" : "opacity-0"}`} /><n.icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${active ? "text-primary" : ""} ${n.to === "/internet" ? "network-link-icon" : ""}`} /> {n.label}
              </Link>
            );
          })}
          <div className="mt-auto glass p-3 text-xs">
            <div className="flex items-center gap-2 font-semibold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary"><Hexagon className="h-4 w-4" /></span> ANONYMOS HUB</div>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Painel local · Windows</div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto p-5">
          <nav className="mb-4 flex gap-2 overflow-x-auto md:hidden">
            {nav.map((n) => <Link key={n.to} to={n.to} title={n.to === "/internet" ? "Abrir diagnóstico e velocidade da conexão" : n.label} className={`inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs transition hover:border-primary/50 hover:bg-secondary ${path === n.to ? "bg-secondary" : ""}`}>{n.to === "/internet" ? <Wifi className="network-link-icon h-3.5 w-3.5 text-primary" /> : null}{n.label}</Link>)}
          </nav>
          {children}
        </main>
        <Assistant open={open} onClose={() => setOpen(false)} />
      </div>
    </div>
  );
}

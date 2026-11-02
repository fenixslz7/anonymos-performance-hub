import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { LayoutDashboard, Hexagon, GitBranch, SlidersHorizontal, Gamepad2, Minus, Square, X, Bot } from "lucide-react";
import { Assistant } from "./Assistant";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/monitor", label: "Monitor", icon: Hexagon },
  { to: "/otimizacao", label: "Otimização", icon: GitBranch },
  { to: "/graficos", label: "Gráficos", icon: SlidersHorizontal },
  { to: "/jogos", label: "Jogos", icon: Gamepad2 },
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
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <Logo />
        <div className="flex items-center gap-1">
          <button onClick={() => setOpen(!open)} className="mr-3 flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary">
            <Bot className="h-3.5 w-3.5 text-primary" /> Anonymos IA
          </button>
          {[Minus, Square, X].map((I, i) => (
            <span key={i} className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-secondary"><I className="h-3.5 w-3.5" /></span>
          ))}
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border p-3 md:flex">
          {nav.map((n) => {
            const active = path === n.to;
            return (
              <Link key={n.to} to={n.to} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-secondary text-foreground shadow-glow" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}>
                <n.icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} /> {n.label}
              </Link>
            );
          })}
          <div className="mt-auto glass p-3 text-xs">
            <div className="font-semibold">Anonymos <span className="ml-1 rounded bg-brand px-1.5 py-0.5 text-[9px] text-primary-foreground">PRO</span></div>
            <div className="text-muted-foreground">Licença ativa</div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto p-5">
          <nav className="mb-4 flex gap-2 overflow-x-auto md:hidden">
            {nav.map((n) => <Link key={n.to} to={n.to} className={`rounded-full border border-border px-3 py-1 text-xs ${path === n.to ? "bg-secondary" : ""}`}>{n.label}</Link>)}
          </nav>
          {children}
        </main>
        <Assistant open={open} onClose={() => setOpen(false)} />
      </div>
    </div>
  );
}

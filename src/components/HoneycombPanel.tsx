import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cpu, HardDrive, MemoryStick, Monitor, Wifi, type LucideIcon } from "lucide-react";

export type HoneycombMetric = {
  id: string;
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
};

export function HoneycombPanel({ metrics }: { metrics: HoneycombMetric[] }) {
  const [activeId, setActiveId] = useState(metrics[0]?.id ?? "");
  const active = metrics.find((metric) => metric.id === activeId) ?? metrics[0];

  if (!metrics.length) return null;

  return (
    <section className="glass relative overflow-hidden p-5 md:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-primary/10" />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,.8fr)] lg:items-center">
        <div>
          <div className="mb-1 text-[10px] font-bold tracking-[.2em] text-primary">ANONYMOS HIVE</div>
          <h2 className="font-display text-lg font-bold">Núcleo de performance</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Selecione uma célula da colmeia para consultar cada área do computador.</p>
          <div className="mx-auto mt-5 grid max-w-[430px] grid-cols-3 gap-1.5 sm:gap-2">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              const selected = metric.id === activeId;
              return (
                <button
                  key={metric.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveId(metric.id)}
                  className={`hive-cell group relative flex aspect-square flex-col items-center justify-center gap-1 p-2 text-center transition duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? "hive-cell-active" : ""} ${index === 1 || index === 3 ? "sm:translate-y-5" : ""}`}
                >
                  <Icon className={`h-5 w-5 transition group-hover:scale-110 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-[9px] font-bold tracking-[.12em] text-foreground sm:text-[10px]">{metric.label}</span>
                  <span className="max-w-full truncate text-[10px] font-semibold tabular-nums text-primary sm:text-xs">{metric.value}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background/70 to-background p-5">
          <div className="pointer-events-none absolute -right-8 -top-10 opacity-10"><svg viewBox="0 0 160 160" className="h-40 w-40 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m40 4 40 0 20 35-20 35H40L20 39 40 4Zm60 35h40l20 35-20 35h-40l-20-35 20-35ZM0 109h40l20 35-20 35H0l-20-35 20-35Z"/></svg></div>
          {active && (() => {
            const Icon = active.icon;
            return <div className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
              <div className="mt-5 text-[10px] font-bold tracking-[.18em] text-primary">MÓDULO SELECIONADO</div>
              <h3 className="mt-1 font-display text-2xl font-extrabold">{active.label}</h3>
              <div className="mt-2 font-display text-3xl font-bold tabular-nums">{active.value}</div>
              <p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">{active.detail}</p>
              {active.id === "net" && <Link to="/internet" className="mt-4 inline-flex items-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110">Abrir diagnóstico de Internet</Link>}
              <div className="mt-5 flex items-center gap-2 text-[10px] text-muted-foreground"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Valores preenchidos apenas quando há leitura disponível.</div>
            </div>;
          })()}
        </div>
      </div>
    </section>
  );
}

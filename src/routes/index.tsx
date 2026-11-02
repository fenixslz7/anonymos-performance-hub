import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  CircleAlert,
  Cpu,
  Gamepad2,
  HardDrive,
  MemoryStick,
  MonitorCog,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — ANONYMOS PERFORMANCE" },
      { name: "description", content: "Central de monitoramento e gerenciamento do ANONYMOS PERFORMANCE." },
      { property: "og:title", content: "ANONYMOS PERFORMANCE" },
      { property: "og:description", content: "Central de desempenho do seu PC Windows." },
    ],
  }),
  component: Dashboard,
});

const metrics = [
  { label: "Processador", detail: "Telemetria nativa pendente", icon: Cpu },
  { label: "Placa de vídeo", detail: "Telemetria nativa pendente", icon: MonitorCog },
  { label: "Memória RAM", detail: "Telemetria nativa pendente", icon: MemoryStick },
  { label: "Armazenamento", detail: "Telemetria nativa pendente", icon: HardDrive },
];

const modules = [
  { title: "Monitor do sistema", description: "Acompanhe recursos e processos do Windows.", to: "/monitor", icon: Activity, label: "Abrir monitor" },
  { title: "Game Booster", description: "Prepare a experiência para seus jogos.", to: "/jogos", icon: Gamepad2, label: "Ver jogos" },
  { title: "Central de otimização", description: "Revise as opções de desempenho disponíveis.", to: "/otimizacao", icon: ShieldCheck, label: "Ver opções" },
];

function Dashboard() {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-card to-background p-6 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-primary/15" />
        <div className="pointer-events-none absolute -right-4 -top-12 h-48 w-48 rounded-full border border-primary/20" />
        <div className="relative max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            CENTRAL DE PERFORMANCE
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Controle total do seu <span className="text-primary">sistema.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Diagnóstico, monitoramento e ferramentas para Windows em um só lugar.
            Os dados do hardware serão exibidos quando a integração nativa estiver conectada.
          </p>
          <Link to="/monitor" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110">
            Abrir monitor <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold">Visão geral do hardware</h2>
            <p className="text-xs text-muted-foreground">Leituras reais do computador — sem valores estimados ou inventados.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[10px] font-semibold text-warning">
            <CircleAlert className="h-3 w-3" /> Integração em desenvolvimento
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="glass flex min-h-32 flex-col justify-between gap-4 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{metric.label}</span>
                <metric.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="font-display text-xl font-bold text-muted-foreground">—</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{metric.detail}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-display text-lg font-bold">Ferramentas</h2>
          <p className="text-xs text-muted-foreground">Acesse os módulos do ANONYMOS PERFORMANCE.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {modules.map((module) => (
            <article key={module.to} className="glass flex flex-col gap-4 p-5 transition hover:border-primary/40">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <module.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-sm font-bold">{module.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{module.description}</p>
              </div>
              <Link to={module.to} className="inline-flex w-fit items-center gap-2 text-xs font-semibold text-primary hover:underline">
                {module.label} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="glass flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Segurança em primeiro lugar</div>
          <p className="text-xs leading-5 text-muted-foreground">
            Nenhuma limpeza, alteração do Windows ou encerramento de processo será executado sem integração real, explicação e confirmação.
          </p>
        </div>
        <span className="w-fit rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground">Modo seguro</span>
      </section>
    </div>
  );
}

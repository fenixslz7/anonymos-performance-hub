import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, CircleAlert, Cpu, Gamepad2, HardDrive, MemoryStick, MonitorCog, ShieldCheck, Wifi } from "lucide-react";
import { HoneycombPanel } from "@/components/HoneycombPanel";
import type { AnonymosSystemSnapshot } from "@/types/anonymos-desktop";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — ANONYMOS PERFORMANCE" }, { name: "description", content: "Central de monitoramento e gerenciamento do ANONYMOS PERFORMANCE." }] }),
  component: Dashboard,
});

const formatBytes = (n: number) => { if (!Number.isFinite(n) || n <= 0) return "—"; const u=["B","KB","GB","TB"]; let i=0; while(n>=1024&&i<u.length-1){n/=1024;i++;} return `${n.toFixed(1)} ${u[i]}`; };
const modules = [
  { title: "Monitor do sistema", description: "Acompanhe recursos e processos reais do Windows.", to: "/monitor", icon: Activity, label: "Abrir monitor" },
  { title: "Game Launcher", description: "Localize e abra executáveis dos seus jogos.", to: "/jogos", icon: Gamepad2, label: "Ver jogos" },
  { title: "Otimização segura", description: "Gerencie o plano de energia do Windows.", to: "/otimizacao", icon: ShieldCheck, label: "Ver opções" },
];

function Dashboard() {
  const [snapshot, setSnapshot] = useState<AnonymosSystemSnapshot | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!window.anonymosDesktop) { setError("Abra a versão desktop para consultar o hardware."); return; }
      try { const data = await window.anonymosDesktop.getSystemSnapshot(); if (active) { setSnapshot(data); setError(""); } }
      catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Telemetria indisponível."); }
    };
    void refresh(); const id=window.setInterval(()=>void refresh(),5000);
    return ()=>{active=false;window.clearInterval(id);};
  }, []);
  const gpu = snapshot?.gpu.map(x=>x.name).join(", ") || "Não identificado";
  const metrics = [
    { label: "Processador", value: snapshot?.cpu.loadPercent == null ? "—" : `${snapshot.cpu.loadPercent}%`, detail: snapshot?.cpu.name ?? "Aguardando telemetria", icon: Cpu },
    { label: "Placa de vídeo", value: snapshot ? `${snapshot.gpu.length} detectada(s)` : "—", detail: gpu, icon: MonitorCog },
    { label: "Memória RAM", value: snapshot ? `${snapshot.memory.usedPercent}%` : "—", detail: snapshot ? `${formatBytes(snapshot.memory.usedBytes)} usados de ${formatBytes(snapshot.memory.totalBytes)}` : "Aguardando telemetria", icon: MemoryStick },
    { label: "Armazenamento", value: snapshot ? `${snapshot.disks.length} unidade(s)` : "—", detail: snapshot?.disks.map(d=>`${d.name}: ${formatBytes(d.freeBytes)} livres`).join(" · ") ?? "Aguardando telemetria", icon: HardDrive },
  ];
  return <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
    <section className="relative overflow-hidden rounded-2xl border border-border bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-card to-background p-6 md:p-8">
      <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-primary/15" /><div className="pointer-events-none absolute -right-4 -top-12 h-48 w-48 rounded-full border border-primary/20" />
      <div className="relative max-w-2xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> CENTRAL DE PERFORMANCE</div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">Controle total do seu <span className="text-primary">sistema.</span></h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Diagnóstico e ferramentas para Windows. Leituras nativas são atualizadas automaticamente.</p>
        <Link to="/monitor" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110">Abrir monitor <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </section>
    <HoneycombPanel metrics={[
      { id: "cpu", label: "CPU", value: snapshot?.cpu.loadPercent == null ? "N/D" : String(snapshot.cpu.loadPercent) + "%", detail: snapshot?.cpu.name ?? "Aguardando leitura nativa do processador.", icon: Cpu },
      { id: "ram", label: "RAM", value: snapshot ? String(snapshot.memory.usedPercent) + "%" : "N/D", detail: snapshot ? formatBytes(snapshot.memory.usedBytes) + " usados de " + formatBytes(snapshot.memory.totalBytes) + "." : "Aguardando leitura da memória.", icon: MemoryStick },
      { id: "gpu", label: "GPU", value: snapshot ? snapshot.gpu.length + " detectada(s)" : "N/D", detail: snapshot?.gpu.map((item) => item.name).join(" · ") || "Adaptadores gráficos ainda não identificados.", icon: MonitorCog },
      { id: "ssd", label: "DISCOS", value: snapshot ? snapshot.disks.length + " unidade(s)" : "N/D", detail: snapshot?.disks.map((disk) => disk.name + ": " + formatBytes(disk.freeBytes) + " livres").join(" · ") || "Aguardando leitura das unidades.", icon: HardDrive },
      { id: "net", label: "REDE", value: "Abrir", detail: "O diagnóstico de rede mede latência, perda de pacotes, adaptadores e DNS na área Internet.", icon: Wifi },
    ]} />
    <section className="space-y-3"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="font-display text-lg font-bold">Visão geral do hardware</h2><p className="text-xs text-muted-foreground">Dados coletados do Windows, sem métricas inventadas.</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{snapshot ? "Telemetria conectada" : "Aguardando integração"}</span></div>
      {error && <p role="status" className="text-xs text-warning">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(metric=><article key={metric.label} className="glass flex min-h-32 flex-col justify-between gap-4 p-4"><div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">{metric.label}</span><metric.icon className="h-4 w-4 text-primary" /></div><div><div className="font-display text-xl font-bold">{metric.value}</div><div className="mt-1 truncate text-[11px] text-muted-foreground" title={metric.detail}>{metric.detail}</div></div></article>)}</div>
    </section>
    {snapshot && <section className="glass p-4"><div className="text-sm font-semibold">{snapshot.computer} · {snapshot.manufacturer} {snapshot.model}</div><p className="mt-1 text-xs text-muted-foreground">{snapshot.os.caption} · Build {snapshot.os.build} · Última inicialização: {new Date(snapshot.os.lastBoot).toLocaleString()}</p></section>}
    <section className="space-y-3"><div><h2 className="font-display text-lg font-bold">Ferramentas</h2><p className="text-xs text-muted-foreground">Módulos disponíveis nesta versão.</p></div><div className="grid gap-3 lg:grid-cols-3">{modules.map(module=><article key={module.to} className="glass flex flex-col gap-4 p-5 transition hover:border-primary/40"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><module.icon className="h-5 w-5" /></div><div className="flex-1"><h3 className="font-display text-sm font-bold">{module.title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{module.description}</p></div><Link to={module.to} className="inline-flex w-fit items-center gap-2 text-xs font-semibold text-primary hover:underline">{module.label} <ArrowRight className="h-3.5 w-3.5" /></Link></article>)}</div></section>
    <section className="glass flex flex-col gap-3 p-4 sm:flex-row sm:items-center"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="h-4 w-4" /></div><div className="flex-1"><div className="text-sm font-semibold">Segurança em primeiro lugar</div><p className="text-xs leading-5 text-muted-foreground">Alterações do Windows exigem confirmação e são limitadas a operações explicitamente permitidas.</p></div><span className="w-fit rounded-full border border-border px-2.5 py-1 text-[10px] text-muted-foreground">Modo seguro</span></section>
  </div>;
}

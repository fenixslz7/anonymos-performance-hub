import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, Cpu, Gamepad2, Gauge, HardDrive, MemoryStick, MonitorCog, ShieldCheck, Wifi, Zap, Trash2 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import hero from "@/assets/hero-anonymos.jpg";
import { HoneycombPanel } from "@/components/HoneycombPanel";
import type { AnonymosSystemSnapshot } from "@/types/anonymos-desktop";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — ANONYMOS PERFORMANCE" }, { name: "description", content: "Central de monitoramento e gerenciamento do ANONYMOS PERFORMANCE." }] }),
  component: Dashboard,
});

type Sample = { time: string; cpu: number | null; ram: number };
const formatBytes = (n: number) => {
  if (!Number.isFinite(n) || n <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = n, index = 0;
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; }
  return `${value.toFixed(1)} ${units[index]}`;
};

const modules = [
  { title: "Monitor de hardware", description: "CPU, RAM, GPU, armazenamento e processos em tempo real.", to: "/monitor", label: "Abrir monitor", icon: Activity, tag: "LIVE" },
  { title: "Game Center", description: "Biblioteca visual e inicialização dos seus jogos instalados.", to: "/jogos", label: "Abrir biblioteca", icon: Gamepad2, tag: "GAMES" },
  { title: "Otimização", description: "Ajustes de energia do Windows, com confirmação e reversão.", to: "/otimizacao", label: "Ver otimizações", icon: Zap, tag: "SYSTEM" },
  { title: "Limpeza inteligente", description: "Analise temporários e confira o que pode ser removido.", to: "/limpeza", label: "Abrir limpeza", icon: Trash2, tag: "CLEAN" },
];

function Dashboard() {
  const [snapshot, setSnapshot] = useState<AnonymosSystemSnapshot | null>(null);
  const [history, setHistory] = useState<Sample[]>([]);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const api = window.anonymosDesktop;
      if (!api) { setError("Abra a versão desktop para consultar as leituras reais do Windows."); return; }
      try {
        const data = await api.getSystemSnapshot();
        if (!active) return;
        setSnapshot(data);
        setUpdatedAt(new Date(data.capturedAt).toLocaleTimeString());
        setHistory((current) => [...current, {
          time: new Date(data.capturedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          cpu: data.cpu.loadPercent,
          ram: data.memory.usedPercent,
        }].slice(-18));
        setError("");
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Telemetria indisponível.");
      }
    };
    void refresh();
    const id = window.setInterval(() => void refresh(), 5000);
    return () => { active = false; window.clearInterval(id); };
  }, []);

  const gpuNames = snapshot?.gpu.map((item) => item.name).join(" · ") || "GPU não identificada";
  const gpuMemory = snapshot?.gpu.map((item) => item.adapterRamBytes ? formatBytes(item.adapterRamBytes) : "VRAM N/D").join(" · ") || "Aguardando detecção";
  const metrics = [
    { label: "CPU", value: snapshot?.cpu.loadPercent == null ? "N/D" : `${Math.round(snapshot.cpu.loadPercent)}%`, detail: snapshot?.cpu.name ?? "Aguardando telemetria", icon: Cpu, fill: snapshot?.cpu.loadPercent ?? 0 },
    { label: "GPU SENSE", value: snapshot ? `${snapshot.gpu.length} adaptador(es)` : "N/D", detail: gpuNames, icon: MonitorCog, fill: 0 },
    { label: "MEMÓRIA RAM", value: snapshot ? `${Math.round(snapshot.memory.usedPercent)}%` : "N/D", detail: snapshot ? `${formatBytes(snapshot.memory.usedBytes)} de ${formatBytes(snapshot.memory.totalBytes)}` : "Aguardando telemetria", icon: MemoryStick, fill: snapshot?.memory.usedPercent ?? 0 },
    { label: "ARMAZENAMENTO", value: snapshot ? `${snapshot.disks.length} unidade(s)` : "N/D", detail: snapshot?.disks.map((disk) => `${disk.name}: ${formatBytes(disk.freeBytes)} livres`).join(" · ") ?? "Aguardando telemetria", icon: HardDrive, fill: 0 },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
      <section className="dashboard-hero relative isolate min-h-[285px] overflow-hidden rounded-2xl border border-primary/20">
        <img src={hero} alt="Arte de identidade visual do ANONYMOS PERFORMANCE" className="absolute inset-0 -z-20 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#080711]/95 via-[#0c0a19]/80 to-[#090812]/35" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-background/85 via-transparent to-primary/10" />
        <div className="hero-scan absolute inset-0 -z-10 opacity-30" />
        <div className="relative flex min-h-[285px] flex-col justify-between gap-7 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-black/30 px-3 py-1.5 text-[10px] font-extrabold tracking-[.2em] text-primary"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> PERFORMANCE CONTROL CENTER</div>
            <div className="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[10px] font-semibold text-white/70">{updatedAt ? `LIVE · ${updatedAt}` : "AGUARDANDO SISTEMA"}</div>
          </div>
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold tracking-[.28em] text-white/60">ANONYMOS // SYSTEM INTERFACE</div>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-white md:text-5xl">Performance no <span className="hero-title-glow">próximo nível.</span></h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">Monitore seu hardware, prepare seus jogos e gerencie o Windows em uma central feita para performance.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/monitor" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-glow transition hover:-translate-y-0.5 hover:brightness-110">Abrir monitor <ArrowRight className="h-4 w-4" /></Link>
              <Link to="/jogos" className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-black/25 px-4 py-2.5 text-xs font-bold text-white transition hover:border-primary/60 hover:bg-primary/15"><Gamepad2 className="h-4 w-4" /> Game Center</Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-[10px] font-semibold tracking-wider text-white/55">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> AÇÕES COM CONTROLE</span>
            <span className="inline-flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-primary" /> TELEMETRIA LOCAL</span>
            <span className="inline-flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5 text-primary" /> SEM MÉTRICAS FALSAS</span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><div className="text-[10px] font-bold tracking-[.2em] text-primary">HARDWARE OVERVIEW</div><h2 className="mt-1 font-display text-lg font-bold">Status do computador</h2></div>
          <span className="rounded-full border border-border px-3 py-1 text-[10px] text-muted-foreground">{snapshot ? "Atualização automática a cada 5 segundos" : "Conecte o aplicativo desktop para iniciar"}</span>
        </div>
        {error && <p role="status" className="text-xs text-warning">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => <article key={metric.label} className="hardware-card glass group relative min-h-[142px] overflow-hidden p-4 transition duration-300 hover:-translate-y-1 hover:border-primary/50">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/25" />
            <div className="relative flex items-center justify-between"><span className="text-[10px] font-extrabold tracking-[.16em] text-muted-foreground">{metric.label}</span><metric.icon className="h-5 w-5 text-primary transition group-hover:scale-110" /></div>
            <div className="relative mt-4 font-display text-2xl font-extrabold tabular-nums">{metric.value}</div>
            <p className="relative mt-1 truncate text-[10px] text-muted-foreground" title={metric.detail}>{metric.detail}</p>
            {(metric.label === "CPU" || metric.label === "MEMÓRIA RAM") && <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, metric.fill))}%` }} /></div>}
          </article>)}
        </div>
        {snapshot && <div className="glass flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-[10px] text-muted-foreground"><span><strong className="text-foreground">GPU:</strong> {gpuNames} <span className="opacity-70">· Memória reportada: {gpuMemory}</span></span><span><strong className="text-foreground">PC:</strong> {snapshot.computer}</span><span><strong className="text-foreground">SO:</strong> {snapshot.os.caption} · Build {snapshot.os.build}</span></div>}
      </section>

      <HoneycombPanel metrics={[
        { id: "cpu", label: "CPU", value: snapshot?.cpu.loadPercent == null ? "N/D" : String(Math.round(snapshot.cpu.loadPercent)) + "%", detail: snapshot?.cpu.name ?? "Aguardando leitura nativa do processador.", icon: Cpu },
        { id: "ram", label: "RAM", value: snapshot ? String(Math.round(snapshot.memory.usedPercent)) + "%" : "N/D", detail: snapshot ? formatBytes(snapshot.memory.usedBytes) + " usados de " + formatBytes(snapshot.memory.totalBytes) + "." : "Aguardando leitura da memória.", icon: MemoryStick },
        { id: "gpu", label: "GPU", value: snapshot ? snapshot.gpu.length + " detectada(s)" : "N/D", detail: gpuNames + " · " + gpuMemory, icon: MonitorCog },
        { id: "ssd", label: "DISCOS", value: snapshot ? snapshot.disks.length + " unidade(s)" : "N/D", detail: snapshot?.disks.map((disk) => disk.name + ": " + formatBytes(disk.freeBytes) + " livres").join(" · ") || "Aguardando leitura das unidades.", icon: HardDrive },
        { id: "net", label: "REDE", value: "Abrir", detail: "Acesse o diagnóstico para medir latência, perda de pacotes, adaptadores, DNS e velocidade.", icon: Wifi },
      ]} />

      <section className="glass p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div><div className="text-[10px] font-bold tracking-[.2em] text-primary">LIVE PERFORMANCE GRAPH</div><h2 className="mt-1 font-display text-lg font-bold">Histórico de uso</h2><p className="mt-1 text-xs text-muted-foreground">Amostras reais coletadas no aplicativo · intervalo de 5 segundos.</p></div>
          <div className="flex gap-3 text-[10px]"><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-primary" /> CPU</span><span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-cyan-400" /> RAM</span></div>
        </div>
        <div className="h-[230px] w-full">
          {history.length > 1 ? <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 8, right: 12, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9B70FF" stopOpacity={0.38} /><stop offset="95%" stopColor="#9B70FF" stopOpacity={0} /></linearGradient>
                <linearGradient id="ramFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22D3EE" stopOpacity={0.22} /><stop offset="95%" stopColor="#22D3EE" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,.07)" strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "#858195", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={28} />
              <YAxis domain={[0, 100]} tick={{ fill: "#858195", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => value + "%"} />
              <Tooltip contentStyle={{ background: "#171522", border: "1px solid rgba(155,112,255,.35)", borderRadius: 12, fontSize: 11 }} formatter={(value) => value == null ? ["N/D", ""] : [Number(value).toFixed(1) + "%"]} />
              <Area type="monotone" dataKey="cpu" name="CPU" stroke="#9B70FF" strokeWidth={2} fill="url(#cpuFill)" connectNulls={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="ram" name="RAM" stroke="#22D3EE" strokeWidth={2} fill="url(#ramFill)" connectNulls={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer> : <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border text-center"><Activity className="mb-2 h-7 w-7 text-primary/60" /><p className="text-sm font-semibold">Coletando histórico do hardware</p><p className="mt-1 text-xs text-muted-foreground">O gráfico aparece após duas leituras válidas da telemetria.</p></div>}
        </div>
      </section>

      <section className="space-y-3">
        <div><div className="text-[10px] font-bold tracking-[.2em] text-primary">QUICK ACCESS</div><h2 className="mt-1 font-display text-lg font-bold">Central de ferramentas</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => <Link key={module.to} to={module.to} className="module-tile glass group flex min-h-[170px] flex-col justify-between p-4 transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow">
            <div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition group-hover:scale-110 group-hover:bg-primary/20"><module.icon className="h-5 w-5" /></div><span className="rounded-full border border-border px-2 py-1 text-[9px] font-bold tracking-[.16em] text-muted-foreground">{module.tag}</span></div>
            <div><h3 className="font-display text-sm font-bold">{module.title}</h3><p className="mt-1 text-[11px] leading-5 text-muted-foreground">{module.description}</p><span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-primary">{module.label} <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" /></span></div>
          </Link>)}
        </div>
      </section>
    </div>
  );
}

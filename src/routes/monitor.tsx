import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { AnonymosProcessInfo, AnonymosSystemSnapshot } from "@/types/anonymos-desktop";
import { Cpu, HardDrive, MemoryStick, MonitorCog, Wifi, Zap, RotateCcw } from "lucide-react";
import { HoneycombPanel } from "@/components/HoneycombPanel";

export const Route = createFileRoute("/monitor")({
  head: () => ({ meta: [{ title: "Monitor do sistema — ANONYMOS PERFORMANCE" }, { name: "description", content: "Telemetria nativa do Windows e lista de processos." }] }),
  component: Monitor,
});

const bytes = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return "—";
  const units = ["B", "KB", "GB", "TB"];
  let n = value, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};
const percent = (value: number | null | undefined) => value == null ? "N/D" : `${Math.round(value)}%`;

function Monitor() {
  const [snapshot, setSnapshot] = useState<AnonymosSystemSnapshot | null>(null);
  const [processes, setProcesses] = useState<AnonymosProcessInfo[]>([]);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [terminatingPid, setTerminatingPid] = useState<number | null>(null);
  const [priorityPid, setPriorityPid] = useState<number | null>(null);
  const [processMessage, setProcessMessage] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const api = window.anonymosDesktop;
      if (!api) { setError("A telemetria nativa está disponível no aplicativo instalado para Windows."); return; }
      try {
        const [nextSnapshot, nextProcesses] = await Promise.all([api.getSystemSnapshot(), api.getProcesses()]);
        if (!active) return;
        setSnapshot(nextSnapshot);
        setProcesses(nextProcesses);
        setUpdatedAt(new Date().toLocaleTimeString());
        setError("");
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Não foi possível consultar o Windows.");
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const memory = snapshot?.memory;
  const protectedNames = new Set(["system", "idle", "registry", "smss", "csrss", "wininit", "services", "lsass", "svchost", "winlogon", "dwm", "fontdrvhost", "secure system", "memory compression", "electron", "node", "anonymos performance"]);
  const boostableGameNames = new Set(["fivem", "gta5", "gta5_enhanced", "fortniteclient-win64-shipping", "cs2", "valorant-win64-shipping", "valorant"]);
  const updateProcess = (pid: number, priorityBoosted: boolean) => {
    setProcesses((current) => current.map((item) => item.pid === pid ? { ...item, priorityBoosted } : item));
  };
  const boostGamePriority = async (processInfo: AnonymosProcessInfo) => {
    if (!window.anonymosDesktop || !processInfo.startTime || !boostableGameNames.has(processInfo.name.toLowerCase()) || priorityPid !== null || terminatingPid !== null) return;
    if (!window.confirm("Elevar temporariamente a prioridade de " + processInfo.name + ".exe para Acima do normal? O ANONYMOS salvará a prioridade atual para restaurar depois.")) return;
    setPriorityPid(processInfo.pid);
    setProcessMessage("");
    try {
      const result = await window.anonymosDesktop.boostProcessPriority({ pid: processInfo.pid, name: processInfo.name, startTime: processInfo.startTime });
      updateProcess(processInfo.pid, true);
      setProcessMessage(result.alreadyBoosted ? "A prioridade deste jogo já estava elevada pelo ANONYMOS." : processInfo.name + ".exe agora está em Acima do normal; prioridade anterior salva.");
    } catch (cause) {
      setProcessMessage(cause instanceof Error ? cause.message : "Não foi possível elevar a prioridade do jogo.");
    } finally {
      setPriorityPid(null);
    }
  };
  const restoreGamePriority = async (processInfo: AnonymosProcessInfo) => {
    if (!window.anonymosDesktop || !processInfo.startTime || priorityPid !== null || terminatingPid !== null) return;
    if (!window.confirm("Restaurar a prioridade original de " + processInfo.name + ".exe?")) return;
    setPriorityPid(processInfo.pid);
    setProcessMessage("");
    try {
      const result = await window.anonymosDesktop.restoreProcessPriority({ pid: processInfo.pid, name: processInfo.name, startTime: processInfo.startTime });
      updateProcess(processInfo.pid, false);
      setProcessMessage(result.restored
        ? "Prioridade original restaurada: " + result.restored + "."
        : result.processMissing ? "O jogo já foi fechado; o backup obsoleto foi limpo."
        : "O processo mudou de PID/identidade; nenhuma prioridade foi alterada.");
    } catch (cause) {
      setProcessMessage(cause instanceof Error ? cause.message : "Não foi possível restaurar a prioridade original.");
    } finally {
      setPriorityPid(null);
    }
  };
  const terminateProcess = async (processInfo: AnonymosProcessInfo) => {
    if (!window.anonymosDesktop || !processInfo.startTime || protectedNames.has(processInfo.name.toLowerCase()) || terminatingPid !== null) return;
    if (!window.confirm("Encerrar " + processInfo.name + ".exe (PID " + processInfo.pid + ")? O aplicativo será fechado imediatamente e trabalhos não salvos podem ser perdidos.")) return;
    setTerminatingPid(processInfo.pid);
    setProcessMessage("");
    try {
      await window.anonymosDesktop.terminateProcess({ pid: processInfo.pid, name: processInfo.name, startTime: processInfo.startTime });
      setProcesses((current) => current.filter((item) => item.pid !== processInfo.pid));
      setProcessMessage(processInfo.name + ".exe foi encerrado.");
    } catch (cause) {
      setProcessMessage(cause instanceof Error ? cause.message : "Não foi possível encerrar o processo.");
    } finally {
      setTerminatingPid(null);
    }
  };
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-2xl font-bold">Monitor do sistema</h1><p className="text-sm text-muted-foreground">Dados coletados diretamente do Windows, sem métricas simuladas.</p></div>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{updatedAt ? `Atualizado às ${updatedAt}` : "Aguardando telemetria"}</span>
      </header>
      {error && <section className="glass border border-warning/40 p-4 text-sm"><div className="font-semibold">Telemetria indisponível</div><p className="mt-1 text-muted-foreground">{error}</p></section>}
      {snapshot && <HoneycombPanel metrics={[
        { id: "cpu", label: "CPU", value: percent(snapshot.cpu.loadPercent), detail: snapshot.cpu.name, icon: Cpu },
        { id: "ram", label: "RAM", value: percent(snapshot.memory.usedPercent), detail: `${bytes(snapshot.memory.usedBytes)} usados de ${bytes(snapshot.memory.totalBytes)}`, icon: MemoryStick },
        { id: "gpu", label: "GPU", value: snapshot.gpu.some((gpu) => gpu.loadPercent != null) ? Math.round(Math.max(...snapshot.gpu.map((gpu) => gpu.loadPercent ?? 0))) + "%" : `${snapshot.gpu.length} detectada(s)`, detail: snapshot.gpu.map((gpu) => gpu.name + (gpu.temperatureC == null ? "" : " · " + gpu.temperatureC + "°C")).join(" · ") || "Não identificado", icon: MonitorCog },
        { id: "ssd", label: "DISCOS", value: `${snapshot.disks.length} unidade(s)`, detail: snapshot.disks.map((disk) => `${disk.name}: ${bytes(disk.freeBytes)} livres`).join(" · ") || "Nenhuma unidade detectada", icon: HardDrive },
        { id: "net", label: "REDE", value: "Abrir", detail: "Diagnóstico de latência, perda de pacotes, DNS e velocidade.", icon: Wifi },
      ]} />}
      {snapshot && <>
        <section className="glass p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Computador</div>
          <div className="mt-1 font-display text-xl font-bold">{snapshot.computer}</div>
          <div className="mt-1 text-sm text-muted-foreground">{snapshot.manufacturer} {snapshot.model} · {snapshot.os.caption} (build {snapshot.os.build})</div>
        </section>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric title="CPU" value={percent(snapshot.cpu.loadPercent)} detail={snapshot.cpu.name} />
          <Metric title="Memória RAM" value={percent(memory?.usedPercent)} detail={`${bytes(memory?.usedBytes ?? 0)} usados de ${bytes(memory?.totalBytes ?? 0)}`} />
          <Metric title="Núcleos / threads" value={`${snapshot.cpu.cores} / ${snapshot.cpu.logicalProcessors}`} detail={`Máximo ${snapshot.cpu.maxClockMHz} MHz`} />
          <Metric title="Adaptadores gráficos" value={String(snapshot.gpu.length)} detail={snapshot.gpu.map((g) => g.name).join(" · ") || "Não identificado"} />
        </div>
        <section className="glass p-4">
          <h2 className="font-semibold">Armazenamento local</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {snapshot.disks.map((disk) => {
              const used = disk.sizeBytes > 0 ? ((disk.sizeBytes - disk.freeBytes) / disk.sizeBytes) * 100 : 0;
              return <div key={disk.name} className="rounded-lg border border-border p-3">
                <div className="flex justify-between text-sm"><strong>{disk.name}</strong><span>{Math.round(used)}% usado</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${used}%` }} /></div>
                <div className="mt-2 text-xs text-muted-foreground">{bytes(disk.sizeBytes - disk.freeBytes)} usados · {bytes(disk.freeBytes)} livres de {bytes(disk.sizeBytes)}</div>
              </div>;
            })}
          </div>
        </section>
        <section className="glass p-4">
          <h2 className="font-semibold">Placas de vídeo</h2>
          <div className="mt-3 space-y-2">{snapshot.gpu.map((gpu) => <div key={gpu.name} className="flex flex-wrap justify-between gap-2 rounded-lg border border-border p-3 text-sm"><span>{gpu.name}</span><span className="text-muted-foreground">Driver {gpu.driverVersion || "N/D"} · VRAM reportada {gpu.adapterRamBytes ? bytes(gpu.adapterRamBytes) : "N/D"} · Uso {gpu.loadPercent == null ? "N/D" : Math.round(gpu.loadPercent) + "%"} · Temperatura {gpu.temperatureC == null ? "N/D" : gpu.temperatureC + "°C"} · VRAM usada {gpu.memoryUsedBytes == null ? "N/D" : bytes(gpu.memoryUsedBytes) + " / " + bytes(gpu.memoryTotalBytes ?? 0)}</span></div>)}</div>
          <p className="mt-2 text-xs text-muted-foreground">Uso, temperatura e VRAM dedicada são lidos por NVIDIA SMI quando o driver NVIDIA disponibiliza o utilitário. Em AMD/Intel ou quando o utilitário não está instalado, estes campos aparecem como N/D.</p>
        </section>
      </>}
      <section className="glass overflow-hidden">
        <div className="border-b border-border p-4"><h2 className="font-semibold">Processos ativos</h2><p className="text-xs text-muted-foreground">Lista real do Windows · até 40 processos com maior tempo acumulado de CPU.</p></div>
        {processes.length ? <div className="max-h-[440px] overflow-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-card text-muted-foreground"><tr><th className="p-3">Processo</th><th className="p-3">PID</th><th className="p-3">CPU acumulada</th><th className="p-3">Memória</th><th className="p-3">Estado</th><th className="p-3">Ação</th></tr></thead><tbody>{processes.map((p) => <tr key={p.pid} className="border-t border-border"><td className="p-3 font-medium">{p.name}.exe</td><td className="p-3">{p.pid}</td><td className="p-3">{p.cpuSeconds == null ? "N/D" : `${p.cpuSeconds}s`}</td><td className="p-3">{bytes(p.memoryBytes)}</td><td className="p-3">{p.responding ? "Respondendo" : "Sem resposta"}</td><td className="p-3"><div className="flex flex-wrap gap-1.5">{boostableGameNames.has(p.name.toLowerCase()) && (p.priorityBoosted
            ? <button type="button" onClick={() => void restoreGamePriority(p)} disabled={!p.startTime || priorityPid !== null || terminatingPid !== null} title="Restaurar a prioridade original" className="inline-flex items-center gap-1 rounded-md border border-success/25 px-2 py-1 text-[10px] font-semibold text-success transition hover:bg-success/10 disabled:opacity-30">{priorityPid === p.pid ? "Restaurando…" : <><RotateCcw className="h-3 w-3" /> Restaurar</>}</button>
            : <button type="button" onClick={() => void boostGamePriority(p)} disabled={!p.startTime || priorityPid !== null || terminatingPid !== null} title="Elevar temporariamente para Acima do normal" className="inline-flex items-center gap-1 rounded-md border border-primary/25 px-2 py-1 text-[10px] font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-30">{priorityPid === p.pid ? "Aplicando…" : <><Zap className="h-3 w-3" /> Prioridade+</>}</button>)}
            <button type="button" onClick={() => void terminateProcess(p)} disabled={!p.startTime || protectedNames.has(p.name.toLowerCase()) || terminatingPid !== null || priorityPid !== null} title={!p.startTime ? "Windows não forneceu a hora de início; atualize a lista" : protectedNames.has(p.name.toLowerCase()) ? "Processo protegido" : "Encerrar processo"} className="rounded-md border border-destructive/25 px-2 py-1 text-[10px] font-semibold text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-30">{terminatingPid === p.pid ? "Encerrando…" : "Encerrar"}</button></div></td></tr>)}</tbody></table></div> : <p className="p-4 text-sm text-muted-foreground">Aguardando lista de processos do Windows.</p>}{processMessage && <p role="status" className="border-t border-border p-3 text-xs text-muted-foreground">{processMessage}</p>}
      </section>
    </div>
  );
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <section className="glass min-w-0 p-4"><div className="text-xs text-muted-foreground">{title}</div><div className="mt-1 font-display text-3xl font-bold">{value}</div><div className="mt-2 truncate text-xs text-muted-foreground" title={detail}>{detail}</div></section>;
}

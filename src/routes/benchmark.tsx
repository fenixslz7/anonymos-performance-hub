import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, Cpu, Gauge, MemoryStick, Play, ShieldCheck, Sparkles } from "lucide-react";
import type { AnonymosBenchmarkResult } from "@/types/anonymos-desktop";

export const Route = createFileRoute("/benchmark")({
  head: () => ({ meta: [{ title: "Benchmark — ANONYMOS PERFORMANCE" }, { name: "description", content: "Teste local de throughput de CPU e memória." }] }),
  component: BenchmarkPage,
});

function BenchmarkPage() {
  const [result, setResult] = useState<AnonymosBenchmarkResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const desktopAvailable = typeof window !== "undefined" && Boolean(window.anonymosDesktop);

  const run = async () => {
    if (!window.anonymosDesktop || busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await window.anonymosDesktop.runBenchmark();
      setResult(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível executar o benchmark.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 via-card to-background p-6 md:p-8">
        <div className="pointer-events-none absolute -right-12 -top-14 opacity-10"><Gauge className="h-64 w-64 text-primary" /></div>
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-extrabold tracking-[.2em] text-primary"><Sparkles className="h-3 w-3" /> SYSTEM PERFORMANCE TEST</div>
          <h1 className="font-display text-3xl font-black md:text-4xl">Benchmark de <span className="text-primary">hardware.</span></h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Meça throughput de CPU e cópia de memória em uma tarefa local reproduzível. O teste roda isolado do processo principal do aplicativo.</p>
          <button type="button" onClick={() => void run()} disabled={busy || !desktopAvailable} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"><Play className="h-4 w-4" /> {busy ? "Executando teste…" : "Iniciar benchmark"}</button>
          {busy && <div className="mt-4 h-1.5 max-w-md overflow-hidden rounded-full bg-muted"><div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-primary to-cyan-400" /></div>}
          {error && <p role="alert" className="mt-3 text-xs text-warning">{error}</p>}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <article className="glass relative overflow-hidden p-5">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Cpu className="h-5 w-5" /></div><div><div className="text-[10px] font-bold tracking-[.18em] text-primary">CPU SHA-256</div><h2 className="font-display text-lg font-bold">Processamento</h2></div></div>
          <div className="relative mt-6 font-display text-4xl font-black tabular-nums">{result ? result.cpu.mebibytesPerSecond.toLocaleString("pt-BR") : "—"} <span className="text-sm font-semibold text-muted-foreground">MiB/s</span></div>
          <p className="relative mt-2 text-xs text-muted-foreground">{result ? result.cpu.hashes.toLocaleString("pt-BR") + " hashes em " + (result.cpu.durationMs / 1000).toFixed(2) + " s" : "Throughput medido de hash SHA-256 com blocos de 1 MiB."}</p>
        </article>
        <article className="glass relative overflow-hidden p-5">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl" />
          <div className="relative flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><MemoryStick className="h-5 w-5" /></div><div><div className="text-[10px] font-bold tracking-[.18em] text-cyan-300">RAM COPY</div><h2 className="font-display text-lg font-bold">Memória</h2></div></div>
          <div className="relative mt-6 font-display text-4xl font-black tabular-nums">{result ? result.memory.mebibytesPerSecond.toLocaleString("pt-BR") : "—"} <span className="text-sm font-semibold text-muted-foreground">MiB/s</span></div>
          <p className="relative mt-2 text-xs text-muted-foreground">{result ? result.memory.copies.toLocaleString("pt-BR") + " cópias de 24 MiB em " + (result.memory.durationMs / 1000).toFixed(2) + " s" : "Throughput de cópia sequencial de um buffer de 24 MiB."}</p>
        </article>
      </section>

      {result && <section className="glass p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /><h2 className="text-sm font-bold">Resultado da execução</h2></div><span className="text-[10px] text-muted-foreground">{new Date(result.capturedAt).toLocaleString()}</span></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">Dados processados pela CPU</div><div className="mt-1 text-lg font-bold">{result.cpu.processedMiB.toLocaleString("pt-BR")} MiB</div></div>
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">Dados copiados pela RAM</div><div className="mt-1 text-lg font-bold">{result.memory.copiedMiB.toLocaleString("pt-BR")} MiB</div></div>
        </div>
        <p className="mt-4 text-[10px] leading-5 text-muted-foreground">Método: {result.methodology}. O resultado varia com temperatura, energia, carga em segundo plano e versão do sistema; use as mesmas condições para comparar. Este teste não mede FPS, latência de GPU nem desempenho dentro de jogos.</p>
      </section>}

      <section className="flex gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-warning" /><div><div className="text-sm font-semibold">O que este teste mede — e o que não mede</div><p className="mt-1 text-xs leading-5 text-muted-foreground">Mede somente throughput de CPU em SHA-256 e cópia de RAM. Não altera configurações, não grava arquivos, não promete ganho de FPS e não substitui um benchmark dentro de FiveM, Fortnite ou CS2. Benchmarks de jogo e sensores avançados dependem de integrações específicas.</p></div></section>
    </div>
  );
}

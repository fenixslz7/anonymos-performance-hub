import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Activity, AlertCircle, CheckCircle2, Clock3, FileText, RefreshCw, ShieldCheck, Sparkles, Zap } from "lucide-react";
import type { AnonymosHistoryEntry } from "@/types/anonymos-desktop";

export const Route = createFileRoute("/historico")({
  head: () => ({ meta: [{ title: "Histórico de ações — ANONYMOS PERFORMANCE" }, { name: "description", content: "Registro local de ações realizadas pelo ANONYMOS PERFORMANCE." }] }),
  component: HistoryPage,
});

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let current = value, index = 0;
  while (current >= 1024 && index < units.length - 1) { current /= 1024; index++; }
  return current.toFixed(1) + " " + units[index];
};

function describeDetails(entry: AnonymosHistoryEntry) {
  const details = entry.details || {};
  const parts: string[] = [];
  if (typeof details["deletedFiles"] === "number") parts.push(details["deletedFiles"] + " arquivo(s) removido(s)");
  if (typeof details["deletedBytes"] === "number") parts.push(formatBytes(details["deletedBytes"]) + " liberados");
  if (typeof details["skippedFiles"] === "number") parts.push(details["skippedFiles"] + " ignorado(s)");
  if (typeof details["pid"] === "number") parts.push("PID " + details["pid"]);
  if (typeof details["source"] === "string") parts.push("Origem: " + details["source"]);
  if (typeof details["createdTemporaryPlan"] === "boolean") parts.push(details["createdTemporaryPlan"] ? "Perfil temporário criado" : "Plano existente usado");
  if (typeof details["executable"] === "string") parts.push("Executável: " + details["executable"].split(/[\\/]/).pop());
  return parts.join(" · ") || "Ação registrada localmente";
}

function HistoryPage() {
  const [entries, setEntries] = useState<AnonymosHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!window.anonymosDesktop) {
      setError("O histórico local está disponível no aplicativo desktop para Windows.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setEntries(await window.anonymosDesktop.listActionHistory());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o histórico.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-[1250px] space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 via-card to-background p-6 md:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 opacity-10"><Activity className="h-64 w-64 text-primary" /></div>
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-extrabold tracking-[.2em] text-primary"><Sparkles className="h-3 w-3" /> LOCAL ACTION LOG</div>
          <h1 className="font-display text-3xl font-black md:text-4xl">Histórico de <span className="text-primary">ações.</span></h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Registro local das ações realizadas pelo ANONYMOS: modo de jogo, limpeza, processos, inicialização e alterações de energia.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-border bg-background/40 px-4 py-3"><div className="text-[9px] font-bold tracking-widest text-muted-foreground">REGISTROS SALVOS</div><div className="mt-1 font-display text-2xl font-extrabold">{entries.length}</div></div>
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/40 px-4 py-3 text-xs font-semibold transition hover:border-primary/50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar histórico</button>
          </div>
        </div>
      </section>

      {error && <div role="alert" className="flex gap-2 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
      <section className="glass overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border p-4"><FileText className="h-4 w-4 text-primary" /><div><h2 className="text-sm font-bold">Atividade recente</h2><p className="text-[10px] text-muted-foreground">Os últimos 250 registros, armazenados somente neste computador.</p></div></div>
        {loading && entries.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Carregando histórico…</div> : entries.length ? <div className="divide-y divide-border">
          {entries.map((entry) => <article key={entry.id} className="flex flex-wrap items-start gap-3 p-4 transition hover:bg-secondary/20">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/10 text-primary">{entry.type.toLowerCase().includes("modo de jogo") ? <Zap className="h-5 w-5" /> : entry.type.toLowerCase().includes("limpeza") ? <CheckCircle2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}</div>
            <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{entry.type}</div><div className="mt-0.5 break-words text-xs text-muted-foreground">{entry.target}</div><p className="mt-1 break-words text-[10px] leading-5 text-muted-foreground">{describeDetails(entry)}</p></div>
            <div className="inline-flex items-center gap-1.5 text-[10px] tabular-nums text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{new Date(entry.capturedAt).toLocaleString()}</div>
          </article>)}
        </div> : <div className="p-9 text-center"><Activity className="mx-auto h-8 w-8 text-primary/60" /><p className="mt-2 text-sm font-semibold">Nenhuma ação registrada ainda</p><p className="mt-1 text-xs text-muted-foreground">Quando você usar as ferramentas do ANONYMOS, os registros aparecerão aqui.</p></div>}
      </section>
      <section className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><div className="text-sm font-semibold">Privacidade local</div><p className="mt-1 text-xs leading-5 text-muted-foreground">O histórico fica no armazenamento local do aplicativo e não é enviado para servidores. São registrados somente dados necessários para identificar a ação e seu resultado.</p></div></section>
    </div>
  );
}

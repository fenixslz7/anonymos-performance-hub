import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, FolderOpen, Power, RefreshCw, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import type { AnonymosStartupList } from "@/types/anonymos-desktop";

export const Route = createFileRoute("/inicializacao")({
  head: () => ({ meta: [{ title: "Inicialização do Windows — ANONYMOS PERFORMANCE" }, { name: "description", content: "Gerencie programas que iniciam com a sua sessão do Windows." }] }),
  component: StartupManager,
});

function StartupManager() {
  const [data, setData] = useState<AnonymosStartupList | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [autoLaunchEnabled, setAutoLaunchEnabled] = useState(false);
  const [autoLaunchAvailable, setAutoLaunchAvailable] = useState(false);
  const [autoLaunchLoading, setAutoLaunchLoading] = useState(true);
  const [autoLaunchBusy, setAutoLaunchBusy] = useState(false);

  const load = useCallback(async () => {
    if (!window.anonymosDesktop) {
      setError("O gerenciador de inicialização funciona no aplicativo desktop para Windows.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await window.anonymosDesktop.listStartupItems();
      setData(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível consultar a inicialização do Windows.");
    } finally {
      setLoading(false);
    }
  }, []);


  const loadAutoLaunch = useCallback(async () => {
    if (!window.anonymosDesktop) {
      setAutoLaunchAvailable(false);
      setAutoLaunchLoading(false);
      return;
    }
    setAutoLaunchLoading(true);
    try {
      const result = await window.anonymosDesktop.getAutoLaunchSettings();
      setAutoLaunchAvailable(result.available);
      setAutoLaunchEnabled(result.enabled);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível consultar a inicialização automática.");
    } finally {
      setAutoLaunchLoading(false);
    }
  }, []);

  useEffect(() => { void load(); void loadAutoLaunch(); }, [load, loadAutoLaunch]);

  const toggleAutoLaunch = async () => {
    if (!window.anonymosDesktop || !autoLaunchAvailable || autoLaunchBusy) return;
    setAutoLaunchBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await window.anonymosDesktop.setAutoLaunch(!autoLaunchEnabled);
      setAutoLaunchEnabled(result.enabled);
      setMessage(result.enabled
        ? "O ANONYMOS será aberto automaticamente quando você entrar na sua conta do Windows."
        : "A inicialização automática do ANONYMOS foi desativada.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar a inicialização automática.");
    } finally {
      setAutoLaunchBusy(false);
    }
  };

  const disable = async (id: string, name: string) => {
    if (!window.anonymosDesktop || busyId) return;
    if (!window.confirm("Desativar '" + name + "' na inicialização? O ANONYMOS fará um backup para permitir restaurar depois. O arquivo original não será apagado.")) return;
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await window.anonymosDesktop.disableStartupItem(id);
      setMessage("'" + name + "' foi removido da inicialização e guardado para restauração.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível desativar esta entrada.");
    } finally {
      setBusyId("");
    }
  };

  const restore = async (id: string, name: string) => {
    if (!window.anonymosDesktop || busyId) return;
    if (!window.confirm("Restaurar '" + name + "' para a inicialização do Windows?")) return;
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await window.anonymosDesktop.restoreStartupItem(id);
      setMessage("'" + name + "' foi restaurado para a inicialização.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível restaurar esta entrada.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="mx-auto max-w-[1320px] space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 via-card to-background p-6 md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-12 opacity-10"><Power className="h-64 w-64 text-primary" /></div>
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-extrabold tracking-[.2em] text-primary"><Sparkles className="h-3 w-3" /> STARTUP CONTROL</div>
          <h1 className="font-display text-3xl font-black md:text-4xl">Inicialização do <span className="text-primary">Windows.</span></h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Veja os programas configurados para iniciar com sua conta. Desative individualmente e restaure depois; nada será apagado.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-border bg-background/40 px-4 py-3"><div className="text-[9px] font-bold tracking-widest text-muted-foreground">ATIVOS DETECTADOS</div><div className="mt-1 font-display text-2xl font-extrabold">{data ? data.items.length : "—"}</div></div>
            <div className="rounded-xl border border-border bg-background/40 px-4 py-3"><div className="text-[9px] font-bold tracking-widest text-muted-foreground">BACKUPS PARA RESTAURAR</div><div className="mt-1 font-display text-2xl font-extrabold">{data ? data.disabled.length : "—"}</div></div>
            <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/40 px-4 py-3 text-xs font-semibold transition hover:border-primary/50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar lista</button>
          </div>
        </div>
      </section>

      <section className="glass flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Power className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold">Iniciar ANONYMOS com o Windows</h2>
              <span className={`rounded-full border px-2 py-1 text-[9px] font-bold tracking-wider ${autoLaunchEnabled ? "border-success/30 bg-success/10 text-success" : "border-border text-muted-foreground"}`}>{autoLaunchLoading ? "VERIFICANDO" : autoLaunchEnabled ? "ATIVADO" : "DESATIVADO"}</span>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Quando ativado, o painel abre automaticamente depois que você entrar na sua conta do Windows. A configuração vale somente para este usuário e pode ser desligada aqui.</p>
            {!autoLaunchAvailable && !autoLaunchLoading && <p className="mt-2 text-[10px] text-warning">Disponível na versão instalada do ANONYMOS para Windows.</p>}
          </div>
        </div>
        <button type="button" onClick={() => void toggleAutoLaunch()} disabled={!autoLaunchAvailable || autoLaunchLoading || autoLaunchBusy} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${autoLaunchEnabled ? "border border-warning/30 text-warning hover:bg-warning/10" : "bg-brand text-primary-foreground hover:brightness-110"}`}>
          {autoLaunchBusy ? "Salvando…" : autoLaunchEnabled ? "Desativar" : "Ativar"}
        </button>
      </section>

      {error && <div role="alert" className="flex gap-2 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
      {message && <div role="status" className="flex gap-2 rounded-xl border border-success/30 bg-success/5 p-4 text-sm text-success"><CheckCircle2 className="h-5 w-5 shrink-0" />{message}</div>}

      <section className="glass overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
          <div className="flex items-center gap-2"><Power className="h-4 w-4 text-primary" /><div><h2 className="text-sm font-bold">Programas ativos</h2><p className="text-[10px] text-muted-foreground">Entradas da chave Run do usuário e da pasta Inicializar da sua conta.</p></div></div>
          <span className="rounded-full border border-border px-2.5 py-1 text-[9px] font-bold text-muted-foreground">SOMENTE CONTA ATUAL</span>
        </div>
        {loading && !data ? <div className="p-8 text-center text-sm text-muted-foreground">Consultando o Windows…</div> : data?.items.length ? <div className="divide-y divide-border">
          {data.items.map((entry) => <article key={entry.id} className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-secondary/20">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/10 text-primary">{entry.source === "registry" ? <Power className="h-5 w-5" /> : <FolderOpen className="h-5 w-5" />}</div>
              <div className="min-w-0"><div className="truncate text-sm font-semibold">{entry.name}</div><div className="mt-1 truncate text-[10px] text-muted-foreground" title={entry.command}>{entry.command}</div><div className="mt-1 flex items-center gap-2 text-[9px] text-muted-foreground"><span>{entry.location}</span><span>·</span><span>{entry.source === "registry" ? "Registro do usuário" : "Atalho/arquivo"}</span></div></div>
            </div>
            <button type="button" onClick={() => void disable(entry.id, entry.name)} disabled={Boolean(busyId)} className="inline-flex items-center gap-2 rounded-lg border border-warning/25 px-3 py-2 text-[10px] font-bold text-warning transition hover:bg-warning/10 disabled:opacity-50">{busyId === entry.id ? "Desativando…" : "Desativar"}</button>
          </article>)}
        </div> : <div className="p-8 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-success" /><p className="mt-2 text-sm font-semibold">Nenhum programa encontrado</p><p className="mt-1 text-xs text-muted-foreground">A chave Run do usuário e a pasta Inicializar estão vazias ou indisponíveis.</p></div>}
      </section>

      <section className="glass overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border p-4"><RotateCcw className="h-4 w-4 text-primary" /><div><h2 className="text-sm font-bold">Desativados pelo ANONYMOS</h2><p className="text-[10px] text-muted-foreground">Backups locais para restaurar as entradas que você desativou aqui.</p></div></div>
        {data?.disabled.length ? <div className="divide-y divide-border">
          {data.disabled.map((entry) => <article key={entry.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-muted-foreground"><Clock3 className="h-4 w-4" /></div><div><div className="text-sm font-semibold">{entry.name}</div><div className="text-[10px] text-muted-foreground">{entry.location}</div></div></div>
            <button type="button" onClick={() => void restore(entry.id, entry.name)} disabled={Boolean(busyId)} className="inline-flex items-center gap-2 rounded-lg border border-success/25 px-3 py-2 text-[10px] font-bold text-success transition hover:bg-success/10 disabled:opacity-50">{busyId === entry.id ? "Restaurando…" : <><RotateCcw className="h-3.5 w-3.5" /> Restaurar</>}</button>
          </article>)}
        </div> : <p className="p-6 text-xs text-muted-foreground">Nenhuma entrada desativada por este aplicativo.</p>}
      </section>

      <section className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><div className="text-sm font-semibold">Escopo e segurança</div><p className="mt-1 text-xs leading-5 text-muted-foreground">Esta versão gerencia somente entradas da conta atual: registro HKCU Run e pasta Inicializar do usuário. Não altera serviços, tarefas agendadas, entradas de outros usuários nem programas protegidos. O backup fica no armazenamento local do ANONYMOS.</p></div></section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, FileSearch, HardDrive, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import type { AnonymosCleanupReport } from "@/types/anonymos-desktop";

export const Route = createFileRoute("/limpeza")({
  head: () => ({ meta: [{ title: "Limpeza inteligente — ANONYMOS PERFORMANCE" }, { name: "description", content: "Analise e remova arquivos temporários antigos com segurança." }] }),
  component: Cleanup,
});

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value, index = 0;
  while (size >= 1024 && index < units.length - 1) { size /= 1024; index++; }
  return `${size.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
};

function Cleanup() {
  const [selected, setSelected] = useState<Array<"user-temp" | "windows-temp">>(["user-temp"]);
  const [report, setReport] = useState<AnonymosCleanupReport | null>(null);
  const [result, setResult] = useState<AnonymosCleanupReport | null>(null);
  const [busy, setBusy] = useState<"scan" | "clean" | null>(null);
  const [error, setError] = useState("");
  const toggle = (id: "user-temp" | "windows-temp") => {
    setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
    setReport(null); setResult(null); setError("");
  };
  const scan = async () => {
    if (!window.anonymosDesktop || busy || selected.length === 0) return;
    setBusy("scan"); setError(""); setResult(null);
    try { setReport(await window.anonymosDesktop.scanCleanup(selected)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível analisar os arquivos."); }
    finally { setBusy(null); }
  };
  const clean = async () => {
    if (!window.anonymosDesktop || busy || !report || report.totalFiles === 0) return;
    const confirmed = window.confirm(
      `O ANONYMOS removerá somente arquivos com mais de 24 horas nas categorias selecionadas.\n\n${report.totalFiles.toLocaleString("pt-BR")} arquivos · ${formatBytes(report.totalBytes)} encontrados.\n\nArquivos em uso serão ignorados. Pastas, Downloads, Documentos, fotos, projetos e saves não serão apagados. Continuar?`
    );
    if (!confirmed) return;
    setBusy("clean"); setError(""); setResult(null);
    try {
      const completed = await window.anonymosDesktop.runCleanup(selected);
      setResult(completed);
      setReport(await window.anonymosDesktop.scanCleanup(selected));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "A limpeza não pôde ser concluída."); }
    finally { setBusy(null); }
  };
  const desktopAvailable = typeof window !== "undefined" && Boolean(window.anonymosDesktop);
  return <div className="mx-auto max-w-5xl space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-primary"><ShieldCheck className="h-3.5 w-3.5" /> LIMPEZA CONTROLADA</div>
        <h1 className="font-display text-2xl font-bold">Limpeza inteligente</h1>
        <p className="mt-1 text-sm text-muted-foreground">Encontre temporários antigos e libere espaço sem tocar nos seus arquivos pessoais.</p></div>
      <div className="rounded-xl border border-border bg-card/60 px-4 py-3 text-right"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Regra de segurança</div><div className="mt-1 text-sm font-semibold">Somente arquivos com +24h</div></div>
    </header>
    <section className="glass space-y-4 p-5">
      <div><h2 className="font-semibold">O que deseja analisar?</h2><p className="mt-1 text-xs text-muted-foreground">A análise não altera nenhum arquivo. Você verá o resultado antes de confirmar a limpeza.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${selected.includes("user-temp") ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/30"}`}>
          <input type="checkbox" checked={selected.includes("user-temp")} onChange={() => toggle("user-temp")} className="mt-1 accent-primary" />
          <span><span className="block text-sm font-semibold">Temporários do usuário</span><span className="mt-1 block text-xs text-muted-foreground">Arquivos antigos na pasta temporária da sua conta Windows.</span></span>
        </label>
        <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${selected.includes("windows-temp") ? "border-primary/60 bg-primary/5" : "border-border hover:border-primary/30"}`}>
          <input type="checkbox" checked={selected.includes("windows-temp")} onChange={() => toggle("windows-temp")} className="mt-1 accent-primary" />
          <span><span className="block text-sm font-semibold">Temporários do Windows</span><span className="mt-1 block text-xs text-muted-foreground">Arquivos antigos em Windows\\Temp. Alguns exigem permissão e podem ser ignorados.</span></span>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => void scan()} disabled={!desktopAvailable || busy !== null || selected.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
          {busy === "scan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />} {busy === "scan" ? "Analisando…" : "Analisar arquivos"}
        </button>
        <button onClick={() => void clean()} disabled={!desktopAvailable || busy !== null || !report || report.totalFiles === 0} className="inline-flex items-center gap-2 rounded-lg border border-primary/40 px-4 py-2.5 text-sm font-semibold transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40">
          {busy === "clean" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} {busy === "clean" ? "Limpando…" : "Limpar selecionados"}
        </button>
      </div>
      {!desktopAvailable && <p className="text-xs text-warning">A limpeza nativa está disponível somente no aplicativo instalado para Windows.</p>}
      {selected.length === 0 && <p className="text-xs text-warning">Selecione pelo menos uma categoria para analisar.</p>}
      {error && <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
    </section>
    {report && <section className="glass space-y-4 p-5">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Resultado da análise</h2><p className="text-xs text-muted-foreground">Verificado em {new Date(report.capturedAt).toLocaleString("pt-BR")} · limite de idade: 24 horas</p></div><FileSearch className="h-5 w-5 text-primary" /></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">Arquivos encontrados</div><div className="mt-1 font-display text-2xl font-bold">{report.totalFiles.toLocaleString("pt-BR")}</div></div>
        <div className="rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">Espaço potencial</div><div className="mt-1 font-display text-2xl font-bold text-primary">{formatBytes(report.totalBytes)}</div></div>
        <div className="rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">Categorias analisadas</div><div className="mt-1 font-display text-2xl font-bold">{report.categories.length}</div></div>
      </div>
      <div className="space-y-2">{report.categories.map(category => <div key={category.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-3 text-sm"><div className="flex min-w-0 items-center gap-2"><HardDrive className="h-4 w-4 shrink-0 text-primary" /><span className="font-medium">{category.label}</span></div><span className="text-muted-foreground">{category.files.toLocaleString("pt-BR")} arquivos · {formatBytes(category.bytes)}</span></div>)}</div>
      {report.totalFiles === 0 && <p className="text-sm text-muted-foreground">Nenhum arquivo temporário antigo foi encontrado nas categorias selecionadas.</p>}
    </section>}
    {result && <section role="status" className="glass border border-primary/30 p-5">
      <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-primary" /> Limpeza concluída</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3"><div><div className="text-xs text-muted-foreground">Removidos</div><div className="text-xl font-bold">{result.deletedFiles.toLocaleString("pt-BR")}</div></div><div><div className="text-xs text-muted-foreground">Espaço liberado</div><div className="text-xl font-bold text-primary">{formatBytes(result.deletedBytes)}</div></div><div><div className="text-xs text-muted-foreground">Ignorados / em uso</div><div className="text-xl font-bold">{result.skippedFiles.toLocaleString("pt-BR")}</div></div></div>
    </section>}
    <section className="flex gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      <div><div className="text-sm font-semibold">O que esta ferramenta não apaga</div><p className="mt-1 text-xs leading-5 text-muted-foreground">Downloads, Documentos, imagens, vídeos, saves de jogos, projetos, cache de navegadores e pastas inteiras. Ela remove somente arquivos individuais antigos nas duas pastas temporárias permitidas. Arquivos bloqueados ou sem permissão são ignorados.</p></div>
    </section>
  </div>;
}

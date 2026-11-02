import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FolderOpen, Gamepad2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/jogos")({
  head: () => ({ meta: [{ title: "Game Launcher — ANONYMOS PERFORMANCE" }, { name: "description", content: "Abra jogos selecionando o executável local." }] }),
  component: Games,
});

const suggestions = ["FiveM", "GTA V", "Fortnite", "Counter-Strike 2", "Valorant"];

function Games() {
  const [selected, setSelected] = useState("FiveM");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const launch = async () => {
    if (!window.anonymosDesktop) { setStatus("Disponível somente no aplicativo desktop para Windows."); return; }
    setBusy(true);
    setStatus("Aguardando seleção do executável…");
    try {
      const result = await window.anonymosDesktop.pickAndLaunchGame();
      setStatus(result.launched ? `Solicitação de inicialização enviada: ${result.executable}` : result.reason ?? "Não foi possível iniciar o jogo.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Falha ao iniciar o jogo.");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <header><h1 className="font-display text-2xl font-bold">Game Launcher</h1><p className="text-sm text-muted-foreground">Selecione um jogo e abra o executável instalado no seu computador.</p></header>
      <section className="glass p-5">
        <div className="flex items-center gap-2 text-sm font-semibold"><Gamepad2 className="h-4 w-4 text-primary" /> Biblioteca rápida</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {suggestions.map((name) => <button key={name} onClick={() => { setSelected(name); setStatus(""); }} className={`rounded-xl border p-4 text-left transition ${selected === name ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}><div className="font-semibold">{name}</div><div className="mt-1 text-xs text-muted-foreground">{selected === name ? "Selecionado" : "Perfil de atalho"}</div></button>)}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={() => void launch()} disabled={busy} className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><FolderOpen className="h-4 w-4" />{busy ? "Aguardando…" : `Localizar ${selected} (.exe)`}</button>
          <span className="text-xs text-muted-foreground">O programa não altera configurações nem aplica boost automaticamente.</span>
        </div>
        {status && <div role="status" className="mt-4 break-all rounded-lg border border-border p-3 text-sm">{status}</div>}
      </section>
      <section className="glass flex gap-3 p-4 text-sm"><ShieldCheck className="h-5 w-5 shrink-0 text-primary" /><div><div className="font-semibold">Inicialização transparente</div><p className="mt-1 text-muted-foreground">Esta versão abre o executável escolhido. Não promete FPS extra, não encerra processos e não altera prioridades ou serviços do Windows sem uma implementação específica e reversível.</p></div></section>
    </div>
  );
}

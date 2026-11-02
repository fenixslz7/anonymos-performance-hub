import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FolderOpen, Gamepad2, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/jogos")({
  head: () => ({ meta: [{ title: "Game Launcher — ANONYMOS PERFORMANCE" }, { name: "description", content: "Abra jogos selecionando o executável local." }] }),
  component: Games,
});

const suggestions = [
  { name: "FiveM", mark: "F", category: "ROLEPLAY", image: "https://cdn.jsdelivr.net/npm/simple-icons@16.36.0/icons/fivem.svg", accent: "from-rose-500/20 via-background to-background" },
  { name: "GTA V", mark: "V", category: "OPEN WORLD", accent: "from-emerald-500/20 via-background to-background" },
  { name: "Fortnite", mark: "FN", category: "BATTLE ROYALE", image: "https://cdn.jsdelivr.net/npm/simple-icons@16.36.0/icons/fortnite.svg", accent: "from-cyan-400/20 via-background to-background" },
  { name: "Counter-Strike 2", mark: "CS2", category: "TACTICAL FPS", image: "https://cdn.jsdelivr.net/npm/simple-icons@16.36.0/icons/counterstrike.svg", accent: "from-amber-400/20 via-background to-background" },
  { name: "Valorant", mark: "V", category: "TACTICAL FPS", accent: "from-red-500/20 via-background to-background" },
];

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
      <header>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold tracking-[.18em] text-primary"><Gamepad2 className="h-3 w-3" /> GAME CENTER</div>
        <h1 className="font-display text-2xl font-bold">Game Launcher</h1>
        <p className="text-sm text-muted-foreground">Sua biblioteca de jogos com identidade visual própria. Selecione um título e localize o executável instalado no PC.</p>
      </header>
      <section className="glass p-5">
        <div className="flex items-center gap-2 text-sm font-semibold"><Gamepad2 className="h-4 w-4 text-primary" /> Biblioteca de jogos</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {suggestions.map((game) => (
            <button key={game.name} type="button" onClick={() => { setSelected(game.name); setStatus(""); }} aria-pressed={selected === game.name}
              className={`group relative min-h-48 overflow-hidden rounded-xl border bg-gradient-to-br p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-glow ${game.accent} ${selected === game.name ? "border-primary ring-1 ring-primary/40" : "border-border"}`}>
              <div className="absolute right-3 top-3 rounded-full border border-border bg-background/70 px-2 py-1 text-[9px] font-bold tracking-wider text-muted-foreground">{game.category}</div>
              <div className="relative flex h-28 items-center justify-center">
                <span className="font-display text-5xl font-black tracking-tighter text-foreground/80 drop-shadow-lg">{game.mark}</span>
                {game.image && <img src={game.image} alt={`Símbolo de ${game.name}`} loading="lazy" className="absolute h-20 w-20 object-contain brightness-0 invert drop-shadow-[0_0_14px_rgba(255,255,255,0.22)] transition duration-300 group-hover:scale-110" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2"><div className="font-display text-sm font-bold">{game.name}</div>{selected === game.name && <Sparkles className="h-4 w-4 shrink-0 text-primary" />}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">{selected === game.name ? "Selecionado para localizar o executável" : "Clique para selecionar este jogo"}</div>
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={() => void launch()} disabled={busy} className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><FolderOpen className="h-4 w-4" />{busy ? "Aguardando…" : `Localizar ${selected} (.exe)`}</button>
          <span className="text-xs text-muted-foreground">O seletor permite escolher o arquivo .exe correspondente ao jogo selecionado.</span>
        </div>
        {status && <div role="status" className="mt-4 break-all rounded-lg border border-border p-3 text-sm">{status}</div>}
      </section>
      <section className="glass flex gap-3 p-4 text-sm">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
        <div><div className="font-semibold">Inicialização transparente</div><p className="mt-1 text-muted-foreground">Esta versão abre o executável escolhido. Não promete FPS extra, não encerra processos e não altera prioridades ou serviços do Windows sem uma implementação específica e reversível.</p></div>
      </section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { AnonymosDetectedGame } from "@/types/anonymos-desktop";
import { FolderOpen, Gamepad2, RotateCcw, ShieldCheck, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/jogos")({
  head: () => ({ meta: [{ title: "Game Center — ANONYMOS PERFORMANCE" }, { name: "description", content: "Biblioteca visual, inicialização e modo de jogo reversível." }] }),
  component: Games,
});

const suggestions = [
  { id: "fivem", name: "FiveM", mark: "F", category: "ROLEPLAY", image: "https://cdn.jsdelivr.net/npm/simple-icons@16.36.0/icons/fivem.svg", accent: "from-rose-500/20 via-background to-background" },
  { id: "gtav", name: "GTA V", mark: "V", category: "OPEN WORLD", accent: "from-emerald-500/20 via-background to-background" },
  { id: "fortnite", name: "Fortnite", mark: "FN", category: "BATTLE ROYALE", image: "https://cdn.jsdelivr.net/npm/simple-icons@16.36.0/icons/fortnite.svg", accent: "from-cyan-400/20 via-background to-background" },
  { id: "cs2", name: "Counter-Strike 2", mark: "CS2", category: "TACTICAL FPS", image: "https://cdn.jsdelivr.net/npm/simple-icons@16.36.0/icons/counterstrike.svg", accent: "from-amber-400/20 via-background to-background" },
  { id: "valorant", name: "Valorant", mark: "V", category: "TACTICAL FPS", accent: "from-red-500/20 via-background to-background" },
];

function Games() {
  const [selected, setSelected] = useState("FiveM");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [boostActive, setBoostActive] = useState(false);
  const [boostBusy, setBoostBusy] = useState(false);
  const [boostMessage, setBoostMessage] = useState("");
  const [installedGames, setInstalledGames] = useState<AnonymosDetectedGame[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [detectMessage, setDetectMessage] = useState("");

  const detectGames = async () => {
    if (!window.anonymosDesktop || detecting) return;
    setDetecting(true);
    setDetectMessage("");
    try {
      const result = await window.anonymosDesktop.listInstalledGames();
      setInstalledGames(result.games);
      setDetectMessage(result.games.length ? result.games.length + " jogo(s) encontrado(s) nos locais conhecidos." : "Nenhum jogo encontrado nos locais conhecidos. Você ainda pode selecionar o .exe manualmente.");
    } catch (error) {
      setDetectMessage(error instanceof Error ? error.message : "Não foi possível detectar os jogos.");
    } finally {
      setDetecting(false);
    }
  };

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!window.anonymosDesktop) return;
      try {
        const [boost, detected] = await Promise.all([
          window.anonymosDesktop.getGameBoostStatus(),
          window.anonymosDesktop.listInstalledGames(),
        ]);
        if (!active) return;
        setBoostActive(boost.active);
        setInstalledGames(detected.games);
        setDetectMessage(detected.games.length ? detected.games.length + " jogo(s) encontrado(s) nos locais conhecidos." : "Nenhum jogo encontrado nos locais conhecidos. Você ainda pode selecionar o .exe manualmente.");
      } catch (error) {
        if (active) {
          setBoostMessage(error instanceof Error ? error.message : "Não foi possível consultar o modo de jogo.");
          setDetectMessage(error instanceof Error ? error.message : "Detecção indisponível.");
        }
      }
    };
    void refresh();
    return () => { active = false; };
  }, []);

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

  const launchDetected = async () => {
    const game = suggestions.find((item) => item.name === selected);
    if (!window.anonymosDesktop || !game || busy) return;
    setBusy(true);
    setStatus("Iniciando " + game.name + "…");
    try {
      const result = await window.anonymosDesktop.launchDetectedGame(game.id as AnonymosDetectedGame["id"]);
      setStatus("Solicitação de inicialização enviada: " + result.executable);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível iniciar o jogo detectado.");
    } finally { setBusy(false); }
  };

  const startBoost = async () => {
    if (!window.anonymosDesktop || boostBusy) return;
    if (!window.confirm("Ativar o Modo de Jogo? O ANONYMOS guardará o plano de energia atual, mudará para Alto desempenho e tentará restaurar o original ao fechar o aplicativo ou ao clicar em Restaurar.")) return;
    setBoostBusy(true); setBoostMessage("");
    try {
      await window.anonymosDesktop.startGameBoost();
      setBoostActive(true);
      setBoostMessage("Modo de Jogo ativado. Plano anterior salvo para restauração.");
    } catch (error) {
      setBoostMessage(error instanceof Error ? error.message : "Não foi possível ativar o Modo de Jogo.");
    } finally { setBoostBusy(false); }
  };

  const stopBoost = async () => {
    if (!window.anonymosDesktop || boostBusy) return;
    if (!window.confirm("Restaurar o plano de energia que estava ativo antes do Modo de Jogo?")) return;
    setBoostBusy(true); setBoostMessage("");
    try {
      await window.anonymosDesktop.stopGameBoost();
      setBoostActive(false);
      setBoostMessage("Plano de energia anterior restaurado.");
    } catch (error) {
      setBoostMessage(error instanceof Error ? error.message : "Não foi possível restaurar o plano anterior.");
    } finally { setBoostBusy(false); }
  };

  return (
    <div className="mx-auto max-w-[1450px] space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 via-card to-background p-6 md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 opacity-15"><Gamepad2 className="h-64 w-64 text-primary" /></div>
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold tracking-[.18em] text-primary"><Gamepad2 className="h-3 w-3" /> ANONYMOS GAME CENTER</div>
          <h1 className="font-display text-3xl font-black md:text-4xl">Prepare-se para <span className="text-primary">jogar.</span></h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Biblioteca de jogos, inicialização local e um modo de energia temporário que pode ser restaurado.</p>
        </div>
      </section>

      <section className="glass relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Zap className="h-6 w-6" /></div>
            <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-bold">Modo de Jogo</h2><span className={`rounded-full border px-2 py-1 text-[9px] font-bold tracking-wider ${boostActive ? "border-success/30 bg-success/10 text-success" : "border-border text-muted-foreground"}`}>{boostActive ? "ATIVO" : "DESATIVADO"}</span></div><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Muda temporariamente o plano de energia do Windows para Alto desempenho. Guarda o plano original e oferece restauração; não desativa serviços nem promete FPS extra.</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!boostActive ? <button type="button" onClick={() => void startBoost()} disabled={boostBusy || !window.anonymosDesktop} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">{boostBusy ? "Ativando…" : <><Zap className="h-4 w-4" /> Ativar Modo de Jogo</>}</button> : <button type="button" onClick={() => void stopBoost()} disabled={boostBusy || !window.anonymosDesktop} className="inline-flex items-center gap-2 rounded-lg border border-success/30 px-4 py-2.5 text-xs font-bold text-success transition hover:bg-success/10 disabled:opacity-50">{boostBusy ? "Restaurando…" : <><RotateCcw className="h-4 w-4" /> Restaurar plano original</>}</button>}
          </div>
        </div>
        {boostMessage && <p role="status" className="relative mt-3 text-xs text-muted-foreground">{boostMessage}</p>}
      </section>

      <section className="glass p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-semibold"><Gamepad2 className="h-4 w-4 text-primary" /> Biblioteca de jogos</div><button type="button" onClick={() => void detectGames()} disabled={detecting || !window.anonymosDesktop} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[10px] font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-foreground disabled:opacity-40"><RefreshCw className={`h-3.5 w-3.5 ${detecting ? "animate-spin" : ""}`} /> {detecting ? "Procurando…" : "Detectar instalações"}</button></div>
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
          {installedGames.some((item) => item.name === selected) && <button onClick={() => void launchDetected()} disabled={busy} className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Gamepad2 className="h-4 w-4" />{busy ? "Iniciando…" : `Abrir ${selected}`}</button>}
          <button onClick={() => void launch()} disabled={busy} className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/50 disabled:opacity-50"><FolderOpen className="h-4 w-4" />{busy ? "Aguardando…" : `Localizar ${selected} (.exe)`}</button>
          <span className="text-xs text-muted-foreground">{detectMessage || "Busca local em diretórios conhecidos da Steam, Epic, Riot e FiveM."}</span>
        </div>
        {status && <div role="status" className="mt-4 break-all rounded-lg border border-border p-3 text-sm">{status}</div>}
      </section>
      <section className="glass flex gap-3 p-4 text-sm">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
        <div><div className="font-semibold">Controles transparentes</div><p className="mt-1 text-muted-foreground">A inicialização abre o executável escolhido. O Modo de Jogo altera somente o plano de energia e guarda o anterior para restauração. Não são encerrados programas automaticamente.</p></div>
      </section>
    </div>
  );
}

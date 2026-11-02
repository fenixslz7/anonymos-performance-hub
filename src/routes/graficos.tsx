import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, Gamepad2, RotateCcw, SlidersHorizontal, Sparkles } from "lucide-react";
import hero from "@/assets/hero-anonymos.jpg";

export const Route = createFileRoute("/graficos")({
  head: () => ({
    meta: [
      { title: "Ajustes Gráficos & Vibrance — Anonymos Performance" },
      { name: "description", content: "Perfis visuais, saturação, contraste, brilho e prévia por jogo." },
      { property: "og:title", content: "Ajustes Gráficos — Anonymos Performance" },
      { property: "og:description", content: "Ajuste a prévia visual dos perfis gamer." },
    ],
  }),
  component: Graphics,
});

type VisualProfile = { sat: number; con: number; bri: number; gamma: number; vib: number };
const presets: Record<string, VisualProfile> = {
  Padrão: { sat: 100, con: 100, bri: 100, gamma: 100, vib: 50 },
  Competitivo: { sat: 140, con: 115, bri: 105, gamma: 110, vib: 80 },
  Cinemático: { sat: 90, con: 120, bri: 95, gamma: 95, vib: 40 },
  Noturno: { sat: 85, con: 95, bri: 80, gamma: 90, vib: 30 },
};
const games = [
  { name: "FiveM", short: "F", image: "https://cdn.jsdelivr.net/npm/simple-icons@16.36.0/icons/fivem.svg" },
  { name: "Fortnite", short: "FN", image: "https://cdn.jsdelivr.net/npm/simple-icons@16.36.0/icons/fortnite.svg" },
  { name: "Counter-Strike 2", short: "CS2", image: "https://cdn.jsdelivr.net/npm/simple-icons@16.36.0/icons/counterstrike.svg" },
  { name: "Valorant", short: "V" },
  { name: "GTA V", short: "V" },
];

function Graphics() {
  const [profiles, setProfiles] = useState<Record<string, { values: VisualProfile; preset: string }>>({});
  const [profilesLoaded, setProfilesLoaded] = useState(false);
  const [selectedGame, setSelectedGame] = useState("FiveM");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("anonymos-visual-profiles-v1");
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const valid: Record<string, { values: VisualProfile; preset: string }> = {};
          for (const [game, entry] of Object.entries(parsed)) {
            if (!entry || typeof entry !== "object") continue;
            const candidate = entry as { values?: Partial<VisualProfile>; preset?: unknown };
            const values = candidate.values;
            if (!values || !["sat", "con", "bri", "gamma", "vib"].every((key) => typeof values[key as keyof VisualProfile] === "number" && Number.isFinite(values[key as keyof VisualProfile]))) continue;
            valid[game] = {
              values: {
                sat: values.sat as number,
                con: values.con as number,
                bri: values.bri as number,
                gamma: values.gamma as number,
                vib: values.vib as number,
              },
              preset: typeof candidate.preset === "string" ? candidate.preset : "Personalizado",
            };
          }
          setProfiles(valid);
        }
      }
    } catch {
      // Um perfil local inválido não impede o painel de funcionar.
    } finally {
      setProfilesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!profilesLoaded) return;
    try {
      window.localStorage.setItem("anonymos-visual-profiles-v1", JSON.stringify(profiles));
    } catch {
      // Se o armazenamento local estiver indisponível, os controles continuam funcionando na sessão.
    }
  }, [profiles, profilesLoaded]);
  const currentProfile = profiles[selectedGame] ?? { values: presets["Padrão"]!, preset: "Padrão" };
  const values = currentProfile.values;
  const activePreset = currentProfile.preset;
  const rows: [keyof VisualProfile, string, number, string][] = [
    ["sat", "Saturação", 200, "Intensidade geral das cores"],
    ["con", "Contraste", 200, "Diferença entre áreas claras e escuras"],
    ["bri", "Brilho", 200, "Luminosidade da prévia"],
    ["gamma", "Gama", 200, "Ajuste de tons médios"],
    ["vib", "Vibrance digital", 100, "Realce de cores menos saturadas"],
  ];
  const applyPreset = (name: string) => { setProfiles((current) => ({ ...current, [selectedGame]: { values: presets[name]!, preset: name } })); };

  return (
    <div className="mx-auto max-w-[1450px] space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 via-card to-background p-6 md:p-8">
        <div className="pointer-events-none absolute -right-8 -top-20 opacity-15"><SlidersHorizontal className="h-64 w-64 text-primary" /></div>
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-extrabold tracking-[.2em] text-primary"><Sparkles className="h-3 w-3" /> VISUAL TUNING STUDIO</div>
          <h1 className="font-display text-3xl font-black md:text-4xl">Gráficos & <span className="text-primary">Vibrance.</span></h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Monte um perfil visual por jogo, teste presets e veja a alteração na imagem de prévia antes de decidir seu estilo. Os ajustes ficam salvos neste computador.</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/5 px-3 py-1.5 text-[10px] text-warning"><Eye className="h-3.5 w-3.5" /> Prévia local · Não altera monitor, driver ou configurações globais do Windows.</div>
        </div>
      </section>

      <section className="glass p-5">
        <div className="mb-3 flex items-center gap-2"><Gamepad2 className="h-4 w-4 text-primary" /><h2 className="text-sm font-bold">Selecione o perfil do jogo</h2></div>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {games.map((game) => <button key={game.name} type="button" aria-pressed={selectedGame === game.name} onClick={() => setSelectedGame(game.name)} className={`group flex min-h-20 items-center gap-3 rounded-xl border px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-primary/50 ${selectedGame === game.name ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-background/30"}`}>
            <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-secondary">
              <span className="font-display text-lg font-black text-muted-foreground">{game.short}</span>
              {game.image && <img src={game.image} alt={`Ícone ${game.name}`} loading="lazy" className="absolute h-8 w-8 object-contain brightness-0 invert" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
            </div>
            <div className="min-w-0"><div className="truncate text-xs font-bold">{game.name}</div><div className="mt-1 text-[9px] text-muted-foreground">{selectedGame === game.name ? "Perfil selecionado" : "Selecionar jogo"}</div></div>
          </button>)}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(300px,390px)_1fr]">
        <section className="glass space-y-5 p-5">
          <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-bold tracking-[.18em] text-primary">PROFILE CONTROL</div><h2 className="mt-1 font-display text-lg font-bold">Ajustes visuais</h2><p className="mt-1 text-xs text-muted-foreground">{selectedGame} · {activePreset}</p></div><button type="button" onClick={() => applyPreset("Padrão")} title="Restaurar valores padrão" className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"><RotateCcw className="h-4 w-4" /></button></div>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(presets).map((name) => <button key={name} type="button" aria-pressed={activePreset === name} onClick={() => applyPreset(name)} className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition ${activePreset === name ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:bg-secondary"}`}>{name}</button>)}
          </div>
          <div className="space-y-5">
            {rows.map(([key, label, max, description]) => <label key={key} className="block">
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold">{label}</span><span className="rounded-md border border-border bg-background px-2 py-1 font-mono text-[10px] tabular-nums text-primary">{values[key]}</span></div>
              <input type="range" min={0} max={max} value={values[key]} onChange={(event) => { setProfiles((current) => ({ ...current, [selectedGame]: { values: { ...values, [key]: Number(event.target.value) }, preset: "Personalizado" } })); }} className="mt-2 w-full cursor-pointer accent-primary" />
              <p className="mt-1 text-[10px] text-muted-foreground">{description}</p>
            </label>)}
          </div>
        </section>

        <section className="glass flex min-h-[460px] flex-col overflow-hidden p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><div className="text-[10px] font-bold tracking-[.18em] text-primary">LIVE VISUAL PREVIEW</div><h2 className="mt-1 font-display text-lg font-bold">{selectedGame} · {activePreset}</h2></div><span className="rounded-full border border-border px-3 py-1 text-[9px] font-bold tracking-wider text-muted-foreground">PRÉVIA DE IMAGEM</span></div>
          <div className="relative flex-1 overflow-hidden rounded-xl border border-border bg-background">
            <img src={hero} alt="Imagem de referência para pré-visualização dos ajustes" loading="lazy" width={1600} height={704} className="h-full min-h-[300px] w-full object-cover transition-[filter] duration-300" style={{ filter: `saturate(${(values.sat / 100) * (1 + (values.vib - 50) / 200)}) contrast(${values.con / 100}) brightness(${(values.bri / 100) * (values.gamma / 100) ** 0.3})` }} />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
            <div className="absolute bottom-0 left-0 right-0 flex flex-wrap items-end justify-between gap-3 p-4"><div><div className="text-[9px] font-bold tracking-[.2em] text-white/60">ANONYMOS VISUAL PROFILE</div><div className="mt-1 font-display text-xl font-black text-white">{selectedGame}</div><div className="text-[10px] text-white/65">{activePreset} · Saturação {values.sat}% · Contraste {values.con}%</div></div><div className="rounded-lg border border-white/20 bg-black/35 px-3 py-2 text-[10px] font-semibold text-white/80">PREVIEW ONLY</div></div>
          </div>
          <p className="mt-3 text-[10px] leading-5 text-muted-foreground">Os controles acima alteram somente esta prévia dentro do ANONYMOS. Para aplicar efeitos diretamente ao jogo ou ao driver, será necessária uma integração compatível com a placa de vídeo.</p>
        </section>
      </div>
    </div>
  );
}

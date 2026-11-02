import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BatteryCharging, Check, ChevronDown, Cpu, Gauge, GitBranch, HardDrive, Info, Network, ShieldCheck, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/otimizacao")({
  head: () => ({ meta: [{ title: "Otimização segura — ANONYMOS PERFORMANCE" }, { name: "description", content: "Árvore de otimização do Windows com alterações reais e confirmação." }] }),
  component: Optimization,
});

const highPlanId = "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c";

function Optimization() {
  const [active, setActive] = useState("Verificando…");
  const [plan, setPlan] = useState<"balanced" | "high">("balanced");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState("power");

  const refresh = async () => {
    if (!window.anonymosDesktop) { setActive("Disponível no aplicativo Windows"); return; }
    try {
      const current = await window.anonymosDesktop.getPowerPlan();
      setActive(current.activeName);
      setPlan(current.activeId === highPlanId ? "high" : "balanced");
    } catch (error) { setActive(error instanceof Error ? error.message : "Não foi possível consultar"); }
  };
  useEffect(() => { void refresh(); }, []);

  const apply = async () => {
    if (!window.anonymosDesktop || busy) return;
    const label = plan === "high" ? "Alto desempenho" : "Equilibrado";
    if (!window.confirm(`Deseja alterar o plano de energia do Windows para "${label}"? Você poderá voltar a esta tela para escolher outro plano.`)) return;
    setBusy(true); setMessage("");
    try {
      await window.anonymosDesktop.setPowerPlan(plan);
      await refresh();
      setMessage(`Plano "${label}" aplicado pelo powercfg do Windows.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha ao alterar o plano."); }
    finally { setBusy(false); }
  };

  const branches = [
    { id: "startup", title: "Inicialização do Windows", subtitle: "Programas que iniciam com o PC", icon: Cpu, state: "EM DESENVOLVIMENTO", detail: "A próxima etapa é ler as entradas reais de inicialização e permitir desativação individual com opção de restaurar. Nenhuma entrada será alterada nesta versão." },
    { id: "services", title: "Serviços do sistema", subtitle: "Diagnóstico de processos e serviços", icon: GitBranch, state: "BLOQUEADO POR SEGURANÇA", detail: "Serviços essenciais, Defender, Firewall e Windows Update não serão desligados por presets. Primeiro será implementada uma lista explicada com estado original e recuperação." },
    { id: "network", title: "Rede e latência", subtitle: "Adaptadores, DNS e conectividade", icon: Network, state: "MÓDULO SEPARADO", detail: "O diagnóstico de rede já está disponível em Internet. Alterações de DNS só serão expostas com leitura do valor atual, confirmação e restauração." },
    { id: "storage", title: "Cache e armazenamento", subtitle: "Arquivos temporários e espaço em disco", icon: HardDrive, state: "MÓDULO SEPARADO", detail: "A Limpeza Inteligente analisa arquivos temporários e apresenta o que será removido antes de executar. Ela não apaga pastas pessoais." },
  ];

  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/20 via-card to-background p-6 md:p-8">
        <div className="pointer-events-none absolute -right-12 -top-16 opacity-15"><GitBranch className="h-64 w-64 text-primary" /></div>
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-extrabold tracking-[.2em] text-primary"><Sparkles className="h-3 w-3" /> ANONYMOS OPTIMIZATION TREE</div>
          <h1 className="font-display text-3xl font-black md:text-4xl">Árvore de <span className="text-primary">otimização.</span></h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Cada ramo representa uma área do Windows. Os controles disponíveis executam ações reais; os próximos módulos ficam identificados, sem interruptores falsos.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="rounded-xl border border-border bg-background/50 px-4 py-3"><div className="text-[9px] font-bold tracking-widest text-muted-foreground">PLANO ATIVO DETECTADO</div><div className="mt-1 text-sm font-bold">{active}</div></div>
            <div className="rounded-xl border border-border bg-background/50 px-4 py-3"><div className="text-[9px] font-bold tracking-widest text-muted-foreground">ALTERAÇÕES AUTOMÁTICAS</div><div className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-success"><ShieldCheck className="h-4 w-4" /> Desativadas</div></div>
          </div>
        </div>
      </section>

      <section className="glass p-5 md:p-6">
        <div className="mb-5 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary"><GitBranch className="h-5 w-5" /></div><div><div className="text-[10px] font-bold tracking-[.18em] text-primary">SYSTEM ROOT</div><h2 className="font-display text-lg font-bold">Núcleo de desempenho</h2></div></div>
        <div className="tree-line ml-5 space-y-4 border-l border-primary/35 pl-5">
          <article className="relative rounded-xl border border-primary/35 bg-primary/5 p-4">
            <span className="tree-node-dot absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary"><BatteryCharging className="h-5 w-5" /></div><div><div className="font-semibold">Plano de energia do Windows</div><p className="mt-1 text-xs text-muted-foreground">Integração nativa via powercfg · leitura e alteração confirmadas.</p></div></div>
              <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[9px] font-bold tracking-wider text-success"><Check className="mr-1 inline h-3 w-3" /> FUNCIONAL</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <button type="button" onClick={() => setPlan("balanced")} aria-pressed={plan === "balanced"} className={`rounded-xl border p-4 text-left transition hover:border-primary/60 ${plan === "balanced" ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-background/30"}`}>
                <div className="flex items-center justify-between"><span className="font-semibold">Equilibrado</span>{plan === "balanced" && <Check className="h-4 w-4 text-primary" />}</div><p className="mt-2 text-xs leading-5 text-muted-foreground">Equilibra consumo de energia e desempenho para uso diário.</p>
              </button>
              <button type="button" onClick={() => setPlan("high")} aria-pressed={plan === "high"} className={`rounded-xl border p-4 text-left transition hover:border-primary/60 ${plan === "high" ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-background/30"}`}>
                <div className="flex items-center justify-between"><span className="font-semibold">Alto desempenho</span>{plan === "high" && <Zap className="h-4 w-4 text-primary" />}</div><p className="mt-2 text-xs leading-5 text-muted-foreground">Pode aumentar consumo e temperatura. Não garante FPS extra.</p>
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3"><button onClick={() => void apply()} disabled={busy || !window.anonymosDesktop} className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Aplicando…" : "Aplicar ajuste selecionado"}</button><button onClick={() => void refresh()} className="rounded-lg border border-border px-4 py-2.5 text-xs font-semibold transition hover:bg-secondary">Atualizar estado</button></div>
            {message && <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p>}
          </article>
          {branches.map((branch) => {
            const Icon = branch.icon;
            const isOpen = expanded === branch.id;
            return <article key={branch.id} className="relative overflow-hidden rounded-xl border border-border bg-background/25 transition hover:border-primary/30">
              <span className="absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-border bg-background" />
              <button type="button" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? "" : branch.id)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
                <div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Icon className="h-5 w-5" /></div><div className="min-w-0"><div className="font-semibold">{branch.title}</div><p className="mt-1 truncate text-xs text-muted-foreground">{branch.subtitle}</p></div></div>
                <div className="flex shrink-0 items-center gap-2"><span className="hidden rounded-full border border-border px-2 py-1 text-[8px] font-bold tracking-wider text-muted-foreground sm:inline">{branch.state}</span><ChevronDown className={`h-4 w-4 text-muted-foreground transition ${isOpen ? "rotate-180" : ""}`} /></div>
              </button>
              {isOpen && <div className="border-t border-border bg-secondary/20 px-4 py-3"><p className="text-xs leading-5 text-muted-foreground">{branch.detail}</p></div>}
            </article>;
          })}
        </div>
      </section>
      <section className="glass flex gap-3 p-4"><Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><h2 className="text-sm font-semibold">Transparência e segurança</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Não desligamos Defender, Firewall, Windows Update ou serviços críticos para tentar forçar desempenho. Novos ramos só serão ativados quando houver diagnóstico, confirmação, registro e forma de restaurar a configuração.</p></div></section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BatteryCharging, ShieldCheck, Zap } from "lucide-react";

export const Route = createFileRoute("/otimizacao")({
  head: () => ({ meta: [{ title: "Otimização segura — ANONYMOS PERFORMANCE" }, { name: "description", content: "Configurações de energia do Windows com confirmação." }] }),
  component: Optimization,
});

function Optimization() {
  const [active, setActive] = useState("Verificando…");
  const [plan, setPlan] = useState<"balanced" | "high">("balanced");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!window.anonymosDesktop) { setActive("Disponível no aplicativo Windows"); return; }
    try {
      const current = await window.anonymosDesktop.getPowerPlan();
      setActive(current.activeName);
      setPlan(current.activeId === "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c" ? "high" : "balanced");
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

  return <div className="space-y-5">
    <header><h1 className="font-display text-2xl font-bold">Otimização do Windows</h1><p className="text-sm text-muted-foreground">Controles reais, limitados e reversíveis. Nenhuma alteração é aplicada sem confirmação.</p></header>
    <section className="glass p-5">
      <div className="flex items-center gap-3"><BatteryCharging className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Plano de energia</h2><p className="text-xs text-muted-foreground">Plano ativo detectado: {active}</p></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <button onClick={() => setPlan("balanced")} className={`rounded-xl border p-4 text-left ${plan === "balanced" ? "border-primary bg-primary/10" : "border-border"}`}><div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Equilibrado</div><p className="mt-2 text-xs text-muted-foreground">Prioriza equilíbrio entre desempenho e consumo de energia.</p></button>
        <button onClick={() => setPlan("high")} className={`rounded-xl border p-4 text-left ${plan === "high" ? "border-primary bg-primary/10" : "border-border"}`}><div className="flex items-center gap-2 font-semibold"><Zap className="h-4 w-4" /> Alto desempenho</div><p className="mt-2 text-xs text-muted-foreground">Pode aumentar consumo e temperatura; não garante mais FPS em todos os PCs.</p></button>
      </div>
      <button onClick={() => void apply()} disabled={busy || !window.anonymosDesktop} className="mt-4 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Aplicando…" : "Aplicar plano selecionado"}</button>
      {message && <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p>}
    </section>
    <section className="glass p-4"><h2 className="font-semibold">Próximas integrações</h2><p className="mt-1 text-sm text-muted-foreground">Inicialização, serviços, cache e configurações gráficas permanecem desativados até terem detecção, confirmação, registro e método de restauração confiáveis. Não exibimos interruptores falsos.</p></section>
  </div>;
}

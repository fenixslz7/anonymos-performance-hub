import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, Globe2, RefreshCw, Router, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import type { AnonymosNetworkDiagnostics } from "@/types/anonymos-desktop";

export const Route = createFileRoute("/internet")({
  head: () => ({ meta: [{ title: "Diagnóstico de Internet — ANONYMOS PERFORMANCE" }, { name: "description", content: "Teste real de latência, perda de pacotes, adaptadores e DNS do Windows." }] }),
  component: Internet,
});

function Internet() {
  const [data, setData] = useState<AnonymosNetworkDiagnostics | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async () => {
    if (!window.anonymosDesktop) { setError("O diagnóstico nativo funciona no aplicativo instalado para Windows."); return; }
    setBusy(true); setError("");
    try { setData(await window.anonymosDesktop.getNetworkDiagnostics()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível concluir o diagnóstico."); }
    finally { setBusy(false); }
  };
  const best = data?.tests.map(t => t.averageMs).filter((n): n is number => n !== null);
  const avg = best?.length ? (best.reduce((a,b)=>a+b,0)/best.length).toFixed(1) : "—";
  return <div className="mx-auto max-w-[1440px] space-y-5">
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/20 via-card to-background p-6 md:p-8">
      <div className="pointer-events-none absolute -right-8 -top-12 opacity-30"><svg viewBox="0 0 300 220" className="h-56 w-72 text-primary"><g fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="150" cy="110" r="40" className="animate-ping" opacity=".3"/><circle cx="150" cy="110" r="72" opacity=".5"/><circle cx="150" cy="110" r="105" opacity=".25"/><path d="M45 110h210M150 5v210M76 36l148 148M224 36 76 184" strokeDasharray="5 8"/></g><circle cx="150" cy="110" r="8" fill="currentColor"/></svg></div>
      <div className="relative max-w-2xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold tracking-[.18em] text-primary"><Wifi className="h-3 w-3"/> NETWORK SENSE</div>
        <h1 className="font-display text-3xl font-extrabold md:text-4xl">Diagnóstico de <span className="text-primary">conexão.</span></h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Meça a latência e a perda de pacotes em destinos públicos, confira adaptadores ativos e servidores DNS configurados no Windows.</p>
        <button onClick={()=>void run()} disabled={busy} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${busy?"animate-spin":""}`}/>{busy?"Testando conexão…":"Executar diagnóstico"}</button>
      </div>
    </section>
    {error && <div role="alert" className="glass border border-warning/40 p-4 text-sm text-warning">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-3">
      <Metric icon={Activity} label="Latência média" value={avg==="—"?"—":avg+" ms"} detail="Média dos destinos que responderam"/>
      <Metric icon={ShieldCheck} label="Perda de pacotes" value={data?data.tests.length?Math.round(data.tests.reduce((a,t)=>a+t.lossPercent,0)/data.tests.length)+"%":"—":"—"} detail="Média dos testes realizados"/>
      <Metric icon={Globe2} label="Destinos testados" value={data?String(data.tests.length):"—"} detail="Cloudflare e Google DNS"/>
    </div>
    <section className="glass overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border p-4"><Globe2 className="h-4 w-4 text-primary"/><div><h2 className="text-sm font-semibold">Qualidade do caminho</h2><p className="text-xs text-muted-foreground">Quatro pacotes ICMP por destino · resultado medido no seu computador.</p></div></div>
      {data?<div className="grid gap-3 p-4 md:grid-cols-2">{data.tests.map(t=><article key={t.target} className="rounded-xl border border-border bg-background/40 p-4"><div className="flex items-center justify-between"><div className="font-display text-lg font-bold">{t.target}</div>{t.received>0?<Wifi className="h-4 w-4 text-success"/>:<WifiOff className="h-4 w-4 text-destructive"/>}</div><div className="mt-3 grid grid-cols-3 gap-2 text-center"><div><div className="text-xl font-bold">{t.averageMs===null?"—":t.averageMs+" ms"}</div><div className="text-[10px] text-muted-foreground">Média</div></div><div><div className="text-xl font-bold">{t.received}/{t.sent}</div><div className="text-[10px] text-muted-foreground">Recebidos</div></div><div><div className="text-xl font-bold">{t.lossPercent}%</div><div className="text-[10px] text-muted-foreground">Perda</div></div></div><div className="mt-3 flex h-8 items-end gap-1">{Array.from({length:4},(_,i)=><div key={i} className="flex-1 rounded-t bg-primary/70 transition-all duration-500" style={{height:t.samples[i]===undefined?"8%":`${Math.max(12,Math.min(100,t.samples[i]/Math.max(1,...t.samples)*100))}%`}} title={t.samples[i]===undefined?"Sem resposta":t.samples[i]+" ms"}/>)}</div></article>)}</div>:<div className="p-8 text-center text-sm text-muted-foreground"><Router className="mx-auto mb-3 h-8 w-8 opacity-50"/>Execute o diagnóstico para visualizar medições reais.</div>}
    </section>
    <div className="grid gap-3 lg:grid-cols-2">
      <section className="glass p-4"><div className="mb-3 flex items-center gap-2"><Router className="h-4 w-4 text-primary"/><h2 className="text-sm font-semibold">Adaptadores ativos</h2></div>{data?.adapters.length?data.adapters.map(a=><div key={a.name} className="border-t border-border py-3"><div className="text-sm font-medium">{a.name}</div><div className="mt-1 text-xs text-muted-foreground">{a.description} · {a.linkSpeed}</div></div>):<p className="text-xs text-muted-foreground">Os adaptadores serão listados após o teste.</p>}</section>
      <section className="glass p-4"><div className="mb-3 flex items-center gap-2"><Globe2 className="h-4 w-4 text-primary"/><h2 className="text-sm font-semibold">Servidores DNS</h2></div>{data?.dns.length?data.dns.map((d,i)=><div key={d.interface+i} className="border-t border-border py-3"><div className="text-sm font-medium">{d.interface}</div><div className="mt-1 break-all text-xs text-muted-foreground">{d.servers.join(" · ")}</div></div>):<p className="text-xs text-muted-foreground">A configuração DNS será exibida após o teste.</p>}</section>
    </div>
    <p className="text-[11px] leading-5 text-muted-foreground">A latência depende da rota, do provedor, do Wi-Fi e do servidor de destino. Alterar DNS não garante redução de ping em jogos. O teste usa apenas consultas de rede e não modifica configurações.</p>
  </div>;
}

function Metric({icon:Icon,label,value,detail}:{icon:typeof Activity;label:string;value:string;detail:string}) {
  return <article className="glass p-4 transition duration-300 hover:-translate-y-1 hover:border-primary/40"><div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><Icon className="h-4 w-4 text-primary"/></div><div className="mt-2 font-display text-2xl font-bold">{value}</div><p className="mt-1 text-[11px] text-muted-foreground">{detail}</p></article>;
}

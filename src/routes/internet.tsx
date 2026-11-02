import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, ArrowDownToLine, ArrowUpFromLine, Gauge, Globe2, RefreshCw, Router, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import type { AnonymosNetworkDiagnostics, AnonymosSpeedTestResult } from "@/types/anonymos-desktop";

export const Route = createFileRoute("/internet")({
  head: () => ({ meta: [{ title: "Diagnóstico de Internet — ANONYMOS PERFORMANCE" }, { name: "description", content: "Teste real de latência, perda de pacotes, adaptadores e DNS do Windows." }] }),
  component: Internet,
});

function Internet() {
  const [data, setData] = useState<AnonymosNetworkDiagnostics | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [speed, setSpeed] = useState<AnonymosSpeedTestResult | null>(null);
  const [speedBusy, setSpeedBusy] = useState(false);
  const [speedError, setSpeedError] = useState("");
  const run = async () => {
    if (!window.anonymosDesktop) { setError("O diagnóstico nativo funciona no aplicativo instalado para Windows."); return; }
    setBusy(true); setError("");
    try { setData(await window.anonymosDesktop.getNetworkDiagnostics()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível concluir o diagnóstico."); }
    finally { setBusy(false); }
  };
  const runSpeedTest = async () => {
    if (!window.anonymosDesktop) { setSpeedError("O teste de velocidade funciona no aplicativo instalado para Windows."); return; }
    setSpeedBusy(true); setSpeedError(""); setSpeed(null);
    try { setSpeed(await window.anonymosDesktop.runSpeedTest()); }
    catch (cause) { setSpeedError(cause instanceof Error ? cause.message : "Não foi possível medir a velocidade."); }
    finally { setSpeedBusy(false); }
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
    <section className="glass relative overflow-hidden p-5 md:p-6">
      <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-primary/10"/><div className="pointer-events-none absolute -right-4 -top-8 h-40 w-40 rounded-full border border-primary/15"/>
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div><div className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold tracking-[.18em] text-primary"><Gauge className="h-3.5 w-3.5"/> SPEED TEST</div><h2 className="font-display text-xl font-bold">Velocidade da internet</h2><p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">Meça download e upload com transferência real de dados pelo Cloudflare. O teste pode consumir cerca de 11 MB da sua franquia.</p></div>
        <button onClick={()=>void runSpeedTest()} disabled={speedBusy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${speedBusy?"animate-spin":""}`}/>{speedBusy?"Medindo velocidade…":speed?"Testar novamente":"Iniciar teste"}</button>
      </div>
      {speedError && <div role="alert" className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning">{speedError}</div>}
      {speedBusy && <div className="mt-5 space-y-2"><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-1/2 animate-pulse rounded-full bg-primary"/></div><p className="text-xs text-muted-foreground">Transferindo dados para medir a conexão. Isso pode levar alguns segundos…</p></div>}
      <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-background/50 p-4 transition duration-300 hover:border-primary/40"><div className="flex items-center gap-2 text-xs text-muted-foreground"><ArrowDownToLine className="h-4 w-4 text-primary"/> DOWNLOAD</div><div className="mt-3 flex items-baseline gap-2"><span className="font-display text-4xl font-extrabold tabular-nums">{speed?speed.downloadMbps.toFixed(2):"—"}</span><span className="text-xs text-muted-foreground">Mbps</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-1000" style={{width:speed?`${Math.min(100,speed.downloadMbps/1000*100)}%`:"0%"}}/></div><p className="mt-2 text-[10px] text-muted-foreground">{speed? `Dados recebidos: ${(speed.downloadBytes/1024/1024).toFixed(1)} MB · ${(speed.downloadDurationMs/1000).toFixed(1)} s`:"Velocidade de recebimento de dados"}</p></div>
        <div className="rounded-xl border border-border bg-background/50 p-4 transition duration-300 hover:border-primary/40"><div className="flex items-center gap-2 text-xs text-muted-foreground"><ArrowUpFromLine className="h-4 w-4 text-primary"/> UPLOAD</div><div className="mt-3 flex items-baseline gap-2"><span className="font-display text-4xl font-extrabold tabular-nums">{speed?speed.uploadMbps.toFixed(2):"—"}</span><span className="text-xs text-muted-foreground">Mbps</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-primary transition-all duration-1000" style={{width:speed?`${Math.min(100,speed.uploadMbps/1000*100)}%`:"0%"}}/></div><p className="mt-2 text-[10px] text-muted-foreground">{speed? `Dados enviados: ${(speed.uploadBytes/1024/1024).toFixed(1)} MB · ${(speed.uploadDurationMs/1000).toFixed(1)} s`:"Velocidade de envio de dados"}</p></div>
      </div>
      {speed && <p className="mt-3 text-[10px] text-muted-foreground">Medição concluída em {new Date(speed.capturedAt).toLocaleTimeString()} · Provedor: {speed.provider}. O resultado varia conforme servidor, Wi-Fi, tráfego da rede e plano contratado.</p>}
    </section>
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

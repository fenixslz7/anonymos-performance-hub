import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, CheckCircle2, CircleAlert, Crosshair, Eye, MousePointer2, PlugZap, RefreshCw, Save, ShieldCheck, SlidersHorizontal, Wifi } from "lucide-react";

type ReachStatus = { enabled: boolean; distance: number; maxDistance: number; version?: string };

export const Route = createFileRoute("/minecraft")({
  head: () => ({ meta: [{ title: "Minecraft 1.8.9 — ANONYMOS PERFORMANCE" }, { name: "description", content: "Painel de testes privados para Minecraft 1.8.9." }] }),
  component: MinecraftLab,
});

function MinecraftLab() {
  const [apiUrl, setApiUrl] = useState("http://127.0.0.1:8765");
  const [token, setToken] = useState("");
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [distance, setDistance] = useState(4.5);
  const [serverStatus, setServerStatus] = useState<ReachStatus | null>(null);
  const [message, setMessage] = useState("Conecte o painel à API do plugin instalado no seu servidor privado.");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("anonymos-minecraft-connection");
      if (saved) {
        const parsed = JSON.parse(saved) as { apiUrl?: string; token?: string };
        if (parsed.apiUrl) setApiUrl(parsed.apiUrl);
        if (parsed.token) setToken(parsed.token);
      }
    } catch { /* Configuração local inválida: mantém os padrões seguros. */ }
  }, []);

  const apiRequest = async (path: string, method: "GET" | "POST" = "GET", body?: object) => {
    const base = apiUrl.trim().replace(/\/$/, "");
    if (!/^https?:\/\//i.test(base)) throw new Error("Informe um endereço HTTP ou HTTPS válido.");
    if (!token.trim()) throw new Error("Informe o token gerado pelo plugin no servidor.");
    const response = await fetch(base + path, {
      method,
      headers: { Authorization: "Bearer " + token.trim(), ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(response.status === 401 ? "Token incorreto. Confira api.token no config.yml do plugin." : "API respondeu com HTTP " + response.status + ".");
    return await response.json() as ReachStatus;
  };

  const connect = async () => {
    setBusy(true); setError(""); setMessage("Conectando ao servidor privado…");
    try {
      const status = await apiRequest("/api/status");
      setServerStatus(status); setEnabled(status.enabled); setDistance(status.distance);
      setConnected(true); setMessage("Conectado ao plugin ANONYMOS Private Reach.");
      localStorage.setItem("anonymos-minecraft-connection", JSON.stringify({ apiUrl: apiUrl.trim() }));
    } catch (cause) {
      setConnected(false); setServerStatus(null);
      const reason = cause instanceof Error ? cause.message : "Não foi possível conectar.";
      setError(reason); setMessage("Conexão não estabelecida.");
    } finally { setBusy(false); }
  };

  const applySettings = async () => {
    setBusy(true); setError(""); setMessage("Aplicando configuração no servidor…");
    try {
      const status = await apiRequest("/api/reach", "POST", { enabled, distance });
      setServerStatus(status); setEnabled(status.enabled); setDistance(status.distance);
      setMessage("Configuração confirmada pelo servidor. O Reach está " + (status.enabled ? "ativado." : "desativado."));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao aplicar configuração.");
      setMessage("O servidor não confirmou a alteração.");
    } finally { setBusy(false); }
  };

  const disconnect = () => { setConnected(false); setServerStatus(null); setError(""); setMessage("Painel desconectado. O último estado configurado no servidor permanece ativo."); };

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6">
      <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-[#11101e] via-[#111827] to-[#090d16] p-6 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-extrabold tracking-[.2em] text-primary"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> PRIVATE SERVER LAB</div>
            <h1 className="mt-4 font-display text-3xl font-black tracking-tight md:text-4xl">Minecraft <span className="hero-title-glow">1.8.9</span></h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Central externa para testes controlados no seu próprio servidor. O alcance é validado pelo plugin no servidor, não por uma alteração visual no cliente.</p>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-glow"><Crosshair className="h-8 w-8" /></div>
        </div>
        <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/25 p-4"><div className="text-[10px] font-bold tracking-widest text-muted-foreground">VERSÃO</div><div className="mt-1 font-display text-xl font-bold">1.8.9</div><div className="mt-1 text-xs text-muted-foreground">Compatível com servidor Spigot 1.8.8</div></div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-4"><div className="text-[10px] font-bold tracking-widest text-muted-foreground">ALCANCE MÁXIMO</div><div className="mt-1 font-display text-xl font-bold">6.0 blocos</div><div className="mt-1 text-xs text-muted-foreground">Limite fixo do plugin privado</div></div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-4"><div className="text-[10px] font-bold tracking-widest text-muted-foreground">CONEXÃO</div><div className="mt-1 flex items-center gap-2 font-display text-xl font-bold">{connected ? "ONLINE" : "OFFLINE"}<span className={connected ? "h-2 w-2 rounded-full bg-success" : "h-2 w-2 rounded-full bg-muted-foreground"} /></div><div className="mt-1 text-xs text-muted-foreground">API autenticada do seu servidor</div></div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="glass p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><div className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary"><Crosshair className="h-4 w-4" /> COMBAT / REACH</div><h2 className="mt-2 font-display text-2xl font-bold">Controle de alcance</h2></div>
            <span className={connected ? "rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[10px] font-bold text-success" : "rounded-full border border-border bg-secondary px-3 py-1 text-[10px] font-bold text-muted-foreground"}>{connected ? "SERVIDOR CONECTADO" : "AGUARDANDO CONEXÃO"}</span>
          </div>
          <div className="mt-6 rounded-xl border border-border bg-background/50 p-4">
            <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Private Reach</div><div className="mt-1 text-xs text-muted-foreground">O servidor privado aplica e valida a distância.</div></div><button type="button" disabled={!connected || busy} onClick={() => setEnabled((value) => !value)} aria-pressed={enabled} className={enabled ? "h-8 w-14 rounded-full bg-primary p-1 transition disabled:opacity-40" : "h-8 w-14 rounded-full bg-muted p-1 transition disabled:opacity-40"}><span className={enabled ? "ml-auto block h-6 w-6 rounded-full bg-white shadow transition" : "block h-6 w-6 rounded-full bg-white shadow transition"} /></button></div>
            <div className="mt-7 flex items-end justify-between"><label htmlFor="reach-distance" className="text-sm font-semibold">Distância de alcance</label><div className="font-display text-3xl font-black text-primary tabular-nums">{distance.toFixed(1)} <span className="text-sm font-semibold text-muted-foreground">blocos</span></div></div>
            <input id="reach-distance" aria-label="Distância de alcance em blocos" type="range" min="3.1" max="6" step="0.1" value={distance} onChange={(event) => setDistance(Number(event.target.value))} disabled={!connected || busy} className="mt-4 w-full accent-primary disabled:opacity-40" />
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>3.1 blocos</span><span>4.5 padrão</span><span>6.0 máximo</span></div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => void applySettings()} disabled={!connected || busy} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"><Save className="h-4 w-4" />{busy ? "Aplicando…" : "Aplicar no servidor"}</button>
              <button type="button" onClick={() => { setEnabled(false); setDistance(4.5); }} disabled={!connected || busy} className="rounded-lg border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground transition hover:bg-secondary disabled:opacity-40">Preencher padrão</button>
            </div>
          </div>
          {serverStatus && <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">ESTADO CONFIRMADO</div><div className="mt-1 text-sm font-bold">{serverStatus.enabled ? "Ativado" : "Desativado"}</div></div><div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">DISTÂNCIA NO SERVIDOR</div><div className="mt-1 text-sm font-bold">{serverStatus.distance.toFixed(1)} blocos</div></div></div>}
        </section>

        <section className="glass p-5 md:p-6">
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-primary"><PlugZap className="h-4 w-4" /> SERVER BRIDGE</div>
          <h2 className="mt-2 font-display text-2xl font-bold">Conectar servidor</h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Instale o plugin ANONYMOS Private Reach no seu Spigot 1.8.8, inicie o servidor e informe o endereço e o token gerado no arquivo config.yml.</p>
          <div className="mt-5 space-y-3">
            <label className="block text-xs font-semibold text-muted-foreground">Endereço da API<input value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} placeholder="http://127.0.0.1:8765" className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary" /></label>
            <label className="block text-xs font-semibold text-muted-foreground">Token do plugin<input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Cole aqui o api.token do config.yml" className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary" /></label>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void connect()} disabled={busy || !token.trim()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-40"><Wifi className="h-4 w-4" />{busy ? "Conectando…" : "Testar conexão"}</button>{connected && <button type="button" onClick={disconnect} className="rounded-lg border border-border px-4 py-2.5 text-xs font-semibold hover:bg-secondary">Desconectar</button>}</div>
          </div>
          <div role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-background/50 p-3 text-xs leading-5"><span className="mt-0.5">{error ? <CircleAlert className="h-4 w-4 text-destructive" /> : connected ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Activity className="h-4 w-4 text-muted-foreground" />}</span><span className={error ? "text-destructive" : "text-muted-foreground"}>{error || message}</span></div>
        </section>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="glass flex gap-4 p-5"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground"><Eye className="h-5 w-5" /></div><div><div className="flex items-center gap-2"><h3 className="font-semibold">ESP</h3><span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[9px] font-bold text-warning">CLIENT MOD PENDENTE</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">O ESP através de paredes exige integração do lado do cliente para Minecraft 1.8.9. Não está sendo apresentado como funcional nesta primeira entrega.</p></div></div>
        <div className="glass flex gap-4 p-5"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-muted-foreground"><MousePointer2 className="h-5 w-5" /></div><div><div className="flex items-center gap-2"><h3 className="font-semibold">Auto Clicker</h3><span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[9px] font-bold text-warning">CLIENT MOD PENDENTE</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">O envio de cliques automáticos precisa de integração local do cliente. Esta versão não simula CPS nem finge enviar cliques.</p></div></div>
      </section>
      <section className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><div className="text-sm font-semibold">Ambiente privado e autenticado</div><p className="mt-1 text-xs leading-5 text-muted-foreground">A API do plugin usa token Bearer e escuta em 127.0.0.1 por padrão. Se o servidor estiver em outra máquina da sua rede privada, altere api.host para 0.0.0.0 e proteja a porta 8765 no firewall. Não exponha essa API à internet.</p></div></section>
    </div>
  );
}

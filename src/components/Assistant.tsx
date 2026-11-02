import { useEffect, useRef, useState } from "react";
import { Bot, Cpu, MemoryStick, MonitorCog, Send, Sparkles, Wifi, X } from "lucide-react";
import type { AnonymosSystemSnapshot } from "@/types/anonymos-desktop";

type Msg = { role: "user" | "assistant"; text: string };
const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "N/D";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = value, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
};

function reply(question: string, snapshot: AnonymosSystemSnapshot | null): string {
  const query = question.toLowerCase();
  if (query.includes("ram") || query.includes("memória") || query.includes("memoria")) {
    if (!snapshot) return "Ainda não recebi uma leitura do Windows. Abra o aplicativo desktop e consulte o Monitor para verificar o uso de RAM.";
    const usage = Math.round(snapshot.memory.usedPercent);
    return `A leitura atual mostra ${usage}% de RAM em uso (${formatBytes(snapshot.memory.usedBytes)} de ${formatBytes(snapshot.memory.totalBytes)}). ${usage >= 85 ? "É uma utilização elevada: confira os processos no Monitor e feche somente os aplicativos que reconhecer e não estiver usando." : "Não há sinal de uso extremamente alto nesta amostra. Confira o Monitor para identificar quais aplicativos estão consumindo memória."}`;
  }
  if (query.includes("cpu") || query.includes("processador")) {
    if (!snapshot) return "Não há uma leitura nativa disponível agora. Abra o Monitor no aplicativo desktop para consultar o processador.";
    const load = snapshot.cpu.loadPercent;
    return `Processador detectado: ${snapshot.cpu.name}. Utilização nesta amostra: ${load == null ? "indisponível" : Math.round(load) + "%"}. ${load != null && load >= 85 ? "A carga está alta agora; confira os processos antes de encerrar qualquer aplicativo." : "Compare a leitura com o comportamento do PC durante o jogo para identificar picos."}`;
  }
  if (query.includes("gpu") || query.includes("placa de vídeo") || query.includes("placa de video")) {
    if (!snapshot) return "A detecção da GPU ainda não está disponível. Abra o Monitor na versão desktop.";
    return `Adaptadores detectados: ${snapshot.gpu.map((gpu) => gpu.name + (gpu.adapterRamBytes ? " · " + formatBytes(gpu.adapterRamBytes) + " de memória reportada" : "")).join("; ") || "nenhum"}. Uso em porcentagem e temperatura ainda dependem de integração específica do fabricante e não são medidos nesta versão.`;
  }
  if (query.includes("ping") || query.includes("lag") || query.includes("internet")) return "Abra a área Internet para medir latência, perda de pacotes, adaptadores e DNS. Esses testes ajudam a diagnosticar a conexão, mas nenhuma alteração garante redução de ping.";
  if (query.includes("ssd") || query.includes("disco") || query.includes("armazenamento")) {
    if (!snapshot) return "Aguardo uma leitura do armazenamento no Monitor do aplicativo desktop.";
    return "Unidades detectadas: " + (snapshot.disks.map((disk) => `${disk.name}: ${formatBytes(disk.freeBytes)} livres de ${formatBytes(disk.sizeBytes)}`).join("; ") || "nenhuma unidade identificada") + ".";
  }
  if (query.includes("fps") || query.includes("jogo")) {
    if (!snapshot) return "Para investigar quedas de FPS, compare as leituras de CPU e RAM no Monitor durante a partida. Ainda não existe benchmark automático nesta versão.";
    const cpu = snapshot.cpu.loadPercent == null ? "N/D" : Math.round(snapshot.cpu.loadPercent) + "%";
    const ram = Math.round(snapshot.memory.usedPercent) + "%";
    return `Na última amostra do Windows: CPU ${cpu} e RAM ${ram}. Isso, sozinho, não prova gargalo. Compare com uma partida real e observe os processos no Monitor; a medição de FPS ainda não está integrada.`;
  }
  return "Posso consultar CPU, RAM, GPU, armazenamento e conexão. Pergunte sobre um desses componentes e vou separar os dados medidos do que ainda não está disponível.";
}

export function Assistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [snapshot, setSnapshot] = useState<AnonymosSystemSnapshot | null>(null);
  const [telemetry, setTelemetry] = useState("Aguardando leitura do Windows");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const load = async () => {
      if (!window.anonymosDesktop) { setTelemetry("Abra o aplicativo desktop para conectar a telemetria"); return; }
      try {
        const data = await window.anonymosDesktop.getSystemSnapshot();
        if (active) { setSnapshot(data); setTelemetry("Dados locais conectados"); }
      } catch { if (active) setTelemetry("Telemetria indisponível no momento"); }
    };
    void load();
    return () => { active = false; };
  }, [open]);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = () => {
    const question = input.trim();
    if (!question) return;
    setMsgs((current) => [...current, { role: "user", text: question }, { role: "assistant", text: reply(question, snapshot) }]);
    setInput("");
  };

  const suggestions = [
    { label: "Uso da CPU", question: "Como está minha CPU?", icon: Cpu },
    { label: "Memória RAM", question: "Como está minha RAM?", icon: MemoryStick },
    { label: "Minha GPU", question: "Quais GPUs foram detectadas?", icon: MonitorCog },
    { label: "Ping e conexão", question: "Como diagnosticar lag e ping?", icon: Wifi },
  ];

  return (
    <aside className={`assistant-drawer shrink-0 overflow-hidden border-l border-border bg-sidebar transition-all duration-300 ${open ? "w-80 xl:w-[360px]" : "w-0 border-l-0"}`} aria-hidden={!open}>
      <div className="flex h-full w-80 flex-col xl:w-[360px]">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary"><Bot className="h-5 w-5" /></div><div><div className="text-sm font-bold">ANONYMOS GUIDE</div><div className="text-[10px] text-muted-foreground">Assistente local · versão beta</div></div></div>
          <button type="button" onClick={onClose} aria-label="Fechar assistente" className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {msgs.length === 0 && <div className="flex flex-col items-center pt-4 text-center">
            <div className="assistant-orb relative grid h-36 w-36 place-items-center">
              <div className="assistant-orb-ring absolute inset-0 rounded-full border border-primary/70" />
              <div className="assistant-orb-ring assistant-orb-ring-delayed absolute inset-3 rounded-full border border-cyan-300/50" />
              <div className="absolute inset-7 rounded-full bg-gradient-to-br from-primary/45 via-background to-cyan-400/25 shadow-glow" />
              <div className="relative grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-background/80 text-primary"><Sparkles className="h-6 w-6" /></div>
            </div>
            <div className="mt-5 text-sm font-semibold">Seu computador, sob análise.</div>
            <p className="mt-2 max-w-[260px] text-xs leading-5 text-muted-foreground">Consulte leituras reais quando o desktop estiver conectado. As respostas não substituem medições que ainda não existem.</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[10px] text-muted-foreground"><span className={`h-1.5 w-1.5 rounded-full ${snapshot ? "bg-success" : "bg-warning"}`} />{telemetry}</div>
            {snapshot && <div className="mt-5 grid w-full grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-background/50 p-3 text-left"><Cpu className="h-4 w-4 text-primary" /><div className="mt-2 text-lg font-bold">{snapshot.cpu.loadPercent == null ? "N/D" : Math.round(snapshot.cpu.loadPercent) + "%"}</div><div className="text-[9px] text-muted-foreground">CPU · USO</div></div>
              <div className="rounded-xl border border-border bg-background/50 p-3 text-left"><MemoryStick className="h-4 w-4 text-primary" /><div className="mt-2 text-lg font-bold">{Math.round(snapshot.memory.usedPercent)}%</div><div className="text-[9px] text-muted-foreground">RAM · USO</div></div>
            </div>}
            <div className="mt-5 grid w-full grid-cols-2 gap-2">
              {suggestions.map((item) => { const Icon = item.icon; return <button key={item.label} type="button" onClick={() => setInput(item.question)} className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2.5 text-left text-[10px] font-semibold transition hover:border-primary/50 hover:bg-primary/5"><Icon className="h-4 w-4 shrink-0 text-primary" />{item.label}</button>; })}
            </div>
          </div>}
          {msgs.map((message, index) => <div key={index} className={`max-w-[90%] rounded-2xl px-3 py-2.5 text-xs leading-5 ${message.role === "user" ? "ml-auto bg-brand text-primary-foreground" : "border border-border bg-background/70 text-foreground"}`}>{message.text}</div>)}
          <div ref={end} />
        </div>
        <form onSubmit={(event) => { event.preventDefault(); send(); }} className="m-3 flex gap-2 rounded-xl border border-border bg-background p-2">
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Pergunte sobre seu PC..." aria-label="Mensagem para o assistente" className="min-w-0 flex-1 bg-transparent px-2 text-xs outline-none" />
          <button type="submit" disabled={!input.trim()} aria-label="Enviar mensagem" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-primary-foreground disabled:opacity-40"><Send className="h-3.5 w-3.5" /></button>
        </form>
        <div className="px-4 pb-3 text-center text-[9px] text-muted-foreground">Orientações locais · Nenhuma alteração é executada pelo assistente.</div>
      </div>
    </aside>
  );
}

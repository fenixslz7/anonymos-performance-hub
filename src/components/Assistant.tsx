import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";

type Msg = { role: "user" | "ai"; text: string };

function reply(q: string): string {
  const t = q.toLowerCase();
  if (t.includes("fps")) return "Para ganhar FPS: ative o Modo Limpeza, desative o Xbox Game Bar na Árvore de Otimização e use o preset Competitivo em Gráficos.";
  if (t.includes("ram") || t.includes("memória") || t.includes("memoria")) return "Sua RAM está alta. Use 'Liberar Memória' no Dashboard e feche apps em segundo plano.";
  if (t.includes("cpu")) return "Abra o Monitor para ver os processos que mais consomem CPU — os hexágonos vermelhos são os mais pesados.";
  if (t.includes("ping") || t.includes("lag")) return "Para reduzir lag, pause o Windows Update durante partidas e desative a Telemetria.";
  return "Posso ajudar com FPS, RAM, CPU ou lag. Pergunte qualquer coisa sobre o desempenho do seu PC!";
}

export function Assistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, typing]);

  const send = () => {
    const q = input.trim();
    if (!q) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setTyping(true);
    setTimeout(() => { setMsgs((m) => [...m, { role: "ai", text: reply(q) }]); setTyping(false); }, 900);
  };

  return (
    <aside className={`shrink-0 overflow-hidden border-l border-border bg-sidebar transition-all duration-300 ${open ? "w-80" : "w-0 border-l-0"}`}>
      <div className="flex h-full w-80 flex-col">
        <div className="flex items-center justify-between p-4">
          <div><div className="text-sm font-semibold">Anonymos IA</div><div className="text-xs text-muted-foreground">Assistente de desempenho</div></div>
          <button onClick={onClose} className="rounded p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4">
          {msgs.length === 0 && (
            <div className="flex flex-col items-center pt-8 text-center">
              <div className="relative h-36 w-36">
                <div className="absolute inset-0 rounded-full bg-brand opacity-70 blur-xl" style={{ animation: "orb 6s linear infinite" }} />
                <div className="absolute inset-3 rounded-full border-4 border-primary/60" style={{ animation: "orb 3s linear infinite", borderTopColor: "transparent" }} />
                <div className="absolute inset-6 rounded-full bg-background" />
              </div>
              <p className="mt-6 text-sm text-muted-foreground">Pergunte qualquer coisa sobre o desempenho do seu PC.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {["Como ganhar FPS?", "Minha RAM está cheia", "Reduzir lag"].map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary">{s}</button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "ml-auto bg-brand text-primary-foreground" : "bg-secondary"}`}>{m.text}</div>
          ))}
          {typing && <div className="w-16 rounded-2xl bg-secondary px-3 py-2 text-sm text-muted-foreground animate-pulse">•••</div>}
          <div ref={end} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="m-3 flex gap-2 rounded-xl border border-border bg-background p-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Mensagem..." className="flex-1 bg-transparent px-2 text-sm outline-none" />
          <button className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-primary-foreground"><Send className="h-3.5 w-3.5" /></button>
        </form>
      </div>
    </aside>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LineChart, useSeries } from "@/lib/live-charts";

export const Route = createFileRoute("/monitor")({
  head: () => ({
    meta: [
      { title: "Monitor em tempo real — Anonymos Performance" },
      { name: "description", content: "Mapa hexagonal dos processos e threads do sistema em tempo real." },
      { property: "og:title", content: "Monitor em tempo real — Anonymos Performance" },
      { property: "og:description", content: "Veja cada processo do seu PC em uma colmeia interativa." },
    ],
  }),
  component: Monitor,
});

const names = ["chrome.exe", "Discord.exe", "svchost.exe", "explorer.exe", "SrTasks.exe", "steam.exe", "dwm.exe", "RuntimeBroker.exe", "csrss.exe", "OneDrive.exe", "Spotify.exe", "nvcontainer.exe"];
const R = 9, ROWS = 26, COLS = 34;

function Monitor() {
  const cells = useMemo(() => {
    const out: { x: number; y: number; d: number; name: string; pid: number }[] = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = c * R * 1.75 + (r % 2) * R * 0.875 + R, y = r * R * 1.5 + R;
      const d = Math.hypot(c - COLS / 2, (r - ROWS / 2) * 1.15);
      if (d < 15) out.push({ x, y, d, name: names[(r * 7 + c) % names.length], pid: 1000 + r * 97 + c * 13 });
    }
    return out;
  }, []);
  const [load, setLoad] = useState<number[]>(() => cells.map(() => 0));
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLoad(cells.map((c) => (c.d < 2 ? 40 + Math.random() * 50 : c.d < 8 ? Math.random() * 25 : Math.random() < 0.03 ? 30 : Math.random() * 3)));
    tick(); const id = setInterval(tick, 1500); return () => clearInterval(id);
  }, [cells]);
  const color = (v: number, d: number) => v > 60 ? "var(--destructive)" : v > 30 ? "var(--warning)" : d < 3 ? "var(--accent)" : d < 9 ? "var(--success)" : "var(--muted)";
  const cpu = useSeries(80, 12, 8, 700);
  const ram = 70;
  const h = cells[hover ?? -1];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <section className="glass relative p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><h1 className="font-display text-lg font-bold">Processos</h1><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-success" />{cells.length} a correr · 3507 threads</span></div>
          <span className="rounded-md border border-border px-2 py-1 text-xs">Em tempo real</span>
        </div>
        <svg viewBox={`0 0 ${COLS * R * 1.75 + R * 2} ${ROWS * R * 1.5 + R}`} className="mx-auto mt-4 w-full max-w-2xl">
          {cells.map((c, i) => {
            const pts = Array.from({ length: 6 }, (_, k) => { const a = (Math.PI / 3) * k + Math.PI / 6; return `${c.x + (R - 1) * Math.cos(a)},${c.y + (R - 1) * Math.sin(a)}`; }).join(" ");
            return <polygon key={i} points={pts} fill={color(load[i], c.d)} opacity={hover === i ? 1 : 0.85} stroke={hover === i ? "var(--foreground)" : "none"} className="cursor-pointer transition-[fill] duration-700" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />;
          })}
        </svg>
        <div className="absolute bottom-4 left-4 min-w-48 rounded-lg border border-border bg-popover p-3 text-xs">
          {h ? (<><div className="font-semibold">{h.name}</div><div className="mt-1 text-muted-foreground">{load[hover!].toFixed(1)}% CPU · {Math.round(40 + h.pid % 400)} MB · PID {h.pid}</div></>) : <div className="text-muted-foreground">Passe o mouse sobre um hexágono</div>}
        </div>
      </section>
      <div className="flex flex-col gap-4">
        <section className="glass p-4">
          <div className="text-sm font-semibold">Uso de CPU</div><div className="text-xs text-muted-foreground">Em tempo real · 8 núcleos</div>
          <div className="mt-2 font-display text-3xl font-bold">{Math.round(cpu[cpu.length - 1] ?? 0)} %</div>
          <LineChart data={cpu} height={110} />
        </section>
        <section className="glass space-y-3 p-4 text-sm">
          <div className="flex justify-between font-semibold">Sistema <span className="text-xs font-normal text-muted-foreground">54h 57m</span></div>
          {[["Processador", "Ryzen 7 7800X3D"], ["Memória", "11 / 16 GB"], ["Disco C:", "50 GB livres"], ["Serviços", "57 a correr · 12 no arranque"]].map(([k, v]) => <div key={k} className="flex justify-between text-xs"><span className="text-muted-foreground">{k}</span><span>{v}</span></div>)}
        </section>
        <section className="glass p-4">
          <div className="text-sm font-semibold">Memória em uso</div>
          <div className="mt-1 font-display text-3xl font-bold">{ram} % <span className="text-xs font-normal text-muted-foreground">de 16 GB instalados</span></div>
          <div className="mt-3 flex gap-[3px]">{Array.from({ length: 36 }, (_, i) => <div key={i} className={`h-5 flex-1 rounded-sm ${i / 36 < ram / 100 ? "bg-accent" : "bg-muted"}`} />)}</div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>0%</span><span>100%</span></div>
        </section>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";

export function useSeries(len = 40, base = 30, jitter = 10, ms = 1000) {
  const [data, setData] = useState<number[]>(() => Array.from({ length: len }, (_, i) => base + Math.sin(i / 3) * jitter * 0.6 + Math.sin(i * 1.7) * jitter * 0.3));
  useEffect(() => {
    const id = setInterval(() => {
      setData((d) => {
        const last = d[d.length - 1];
        const next = Math.max(2, Math.min(98, last + (Math.random() - 0.5) * jitter + (base - last) * 0.1));
        return [...d.slice(1), next];
      });
    }, ms);
    return () => clearInterval(id);
  }, [base, jitter, ms]);
  return data;
}

export function LineChart({ data, height = 140, className = "" }: { data: number[]; height?: number; className?: string }) {
  const w = 400;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - (v / 100) * height}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={`w-full ${className}`} style={{ height }}>
      <defs>
        <linearGradient id="lg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0.4" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={w} y1={height * f} y2={height * f} stroke="var(--border)" />)}
      <polygon points={`0,${height} ${pts} ${w},${height}`} fill="url(#lg)" />
      <polyline points={pts} fill="none" stroke="var(--primary-glow)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

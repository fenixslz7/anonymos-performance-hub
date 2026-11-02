export interface AnonymosSystemSnapshot {
  capturedAt: string;
  computer: string;
  manufacturer: string;
  model: string;
  cpu: { name: string; loadPercent: number | null; cores: number; logicalProcessors: number; maxClockMHz: number };
  memory: { totalBytes: number; freeBytes: number; usedBytes: number; usedPercent: number };
  gpu: Array<{ name: string; driverVersion: string; adapterRamBytes: number | null }>;
  disks: Array<{ name: string; label: string | null; sizeBytes: number; freeBytes: number }>;
  os: { caption: string; version: string; build: string; lastBoot: string };
}
export interface AnonymosNetworkDiagnostics {
  capturedAt: string;
  tests: Array<{ target: string; sent: number; received: number; lost: number; lossPercent: number; averageMs: number | null; samples: number[] }>;
  adapters: Array<{ name: string; description: string; linkSpeed: string }>;
  dns: Array<{ interface: string; servers: string[] }>;
}
export interface AnonymosProcessInfo {
  pid: number;
  name: string;
  cpuSeconds: number | null;
  memoryBytes: number;
  responding: boolean;
}
declare global {
  interface Window {
    anonymosDesktop?: {
      getInfo: () => Promise<{ version: string; platform: string; isPackaged: boolean }>;
      minimize: () => Promise<boolean>;
      toggleMaximize: () => Promise<boolean>;
      close: () => Promise<boolean>;
      getSystemSnapshot: () => Promise<AnonymosSystemSnapshot>;
      getProcesses: () => Promise<AnonymosProcessInfo[]>;
      getNetworkDiagnostics: () => Promise<AnonymosNetworkDiagnostics>;
      pickAndLaunchGame: () => Promise<{ launched: boolean; executable?: string; reason?: string }>;
      getPowerPlan: () => Promise<{ activeId: string | null; activeName: string; options: Array<{ id: string; label: string }> }>;
      setPowerPlan: (plan: "balanced" | "high") => Promise<{ success: boolean; plan: string }>;
    };
  }
}
export {};

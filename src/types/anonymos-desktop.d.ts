export interface AnonymosSystemSnapshot {
  capturedAt: string;
  computer: string;
  manufacturer: string;
  model: string;
  cpu: { name: string; loadPercent: number | null; cores: number; logicalProcessors: number; maxClockMHz: number };
  memory: { totalBytes: number; freeBytes: number; usedBytes: number; usedPercent: number };
  gpu: Array<{ name: string; driverVersion: string; adapterRamBytes: number | null; loadPercent: number | null; temperatureC: number | null; memoryUsedBytes: number | null; memoryTotalBytes: number | null; telemetrySource: string | null }>;
  disks: Array<{ name: string; label: string | null; sizeBytes: number; freeBytes: number }>;
  os: { caption: string; version: string; build: string; lastBoot: string };
}
export interface AnonymosSpeedTestResult {
  provider: string;
  capturedAt: string;
  downloadMbps: number;
  uploadMbps: number;
  downloadBytes: number;
  uploadBytes: number;
  downloadDurationMs: number;
  uploadDurationMs: number;
}
export interface AnonymosNetworkDiagnostics {
  capturedAt: string;
  tests: Array<{ target: string; sent: number; received: number; lost: number; lossPercent: number; averageMs: number | null; samples: number[] }>;
  adapters: Array<{ name: string; description: string; linkSpeed: string }>;
  dns: Array<{ interface: string; servers: string[] }>;
}
export interface AnonymosCleanupReport {
  capturedAt: string;
  ageHours: number;
  categories: Array<{ id: "user-temp" | "windows-temp"; label: string; path: string; files: number; bytes: number }>;
  totalFiles: number;
  totalBytes: number;
  deletedFiles: number;
  deletedBytes: number;
  skippedFiles: number;
}
export interface AnonymosProcessInfo {
  pid: number;
  name: string;
  cpuSeconds: number | null;
  memoryBytes: number;
  responding: boolean;
  startTime: string | null;
  priorityBoosted: boolean;
}
export interface AnonymosBenchmarkResult {
  capturedAt: string;
  methodology: string;
  cpu: { durationMs: number; hashes: number; processedMiB: number; mebibytesPerSecond: number };
  memory: { durationMs: number; copies: number; copiedMiB: number; mebibytesPerSecond: number };
}
export interface AnonymosHistoryEntry {
  id: string;
  capturedAt: string;
  type: string;
  target: string;
  details: Record<string, unknown>;
}
export interface AnonymosDetectedGame { id: "fivem" | "gtav" | "fortnite" | "cs2" | "valorant" | "minecraft"; name: string; path: string; }
export interface AnonymosStartupEntry {
  id: string;
  name: string;
  command: string;
  source: "registry" | "folder";
  location: string;
}
export interface AnonymosStartupList {
  capturedAt: string;
  items: AnonymosStartupEntry[];
  disabled: Array<{ id: string; name: string; source: "registry" | "folder"; location: string }>;
}
declare global {
  interface Window {
    anonymosDesktop?: {
      getInfo: () => Promise<{ version: string; platform: string; isPackaged: boolean }>;
      getAutoLaunchSettings: () => Promise<{ available: boolean; enabled: boolean }>;
      setAutoLaunch: (enabled: boolean) => Promise<{ enabled: boolean }>;
      minimize: () => Promise<boolean>;
      toggleMaximize: () => Promise<boolean>;
      close: () => Promise<boolean>;
      getSystemSnapshot: () => Promise<AnonymosSystemSnapshot>;
      getProcesses: () => Promise<AnonymosProcessInfo[]>;
      terminateProcess: (request: { pid: number; name: string; startTime: string }) => Promise<{ success: boolean; pid: number; name: string }>;
      boostProcessPriority: (request: { pid: number; name: string; startTime: string }) => Promise<{ success: boolean; alreadyBoosted: boolean; originalPriority: string }>;
      restoreProcessPriority: (request: { pid: number; name: string; startTime: string }) => Promise<{ success: boolean; restored: string | null; processMissing: boolean; staleProcess: boolean }>;
      listStartupItems: () => Promise<AnonymosStartupList>;
      disableStartupItem: (id: string) => Promise<{ success: boolean; id: string; name: string }>;
      restoreStartupItem: (id: string) => Promise<{ success: boolean; id: string; name: string }>;
      getGameBoostStatus: () => Promise<{ active: boolean; label: string }>;
      startGameBoost: () => Promise<{ success: boolean; alreadyActive: boolean }>;
      stopGameBoost: () => Promise<{ success: boolean }>;
      listActionHistory: () => Promise<AnonymosHistoryEntry[]>;
      runBenchmark: () => Promise<AnonymosBenchmarkResult>;
      scanCleanup: (categories: Array<"user-temp" | "windows-temp">) => Promise<AnonymosCleanupReport>;
      runCleanup: (categories: Array<"user-temp" | "windows-temp">) => Promise<AnonymosCleanupReport>;
      getNetworkDiagnostics: () => Promise<AnonymosNetworkDiagnostics>;
      runSpeedTest: () => Promise<AnonymosSpeedTestResult>;
      pickAndLaunchGame: () => Promise<{ launched: boolean; executable?: string; reason?: string }>;
      listInstalledGames: () => Promise<{ capturedAt: string; games: AnonymosDetectedGame[] }>;
      launchDetectedGame: (id: AnonymosDetectedGame["id"]) => Promise<{ launched: boolean; name: string; executable: string }>;
      getPowerPlan: () => Promise<{ activeId: string | null; activeName: string; options: Array<{ id: string; label: string }> }>;
      setPowerPlan: (plan: "balanced" | "high") => Promise<{ success: boolean; plan: string }>;
    };
  }
}
export {};

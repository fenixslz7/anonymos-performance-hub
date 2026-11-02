const { contextBridge, ipcRenderer } = require("electron");

const desktopApi = Object.freeze({
  getInfo: () => ipcRenderer.invoke("desktop:app:info"),
  getSystemSnapshot: () => ipcRenderer.invoke("system:snapshot"),
  getProcesses: () => ipcRenderer.invoke("system:processes"),
  terminateProcess: (request) => ipcRenderer.invoke("system:terminate-process", request),
  listStartupItems: () => ipcRenderer.invoke("startup:list"),
  disableStartupItem: (id) => ipcRenderer.invoke("startup:disable", id),
  restoreStartupItem: (id) => ipcRenderer.invoke("startup:restore", id),
  getGameBoostStatus: () => ipcRenderer.invoke("games:boost-status"),
  startGameBoost: () => ipcRenderer.invoke("games:boost-start"),
  stopGameBoost: () => ipcRenderer.invoke("games:boost-stop"),
  listActionHistory: () => ipcRenderer.invoke("history:list"),
  scanCleanup: (categories) => ipcRenderer.invoke("cleanup:scan", categories),
  runCleanup: (categories) => ipcRenderer.invoke("cleanup:run", categories),
  getNetworkDiagnostics: () => ipcRenderer.invoke("network:diagnostics"),
  runSpeedTest: () => ipcRenderer.invoke("network:speed-test"),
  pickAndLaunchGame: () => ipcRenderer.invoke("games:pick-and-launch"),
  listInstalledGames: () => ipcRenderer.invoke("games:list-installed"),
  launchDetectedGame: (id) => ipcRenderer.invoke("games:launch-detected", id),
  getPowerPlan: () => ipcRenderer.invoke("power:get-plan"),
  setPowerPlan: (plan) => ipcRenderer.invoke("power:set-plan", plan),
  minimize: () => ipcRenderer.invoke("desktop:window:minimize"),
  toggleMaximize: () => ipcRenderer.invoke("desktop:window:toggle-maximize"),
  close: () => ipcRenderer.invoke("desktop:window:close"),
});

contextBridge.exposeInMainWorld("anonymosDesktop", desktopApi);

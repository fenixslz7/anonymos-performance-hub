const { contextBridge, ipcRenderer } = require("electron");

const desktopApi = Object.freeze({
  getInfo: () => ipcRenderer.invoke("desktop:app:info"),
  getSystemSnapshot: () => ipcRenderer.invoke("system:snapshot"),
  getProcesses: () => ipcRenderer.invoke("system:processes"),
  getNetworkDiagnostics: () => ipcRenderer.invoke("network:diagnostics"),
  pickAndLaunchGame: () => ipcRenderer.invoke("games:pick-and-launch"),
  getPowerPlan: () => ipcRenderer.invoke("power:get-plan"),
  setPowerPlan: (plan) => ipcRenderer.invoke("power:set-plan", plan),
  minimize: () => ipcRenderer.invoke("desktop:window:minimize"),
  toggleMaximize: () => ipcRenderer.invoke("desktop:window:toggle-maximize"),
  close: () => ipcRenderer.invoke("desktop:window:close"),
});

contextBridge.exposeInMainWorld("anonymosDesktop", desktopApi);

const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("node:child_process");
const { appendFile, mkdir } = require("node:fs/promises");
const { join } = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");

const DEV_URL = process.env.ANONYMOS_DEV_SERVER_URL;
const LOCAL_HOST = "127.0.0.1";
const LOCAL_PORT = "4317";
const LOCAL_URL = `http://${LOCAL_HOST}:${LOCAL_PORT}`;
const isDev = Boolean(DEV_URL);
let mainWindow;
let serverProcess;
let quitting = false;

function registerWindowIpc() {
  ipcMain.handle("desktop:window:minimize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return false;
    win.minimize();
    return true;
  });

  ipcMain.handle("desktop:window:toggle-maximize", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return false;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return win.isMaximized();
  });

  ipcMain.handle("desktop:window:close", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return false;
    win.close();
    return true;
  });

  ipcMain.handle("desktop:app:info", () => ({
    version: app.getVersion(),
    platform: process.platform,
    isPackaged: app.isPackaged,
  }));
}

async function startBundledServer() {
  const outputRoot = join(process.resourcesPath, "app-output");
  const entry = join(outputRoot, "server", "index.mjs");
  const logPath = join(app.getPath("logs"), "anonymos-server.log");
  await mkdir(app.getPath("logs"), { recursive: true });

  serverProcess = spawn(process.execPath, [entry], {
    cwd: outputRoot,
    windowsHide: true,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      HOST: LOCAL_HOST,
      HOSTNAME: LOCAL_HOST,
      PORT: LOCAL_PORT,
      NITRO_HOST: LOCAL_HOST,
      NITRO_PORT: LOCAL_PORT,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const writeLog = (chunk) => {
    void appendFile(logPath, chunk.toString()).catch(() => {});
  };
  serverProcess.stdout.on("data", writeLog);
  serverProcess.stderr.on("data", writeLog);
  serverProcess.once("error", (error) => {
    void appendFile(logPath, `\n[spawn error] ${error.message}\n`).catch(() => {});
  });
  serverProcess.once("exit", (code) => {
    if (!quitting && code !== 0) {
      void appendFile(logPath, `\n[server exit] code=${code}\n`).catch(() => {});
    }
  });

  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error("O servidor local encerrou antes de ficar disponível.");
    }
    try {
      const response = await fetch(LOCAL_URL, { signal: AbortSignal.timeout(1200) });
      if (response.ok || response.status < 500) return;
    } catch {
      // O servidor ainda está inicializando.
    }
    await delay(350);
  }
  throw new Error("Tempo limite ao iniciar o servidor local do ANONYMOS PERFORMANCE.");
}

function createMainWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    show: false,
    backgroundColor: "#08090d",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    const allowedOrigin = new URL(url).origin;
    let targetOrigin = "";
    try {
      targetOrigin = new URL(targetUrl).origin;
    } catch {
      event.preventDefault();
      return;
    }
    if (targetOrigin !== allowedOrigin) event.preventDefault();
  });
  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });
  void mainWindow.loadURL(url);
}

app.whenReady().then(async () => {
  registerWindowIpc();
  try {
    if (!isDev) await startBundledServer();
    createMainWindow(isDev ? DEV_URL : LOCAL_URL);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const { dialog } = require("electron");
    await dialog.showMessageBox({
      type: "error",
      title: "ANONYMOS PERFORMANCE",
      message: "Não foi possível iniciar o ambiente local do aplicativo.",
      detail: message,
    });
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && (isDev || serverProcess)) {
      createMainWindow(isDev ? DEV_URL : LOCAL_URL);
    }
  });
});

app.on("before-quit", () => {
  quitting = true;
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

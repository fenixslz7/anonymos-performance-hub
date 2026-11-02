const { app, BrowserWindow, ipcMain, dialog } = require("electron");
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


const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const execFileAsync = promisify(execFile);

async function runPowerShell(script) {
  if (process.platform !== "win32") throw new Error("A telemetria nativa está disponível somente no Windows.");
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script
  ], { windowsHide: true, timeout: 12000, maxBuffer: 2 * 1024 * 1024 });
  return JSON.parse(stdout.trim());
}

function registerSystemIpc() {
  ipcMain.handle("system:snapshot", async () => {
    const script = String.raw`
      $ErrorActionPreference = 'Stop'
      $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
      $os = Get-CimInstance Win32_OperatingSystem
      $cs = Get-CimInstance Win32_ComputerSystem
      $gpu = @(Get-CimInstance Win32_VideoController | ForEach-Object { [pscustomobject]@{ name=$_.Name; driverVersion=$_.DriverVersion; adapterRamBytes=$_.AdapterRAM } })
      $disks = @(Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object { [pscustomobject]@{ name=$_.DeviceID; label=$_.VolumeName; sizeBytes=[double]$_.Size; freeBytes=[double]$_.FreeSpace } })
      $memoryTotal = [double]$cs.TotalPhysicalMemory
      $memoryFree = [double]$os.FreePhysicalMemory * 1024
      $result = [pscustomobject]@{
        capturedAt = (Get-Date).ToString('o')
        computer = $cs.Name
        manufacturer = $cs.Manufacturer
        model = $cs.Model
        cpu = [pscustomobject]@{ name=$cpu.Name.Trim(); loadPercent=$cpu.LoadPercentage; cores=$cpu.NumberOfCores; logicalProcessors=$cpu.NumberOfLogicalProcessors; maxClockMHz=$cpu.MaxClockSpeed }
        memory = [pscustomobject]@{ totalBytes=$memoryTotal; freeBytes=$memoryFree; usedBytes=($memoryTotal-$memoryFree); usedPercent=[math]::Round((($memoryTotal-$memoryFree)/$memoryTotal)*100,1) }
        gpu = $gpu
        disks = $disks
        os = [pscustomobject]@{ caption=$os.Caption; version=$os.Version; build=$os.BuildNumber; lastBoot=(($os.LastBootUpTime).ToString('o')) }
      }
      $result | ConvertTo-Json -Depth 5 -Compress
    `;
    return runPowerShell(script);
  });

  ipcMain.handle("system:processes", async () => {
    const script = String.raw`
      $ErrorActionPreference = 'Stop'
      @(Get-Process | Sort-Object CPU -Descending | Select-Object -First 40 | ForEach-Object {
        [pscustomobject]@{ pid=$_.Id; name=$_.ProcessName; cpuSeconds=if ($_.CPU) {[math]::Round($_.CPU,1)} else {$null}; memoryBytes=[double]$_.WorkingSet64; responding=$_.Responding }
      }) | ConvertTo-Json -Depth 3 -Compress
    `;
    const result = await runPowerShell(script);
    return Array.isArray(result) ? result : result ? [result] : [];
  });
}


function registerGameIpc() {
  ipcMain.handle("games:pick-and-launch", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return { launched: false, reason: "Janela indisponível." };
    const choice = await dialog.showOpenDialog(win, {
      title: "Selecione o executável do jogo",
      properties: ["openFile"],
      filters: [{ name: "Aplicativos Windows", extensions: ["exe"] }],
    });
    if (choice.canceled || !choice.filePaths[0]) return { launched: false, reason: "Seleção cancelada." };
    const executable = choice.filePaths[0];
    const child = spawn(executable, [], { detached: true, stdio: "ignore", windowsHide: false });
    child.once("error", () => {});
    child.unref();
    return { launched: true, executable };
  });
}


const POWER_PLANS = Object.freeze({
  balanced: "381b4222-f694-41f0-9685-ff5bb260df2e",
  high: "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c",
});

function runPowerCfg(args) {
  return new Promise((resolve, reject) => {
    execFile("powercfg.exe", args, { windowsHide: true, timeout: 10000 }, (error, stdout, stderr) => {
      if (error) return reject(new Error((stderr || error.message).trim()));
      resolve(stdout);
    });
  });
}

function registerPowerIpc() {
  ipcMain.handle("power:get-plan", async () => {
    if (process.platform !== "win32") throw new Error("Recurso disponível somente no Windows.");
    const output = await runPowerCfg(["/getactivescheme"]);
    const match = output.match(/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/i);
    const activeId = match?.[0]?.toLowerCase() ?? null;
    return {
      activeId,
      activeName: activeId === POWER_PLANS.balanced ? "Equilibrado" : activeId === POWER_PLANS.high ? "Alto desempenho" : "Plano personalizado",
      options: [{ id: "balanced", label: "Equilibrado" }, { id: "high", label: "Alto desempenho" }],
    };
  });

  ipcMain.handle("power:set-plan", async (_event, plan) => {
    if (process.platform !== "win32") throw new Error("Recurso disponível somente no Windows.");
    if (plan !== "balanced" && plan !== "high") throw new Error("Plano de energia não permitido.");
    await runPowerCfg(["/setactive", POWER_PLANS[plan]]);
    return { success: true, plan };
  });
}

function registerNetworkIpc() {
  ipcMain.handle("network:diagnostics", async () => {
    if (process.platform !== "win32") throw new Error("Diagnóstico de rede disponível somente no Windows.");
    const script = String.raw`
      $ErrorActionPreference = 'Stop'
      $targets = @('1.1.1.1','8.8.8.8')
      $tests = @()
      foreach ($target in $targets) {
        $samples = @(Test-Connection -ComputerName $target -Count 4 -ErrorAction SilentlyContinue)
        $times = @($samples | ForEach-Object { [double]$_.ResponseTime })
        $received = $times.Count
        $average = if ($received -gt 0) { [math]::Round(($times | Measure-Object -Average).Average,1) } else { $null }
        $tests += [pscustomobject]@{ target=$target; sent=4; received=$received; lost=(4-$received); lossPercent=[math]::Round(((4-$received)/4)*100,0); averageMs=$average; samples=$times }
      }
      $adapters = @(Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object Status -eq 'Up' | Select-Object -First 8 | ForEach-Object { [pscustomobject]@{ name=$_.Name; description=$_.InterfaceDescription; linkSpeed=$_.LinkSpeed } })
      $dns = @(Get-DnsClientServerAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.ServerAddresses.Count -gt 0 } | ForEach-Object { [pscustomobject]@{ interface=$_.InterfaceAlias; servers=@($_.ServerAddresses) } })
      [pscustomobject]@{ capturedAt=(Get-Date).ToString('o'); tests=$tests; adapters=$adapters; dns=$dns } | ConvertTo-Json -Depth 6 -Compress
    `;
    return runPowerShell(script);
  });
}

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
  registerSystemIpc();
  registerGameIpc();
  registerPowerIpc();
  registerNetworkIpc();
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

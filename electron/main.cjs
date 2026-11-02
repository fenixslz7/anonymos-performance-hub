const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { spawn } = require("node:child_process");
const { Worker } = require("node:worker_threads");
const { appendFile, mkdir, readFile, writeFile, rename, stat, unlink } = require("node:fs/promises");
const { join, resolve, dirname, extname } = require("node:path");
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
      $gpu = @(Get-CimInstance Win32_VideoController | ForEach-Object { [pscustomobject]@{ name=$_.Name; driverVersion=$_.DriverVersion; adapterRamBytes=$_.AdapterRAM; loadPercent=$null; temperatureC=$null; memoryUsedBytes=$null; memoryTotalBytes=$null; telemetrySource=$null } })
      $gpuEngine = @()
      try {
        $gpuEngine = @(Get-CimInstance -ClassName Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction Stop | ForEach-Object {
          if ($_.Name -match 'phys_(\d+)_') {
            [pscustomobject]@{ adapterIndex=[int]$Matches[1]; loadPercent=[double]$_.UtilizationPercentage }
          }
        })
      } catch { $gpuEngine = @() }
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
        gpuEngine = $gpuEngine
        disks = $disks
        os = [pscustomobject]@{ caption=$os.Caption; version=$os.Version; build=$os.BuildNumber; lastBoot=(($os.LastBootUpTime).ToString('o')) }
      }
      $result | ConvertTo-Json -Depth 5 -Compress
    `;
    const snapshot = await runPowerShell(script);
    const engineSamples = Array.isArray(snapshot.gpuEngine) ? snapshot.gpuEngine : snapshot.gpuEngine ? [snapshot.gpuEngine] : [];
    const engineLoads = new Map();
    for (const sample of engineSamples) {
      const index = Number(sample.adapterIndex);
      const value = Number(sample.loadPercent);
      if (!Number.isInteger(index) || index < 0 || !Number.isFinite(value)) continue;
      const load = Math.max(0, Math.min(100, value));
      engineLoads.set(index, Math.max(engineLoads.get(index) ?? 0, load));
    }
    for (const [index, load] of engineLoads) {
      const adapter = snapshot.gpu[index];
      if (adapter && adapter.loadPercent == null) {
        adapter.loadPercent = Number(load.toFixed(1));
        adapter.telemetrySource = "Windows GPU Engine (motor mais ocupado)";
      }
    }
    delete snapshot.gpuEngine;
    try {
      let nvidiaOutput = "";
      const candidates = ["nvidia-smi.exe", join(process.env.WINDIR || "C:\\Windows", "System32", "nvidia-smi.exe"), "C:\\Program Files\\NVIDIA Corporation\\NVSMI\\nvidia-smi.exe"];
      for (const executable of candidates) {
        try {
          const result = await execFileAsync(executable, ["--query-gpu=index,name,utilization.gpu,temperature.gpu,memory.used,memory.total", "--format=csv,noheader,nounits"], { windowsHide: true, timeout: 6000, maxBuffer: 128 * 1024 });
          nvidiaOutput = result.stdout;
          if (nvidiaOutput.trim()) break;
        } catch { /* Tenta o próximo caminho conhecido do utilitário NVIDIA. */ }
      }
      const rows = nvidiaOutput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      for (const line of rows) {
        const columns = line.split(",").map((value) => value.trim());
        if (columns.length < 6) continue;
        const index = Number.parseInt(columns[0], 10);
        const name = columns[1];
        const match = snapshot.gpu.find((gpu) => gpu.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(gpu.name.toLowerCase())) || snapshot.gpu[index];
        if (!match) continue;
        const utilization = Number.parseFloat(columns[2]);
        const temperature = Number.parseFloat(columns[3]);
        const usedMiB = Number.parseFloat(columns[4]);
        const totalMiB = Number.parseFloat(columns[5]);
        match.loadPercent = Number.isFinite(utilization) ? utilization : null;
        match.temperatureC = Number.isFinite(temperature) ? temperature : null;
        match.memoryUsedBytes = Number.isFinite(usedMiB) ? usedMiB * 1024 * 1024 : null;
        match.memoryTotalBytes = Number.isFinite(totalMiB) ? totalMiB * 1024 * 1024 : null;
        match.telemetrySource = "NVIDIA SMI";
      }
    } catch { /* GPU telemetry is optional; keep explicit null values when the driver API is unavailable. */ }
    return snapshot;
  });

  ipcMain.handle("system:processes", async () => {
    const script = String.raw`
      $ErrorActionPreference = 'Stop'
      @(Get-Process | Sort-Object CPU -Descending | Select-Object -First 40 | ForEach-Object {
        [pscustomobject]@{ pid=$_.Id; name=$_.ProcessName; cpuSeconds=if ($_.CPU) {[math]::Round($_.CPU,1)} else {$null}; memoryBytes=[double]$_.WorkingSet64; responding=$_.Responding; startTime=$(try {$_.StartTime.ToUniversalTime().ToString('o')} catch {$null}) }
      }) | ConvertTo-Json -Depth 3 -Compress
    `;
    const result = await runPowerShell(script);
    const list = Array.isArray(result) ? result : result ? [result] : [];
    const backups = await readJsonFile(processPriorityBackupFile(), {});
    return list.map((item) => ({ ...item, priorityBoosted: Boolean(backups[String(item.pid) + ":" + item.startTime]) }));
  });
}



async function detectInstalledGames() {
  if (process.platform !== "win32") throw new Error("Detecção de jogos disponível somente no Windows.");
  const script = [
    "$ErrorActionPreference = 'SilentlyContinue'",
    "$found = New-Object System.Collections.Generic.List[object]",
    "function Add-Game($id,$name,$path) { if ($path -and (Test-Path -LiteralPath $path -PathType Leaf) -and -not ($found | Where-Object id -eq $id)) { $found.Add([pscustomobject]@{ id=$id; name=$name; path=[System.IO.Path]::GetFullPath($path) }) } }",
    "$steamRoots = @()",
    "if ($env:ProgramFiles) { $steamRoots += (Join-Path $env:ProgramFiles 'Steam') }",
    "$pf86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')",
    "if ($pf86) { $steamRoots += (Join-Path $pf86 'Steam') }",
    "if ($env:LOCALAPPDATA) { $steamRoots += (Join-Path $env:LOCALAPPDATA 'Steam') }",
    "$steamRegistry = Get-ItemProperty -Path 'HKCU:\\Software\\Valve\\Steam' -Name SteamPath -ErrorAction SilentlyContinue; if ($steamRegistry.SteamPath) { $steamRoots += [Environment]::ExpandEnvironmentVariables([string]$steamRegistry.SteamPath) }",
    "$libraries = New-Object System.Collections.Generic.List[string]",
    "foreach ($root in $steamRoots) { if (Test-Path -LiteralPath $root) { $libraries.Add($root) }; $vdf = Join-Path $root 'steamapps\\libraryfolders.vdf'; if (Test-Path -LiteralPath $vdf) { $text = Get-Content -LiteralPath $vdf -Raw; foreach ($match in [regex]::Matches($text, '\"path\"\\s+\"([^\"]+)\"')) { $candidate = $match.Groups[1].Value.Replace('\\\\','\\'); if (Test-Path -LiteralPath $candidate) { $libraries.Add($candidate) } } } }",
    "foreach ($library in ($libraries | Select-Object -Unique)) {",
    "  Add-Game 'cs2' 'Counter-Strike 2' (Join-Path $library 'steamapps\\common\\Counter-Strike Global Offensive\\game\\bin\\win64\\cs2.exe')",
    "  Add-Game 'gtav' 'GTA V' (Join-Path $library 'steamapps\\common\\Grand Theft Auto V\\GTA5.exe')",
    "}",
    "if ($env:LOCALAPPDATA) { Add-Game 'fivem' 'FiveM' (Join-Path $env:LOCALAPPDATA 'FiveM\\FiveM.exe'); Add-Game 'fivem' 'FiveM' (Join-Path $env:LOCALAPPDATA 'FiveM\\FiveM.app\\FiveM.exe') }",
    "$fortnitePaths = @()",
    "if ($env:ProgramFiles) { $fortnitePaths += (Join-Path $env:ProgramFiles 'Epic Games\\Fortnite\\FortniteGame\\Binaries\\Win64\\FortniteClient-Win64-Shipping.exe') }",
    "if ($pf86) { $fortnitePaths += (Join-Path $pf86 'Epic Games\\Fortnite\\FortniteGame\\Binaries\\Win64\\FortniteClient-Win64-Shipping.exe') }",
    "if ($env:ProgramData) { $manifestDir = Join-Path $env:ProgramData 'Epic\\EpicGamesLauncher\\Data\\Manifests'; if (Test-Path -LiteralPath $manifestDir) { Get-ChildItem -LiteralPath $manifestDir -Filter '*.item' -File -ErrorAction SilentlyContinue | ForEach-Object { try { $manifest = Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json; if (($manifest.AppName -match 'Fortnite') -or ($manifest.DisplayName -match 'Fortnite')) { $fortnitePaths += (Join-Path $manifest.InstallLocation 'FortniteGame\\Binaries\\Win64\\FortniteClient-Win64-Shipping.exe') } } catch {} } } }",
    "foreach ($path in $fortnitePaths) { Add-Game 'fortnite' 'Fortnite' $path }",
    "$valorantPaths = @('C:\\Riot Games\\VALORANT\\live\\VALORANT.exe')",
    "if ($env:ProgramFiles) { $valorantPaths += (Join-Path $env:ProgramFiles 'Riot Games\\VALORANT\\live\\VALORANT.exe') }",
    "foreach ($path in $valorantPaths) { Add-Game 'valorant' 'Valorant' $path }",
    "$minecraftLauncherPaths = @()",
    "if ($pf86) { $minecraftLauncherPaths += (Join-Path $pf86 'Minecraft Launcher\\MinecraftLauncher.exe') }",
    "if ($env:ProgramFiles) { $minecraftLauncherPaths += (Join-Path $env:ProgramFiles 'Minecraft Launcher\\MinecraftLauncher.exe') }",
    "if ($env:LOCALAPPDATA) { $minecraftLauncherPaths += (Join-Path $env:LOCALAPPDATA 'Programs\\Minecraft Launcher\\MinecraftLauncher.exe') }",
    "foreach ($path in $minecraftLauncherPaths) { Add-Game 'minecraft' 'Minecraft' $path }",
    "[pscustomobject]@{ capturedAt=(Get-Date).ToString('o'); games=@($found.ToArray()) } | ConvertTo-Json -Depth 4 -Compress"
  ].join("\n");
  const result = await runPowerShell(script);
  const list = result && result.games;
  return { capturedAt: result && result.capturedAt ? result.capturedAt : new Date().toISOString(), games: Array.isArray(list) ? list : list ? [list] : [] };
}

function registerGameIpc() {
  ipcMain.handle("games:list-installed", async () => detectInstalledGames());
  ipcMain.handle("games:launch-detected", async (_event, id) => {
    const allowedIds = new Set(["fivem", "gtav", "fortnite", "cs2", "valorant", "minecraft"]);
    if (typeof id !== "string" || !allowedIds.has(id)) throw new Error("Jogo não permitido.");
    const result = await detectInstalledGames();
    const game = result.games.find((entry) => entry.id === id);
    if (!game || typeof game.path !== "string" || !game.path.toLowerCase().endsWith(".exe")) {
      throw new Error("O jogo não foi encontrado nos locais conhecidos. Use a seleção manual do executável.");
    }
    return new Promise((resolveLaunch, rejectLaunch) => {
      const child = spawn(game.path, [], { detached: true, stdio: "ignore", windowsHide: false });
      child.once("error", rejectLaunch);
      child.once("spawn", () => {
        child.unref();
        void recordAction("Jogo iniciado", game.name, { executable: game.path });
        resolveLaunch({ launched: true, name: game.name, executable: game.path });
      });
    });
  });
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
    if (extname(executable).toLowerCase() !== ".exe") throw new Error("Selecione um arquivo .exe válido.");
    return new Promise((resolveLaunch, rejectLaunch) => {
      const child = spawn(executable, [], { detached: true, stdio: "ignore", windowsHide: false });
      child.once("error", rejectLaunch);
      child.once("spawn", () => {
        child.unref();
        void recordAction("Executável iniciado", executable.split(/[\\\\/]/).pop(), { executable: executable });
        resolveLaunch({ launched: true, executable });
      });
    });
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


function registerCleanupIpc() {
  const runCleanup = async (requestedCategories, mode) => {
    if (process.platform !== "win32") throw new Error("Limpeza disponível somente no aplicativo Windows.");
    if (!Array.isArray(requestedCategories) || requestedCategories.length < 1 || requestedCategories.length > 2) throw new Error("Selecione ao menos uma categoria válida.");
    const allowed = new Set(["user-temp", "windows-temp"]);
    const categories = [...new Set(requestedCategories)];
    if (categories.some((category) => !allowed.has(category))) throw new Error("Categoria de limpeza não permitida.");
    const encoded = Buffer.from(JSON.stringify(categories), "utf8").toString("base64");
    const script = [
      "$ErrorActionPreference = 'SilentlyContinue'",
      "$requested = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('" + encoded + "')) | ConvertFrom-Json",
      "$cutoff = (Get-Date).AddHours(-24)",
      "$roots = @()",
      "if ($requested -contains 'user-temp') { $candidate = [System.IO.Path]::GetFullPath($env:TEMP); $profile = [System.IO.Path]::GetFullPath($env:USERPROFILE); if ($candidate.StartsWith($profile, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $candidate -PathType Container)) { $roots += [pscustomobject]@{ id='user-temp'; label='Temporários do usuário'; path=$candidate } } }",
      "if ($requested -contains 'windows-temp') { $candidate = [System.IO.Path]::GetFullPath((Join-Path $env:WINDIR 'Temp')); $windows = [System.IO.Path]::GetFullPath($env:WINDIR); if ($candidate.StartsWith($windows, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $candidate -PathType Container)) { $roots += [pscustomobject]@{ id='windows-temp'; label='Temporários do Windows'; path=$candidate } } }",
      "$results = @(); $totalFiles = 0; $totalBytes = [int64]0; $deletedFiles = 0; $deletedBytes = [int64]0; $skippedFiles = 0",
      "foreach ($root in $roots) {",
      "  $files = @(Get-ChildItem -LiteralPath $root.path -File -Force -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $cutoff -and -not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) } | Select-Object -First 20000)",
      "  $rootBytes = [int64]0",
      "  foreach ($file in $files) { $rootBytes += [int64]$file.Length; if ('" + mode + "' -eq 'delete') { try { Remove-Item -LiteralPath $file.FullName -Force -ErrorAction Stop; $deletedFiles++; $deletedBytes += [int64]$file.Length } catch { $skippedFiles++ } } }",
      "  $totalFiles += $files.Count; $totalBytes += $rootBytes; $results += [pscustomobject]@{ id=$root.id; label=$root.label; path=$root.path; files=$files.Count; bytes=$rootBytes }",
      "}",
      "[pscustomobject]@{ capturedAt=(Get-Date).ToString('o'); ageHours=24; categories=@($results); totalFiles=$totalFiles; totalBytes=$totalBytes; deletedFiles=$deletedFiles; deletedBytes=$deletedBytes; skippedFiles=$skippedFiles } | ConvertTo-Json -Depth 5 -Compress"
    ].join("\n");
    return runPowerShell(script);
  };
  ipcMain.handle("cleanup:scan", async (_event, categories) => runCleanup(categories, "scan"));
  ipcMain.handle("cleanup:run", async (_event, categories) => { const report = await runCleanup(categories, "delete"); await recordAction("Limpeza executada", "Arquivos temporários", { deletedFiles: report.deletedFiles, deletedBytes: report.deletedBytes, skippedFiles: report.skippedFiles }); return report; });
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
    await recordAction("Plano de energia alterado", plan === "high" ? "Alto desempenho" : "Equilibrado", {});
    return { success: true, plan };
  });
}


function readJsonFile(path, fallback) {
  return readFile(path, "utf8").then((raw) => JSON.parse(raw)).catch((error) => {
    if (error && error.code === "ENOENT") return fallback;
    throw error;
  });
}
async function writeJsonFile(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = path + ".tmp";
  await writeFile(temporary, JSON.stringify(value, null, 2), "utf8");
  await rename(temporary, path);
}

function actionHistoryFile() { return join(app.getPath("userData"), "action-history.json"); }
async function recordAction(type, target, details) {
  try {
    const history = await readJsonFile(actionHistoryFile(), []);
    history.unshift({
      id: require("node:crypto").randomUUID(),
      capturedAt: new Date().toISOString(),
      type: String(type),
      target: String(target || ""),
      details: details || {},
    });
    await writeJsonFile(actionHistoryFile(), history.slice(0, 250));
  } catch {
    // O histórico é complementar; uma falha de gravação não desfaz a ação já concluída.
  }
}
function registerBenchmarkIpc() {
  ipcMain.handle("benchmark:run", async () => {
    const worker = new Worker(join(__dirname, "benchmark-worker.cjs"));
    return new Promise((resolveBenchmark, rejectBenchmark) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        void worker.terminate();
        rejectBenchmark(new Error("O benchmark excedeu o tempo limite e foi interrompido."));
      }, 15000);
      const finish = () => clearTimeout(timeout);
      worker.once("message", async (result) => {
        if (settled) return;
        settled = true;
        finish();
        if (result && result.error) {
          rejectBenchmark(new Error(result.error));
          return;
        }
        await recordAction("Benchmark CPU/RAM concluído", "Benchmark local", {
          cpuMiBPerSecond: result.cpu.mebibytesPerSecond,
          memoryMiBPerSecond: result.memory.mebibytesPerSecond,
        });
        resolveBenchmark(result);
      });
      worker.once("error", (error) => {
        if (settled) return;
        settled = true;
        finish();
        rejectBenchmark(error);
      });
      worker.once("exit", (code) => {
        if (settled || code === 0) return;
        settled = true;
        finish();
        rejectBenchmark(new Error("O processo de benchmark terminou inesperadamente."));
      });
    });
  });
}

function registerHistoryIpc() {
  ipcMain.handle("history:list", async () => readJsonFile(actionHistoryFile(), []));
}

function startupBackupFile() { return join(app.getPath("userData"), "startup-backups.json"); }
function startupBackupDirectory() { return join(app.getPath("userData"), "startup-disabled"); }
function getUserStartupDirectory() {
  if (process.platform !== "win32" || !process.env.APPDATA) throw new Error("Pasta Inicializar indisponível.");
  return resolve(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs", "Startup");
}
async function queryStartupItems() {
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "$items = New-Object System.Collections.Generic.List[object]",
    "$runPath = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'",
    "if (Test-Path -LiteralPath $runPath) {",
    "  $props = Get-ItemProperty -LiteralPath $runPath",
    "  foreach ($prop in $props.PSObject.Properties) {",
    "    if ($prop.Name -like 'PS*') { continue }",
    "    $command = [string]$prop.Value",
    "    $key = 'registry|' + $prop.Name + '|' + $command",
    "    $sha = [System.Security.Cryptography.SHA256]::Create()",
    "    $id = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($key))).Replace('-','').ToLowerInvariant()",
    "    $items.Add([pscustomobject]@{ id=$id; name=$prop.Name; command=$command; source='registry'; location='Registro do usuário' })",
    "  }",
    "}",
    "$startup = [Environment]::GetFolderPath('Startup')",
    "if (Test-Path -LiteralPath $startup) {",
    "  Get-ChildItem -LiteralPath $startup -File -Force -ErrorAction SilentlyContinue | Where-Object { @('.lnk','.url','.exe','.bat','.cmd') -contains $_.Extension.ToLowerInvariant() } | ForEach-Object {",
    "    $key = 'folder|' + $_.Name + '|' + $_.FullName",
    "    $sha = [System.Security.Cryptography.SHA256]::Create()",
    "    $id = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($key))).Replace('-','').ToLowerInvariant()",
    "    $items.Add([pscustomobject]@{ id=$id; name=$_.BaseName; command=$_.Name; source='folder'; location='Pasta Inicializar' })",
    "  }",
    "}",
    "[pscustomobject]@{ capturedAt=(Get-Date).ToString('o'); items=@($items.ToArray()) } | ConvertTo-Json -Depth 5 -Compress"
  ].join("\n");
  const result = await runPowerShell(script);
  const rawItems = result && result.items;
  return { capturedAt: result && result.capturedAt ? result.capturedAt : new Date().toISOString(), items: Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [] };
}
function registerStartupIpc() {
  ipcMain.handle("startup:list", async () => {
    if (process.platform !== "win32") throw new Error("Gerenciador de inicialização disponível somente no Windows.");
    const results = await Promise.all([queryStartupItems(), readJsonFile(startupBackupFile(), {})]);
    return {
      capturedAt: results[0].capturedAt,
      items: results[0].items,
      disabled: Object.values(results[1]).map((entry) => ({ id: entry.id, name: entry.name, source: entry.source, location: entry.location })),
    };
  });
  ipcMain.handle("startup:disable", async (_event, id) => {
    if (process.platform !== "win32") throw new Error("Recurso disponível somente no Windows.");
    if (typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)) throw new Error("Entrada de inicialização inválida.");
    const scan = await queryStartupItems();
    const item = scan.items.find((entry) => entry.id === id);
    if (!item) throw new Error("A entrada mudou ou não existe mais. Atualize a lista.");
    const backups = await readJsonFile(startupBackupFile(), {});
    if (backups[id]) throw new Error("Esta entrada já possui um backup no ANONYMOS.");
    const entry = { id, name: String(item.name), source: item.source, location: item.location, command: String(item.command) };

    if (item.source === "folder") {
      const startup = getUserStartupDirectory();
      const original = resolve(startup, String(item.command));
      if (dirname(original).toLowerCase() !== startup.toLowerCase() || ![".lnk", ".url", ".exe", ".bat", ".cmd"].includes(extname(original).toLowerCase())) {
        throw new Error("Caminho da entrada fora da pasta Inicializar permitida.");
      }
      entry.originalPath = original;
      entry.backupPath = join(startupBackupDirectory(), id + extname(original).toLowerCase());
    } else if (item.source !== "registry") {
      throw new Error("Tipo de entrada não permitido.");
    }

    // Persist the recovery data BEFORE touching Run or the Startup folder.
    backups[id] = entry;
    await writeJsonFile(startupBackupFile(), backups);

    try {
      if (item.source === "registry") {
        const name64 = Buffer.from(String(item.name), "utf8").toString("base64");
        const command64 = Buffer.from(String(item.command), "utf8").toString("base64");
        const script = [
          "$ErrorActionPreference = 'Stop'",
          "$name = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + name64 + "'))",
          "$command = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + command64 + "'))",
          "$path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'",
          "$current = (Get-ItemProperty -LiteralPath $path -Name $name -ErrorAction Stop).$name",
          "if ([string]$current -cne $command) { throw 'O comando de inicialização mudou. Atualize a lista.' }",
          "Remove-ItemProperty -LiteralPath $path -Name $name -ErrorAction Stop",
          "@{ success=$true } | ConvertTo-Json -Compress"
        ].join("\n");
        await runPowerShell(script);
      } else {
        await mkdir(startupBackupDirectory(), { recursive: true });
        try { await stat(entry.originalPath); } catch { throw new Error("O atalho de inicialização não existe mais."); }
        await rename(entry.originalPath, entry.backupPath);
      }
    } catch (error) {
      delete backups[id];
      await writeJsonFile(startupBackupFile(), backups).catch(() => {});
      throw error;
    }

    await recordAction("Inicialização desativada", entry.name, { source: entry.source, location: entry.location });
    return { success: true, id, name: entry.name };
  });

  ipcMain.handle("startup:restore", async (_event, id) => {
    if (process.platform !== "win32") throw new Error("Recurso disponível somente no Windows.");
    if (typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)) throw new Error("Entrada inválida.");
    const backups = await readJsonFile(startupBackupFile(), {});
    const entry = backups[id];
    if (!entry) throw new Error("Backup de inicialização não encontrado.");

    if (entry.source === "registry") {
      const name64 = Buffer.from(String(entry.name), "utf8").toString("base64");
      const command64 = Buffer.from(String(entry.command), "utf8").toString("base64");
      const script = [
        "$ErrorActionPreference = 'Stop'",
        "$name = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + name64 + "'))",
        "$command = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + command64 + "'))",
        "$path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'",
        "$existing = Get-ItemProperty -LiteralPath $path -Name $name -ErrorAction SilentlyContinue",
        "$hasValue = $false",
        "if ($null -ne $existing) { $hasValue = $existing.PSObject.Properties.Name -contains $name }",
        "if ($hasValue) {",
        "  $current = [string]$existing.$name",
        "  if ($current -ceq $command) { @{ success=$true; alreadyRestored=$true } | ConvertTo-Json -Compress; exit }",
        "  throw 'Já existe uma entrada com este nome e um comando diferente. Nada foi sobrescrito.'",
        "}",
        "New-ItemProperty -LiteralPath $path -Name $name -Value $command -PropertyType String -ErrorAction Stop | Out-Null",
        "@{ success=$true; alreadyRestored=$false } | ConvertTo-Json -Compress"
      ].join("\n");
      await runPowerShell(script);
    } else if (entry.source === "folder") {
      const startup = getUserStartupDirectory();
      const original = resolve(String(entry.originalPath || ""));
      const backupPath = resolve(String(entry.backupPath || ""));
      if (dirname(original).toLowerCase() !== startup.toLowerCase() || dirname(backupPath).toLowerCase() !== resolve(startupBackupDirectory()).toLowerCase()) {
        throw new Error("Backup fora das pastas permitidas.");
      }

      let backupExists = true;
      try { await stat(backupPath); } catch (error) {
        if (error && error.code === "ENOENT") backupExists = false;
        else throw error;
      }
      if (backupExists) {
        try {
          await stat(original);
          throw new Error("Já existe um arquivo com este nome na pasta Inicializar. Renomeie-o antes de restaurar.");
        } catch (error) {
          if (error && error.code !== "ENOENT") throw error;
        }
        await rename(backupPath, original);
      } else {
        // A crash may have occurred after the backup record was persisted but before the move.
        try { await stat(original); } catch { throw new Error("O backup e o arquivo original não foram encontrados. Nada foi removido do registro."); }
      }
    } else {
      throw new Error("Tipo de backup não reconhecido.");
    }

    delete backups[id];
    await writeJsonFile(startupBackupFile(), backups);
    await recordAction("Inicialização restaurada", entry.name, { source: entry.source, location: entry.location });
    return { success: true, id, name: entry.name };
  });

}
const PROTECTED_PROCESS_NAMES = new Set([
  "system", "idle", "registry", "smss", "csrss", "wininit", "services", "lsass",
  "svchost", "winlogon", "dwm", "fontdrvhost", "secure system", "memory compression",
  "electron", "node", "anonymos performance"
]);

function processPriorityBackupFile() { return join(app.getPath("userData"), "process-priority-backups.json"); }
const BOOSTABLE_GAME_PROCESSES = new Set([
  "fivem", "gta5", "gta5_enhanced", "fortniteclient-win64-shipping",
  "cs2", "valorant-win64-shipping", "valorant",
]);
function registerProcessPriorityIpc() {
  ipcMain.handle("system:boost-process-priority", async (_event, request) => {
    if (process.platform !== "win32") throw new Error("Prioridade de processos disponível somente no Windows.");
    if (!request || !Number.isSafeInteger(request.pid) || request.pid < 1 ||
        typeof request.name !== "string" || !/^[a-zA-Z0-9_. -]{1,128}$/.test(request.name) ||
        typeof request.startTime !== "string" || Number.isNaN(Date.parse(request.startTime))) {
      throw new Error("Identificação do jogo inválida. Atualize o Monitor.");
    }
    if (!BOOSTABLE_GAME_PROCESSES.has(request.name.toLowerCase())) throw new Error("Somente processos de jogos conhecidos podem ter prioridade alterada.");
    const key = String(request.pid) + ":" + request.startTime;
    const backups = await readJsonFile(processPriorityBackupFile(), {});
    if (backups[key]) return { success: true, alreadyBoosted: true, originalPriority: backups[key].originalPriority };

    const pid = String(request.pid);
    const name64 = Buffer.from(request.name, "utf8").toString("base64");
    const start64 = Buffer.from(request.startTime, "utf8").toString("base64");
    const inspect = [
      "$ErrorActionPreference = 'Stop'",
      "$target = Get-Process -Id " + pid + " -ErrorAction Stop",
      "$expectedName = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + name64 + "'))",
      "$expectedStart = [DateTime]::Parse([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + start64 + "'))).ToUniversalTime()",
      "if ($target.ProcessName -ine $expectedName) { throw 'O processo mudou. Atualize a lista.' }",
      "if ([math]::Abs(($target.StartTime.ToUniversalTime() - $expectedStart).TotalSeconds) -gt 2) { throw 'O PID foi reutilizado. Atualize a lista.' }",
      "[pscustomobject]@{ priority=$target.PriorityClass.ToString(); name=$target.ProcessName; startTime=$target.StartTime.ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress"
    ].join("\n");
    const original = await runPowerShell(inspect);
    const backup = { pid: request.pid, name: request.name, startTime: request.startTime, originalPriority: original.priority, boostedAt: new Date().toISOString() };
    backups[key] = backup;
    await writeJsonFile(processPriorityBackupFile(), backups);

    try {
      const setPriority = [
        "$ErrorActionPreference = 'Stop'",
        "$target = Get-Process -Id " + pid + " -ErrorAction Stop",
        "$expectedName = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + name64 + "'))",
        "$expectedStart = [DateTime]::Parse([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + start64 + "'))).ToUniversalTime()",
        "if ($target.ProcessName -ine $expectedName) { throw 'O processo mudou. Atualize a lista.' }",
        "if ([math]::Abs(($target.StartTime.ToUniversalTime() - $expectedStart).TotalSeconds) -gt 2) { throw 'O PID foi reutilizado. Atualize a lista.' }",
        "$target.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::AboveNormal",
        "@{ success=$true } | ConvertTo-Json -Compress"
      ].join("\n");
      await runPowerShell(setPriority);
    } catch (error) {
      delete backups[key];
      await writeJsonFile(processPriorityBackupFile(), backups).catch(() => {});
      throw error;
    }
    await recordAction("Prioridade de jogo elevada", request.name, { pid: request.pid, previousPriority: original.priority, currentPriority: "AboveNormal" });
    return { success: true, alreadyBoosted: false, originalPriority: original.priority };
  });

  ipcMain.handle("system:restore-process-priority", async (_event, request) => {
    if (process.platform !== "win32") throw new Error("Restauração de prioridade disponível somente no Windows.");
    if (!request || !Number.isSafeInteger(request.pid) || request.pid < 1 ||
        typeof request.name !== "string" || typeof request.startTime !== "string") {
      throw new Error("Identificação do processo inválida.");
    }
    const key = String(request.pid) + ":" + request.startTime;
    const backups = await readJsonFile(processPriorityBackupFile(), {});
    const backup = backups[key];
    if (!backup) throw new Error("Não existe backup de prioridade para este processo.");
    const pid = String(backup.pid);
    const name64 = Buffer.from(String(backup.name), "utf8").toString("base64");
    const start64 = Buffer.from(String(backup.startTime), "utf8").toString("base64");
    const priority64 = Buffer.from(String(backup.originalPriority), "utf8").toString("base64");
    const script = [
      "$ErrorActionPreference = 'Stop'",
      "$target = Get-Process -Id " + pid + " -ErrorAction SilentlyContinue",
      "if ($null -eq $target) { @{ success=$true; processMissing=$true } | ConvertTo-Json -Compress; exit }",
      "$expectedName = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + name64 + "'))",
      "$expectedStart = [DateTime]::Parse([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + start64 + "'))).ToUniversalTime()",
      "$priority = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + priority64 + "'))",
      "if ($target.ProcessName -ine $expectedName -or [math]::Abs(($target.StartTime.ToUniversalTime() - $expectedStart).TotalSeconds) -gt 2) { @{ success=$true; staleProcess=$true } | ConvertTo-Json -Compress; exit }",
      "$target.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::$priority",
      "@{ success=$true; restored=$priority } | ConvertTo-Json -Compress"
    ].join("\n");
    const result = await runPowerShell(script);
    delete backups[key];
    await writeJsonFile(processPriorityBackupFile(), backups);
    await recordAction("Prioridade original restaurada", backup.name, { pid: backup.pid, originalPriority: backup.originalPriority, processMissing: Boolean(result.processMissing), staleProcess: Boolean(result.staleProcess) });
    return { success: true, restored: result.restored || null, processMissing: Boolean(result.processMissing), staleProcess: Boolean(result.staleProcess) };
  });
}

function registerProcessControlIpc() {
  ipcMain.handle("system:terminate-process", async (_event, request) => {
    if (process.platform !== "win32") throw new Error("Controle de processos disponível somente no Windows.");
    if (!request || !Number.isSafeInteger(request.pid) || request.pid < 1 ||
        typeof request.name !== "string" || !/^[a-zA-Z0-9_. -]{1,128}$/.test(request.name) ||
        typeof request.startTime !== "string" || Number.isNaN(Date.parse(request.startTime))) {
      throw new Error("Identificação de processo inválida. Atualize a lista.");
    }
    if (PROTECTED_PROCESS_NAMES.has(request.name.toLowerCase())) throw new Error("Este processo é protegido pelo ANONYMOS.");
    const name64 = Buffer.from(request.name, "utf8").toString("base64");
    const start64 = Buffer.from(request.startTime, "utf8").toString("base64");
    const script = [
      "$ErrorActionPreference = 'Stop'",
      "$targetId = " + String(request.pid),
      "$expectedName = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + name64 + "'))",
      "$expectedStart = [DateTime]::Parse([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" + start64 + "'))).ToUniversalTime()",
      "$protected = @('system','idle','registry','smss','csrss','wininit','services','lsass','svchost','winlogon','dwm','fontdrvhost','secure system','memory compression','electron','node','anonymos performance')",
      "if ($protected -contains $expectedName.ToLowerInvariant()) { throw 'Este processo é protegido.' }",
      "$target = Get-Process -Id $targetId -ErrorAction Stop",
      "if ($target.ProcessName -cne $expectedName) { throw 'O processo mudou. Atualize a lista.' }",
      "if ([math]::Abs(($target.StartTime.ToUniversalTime() - $expectedStart).TotalSeconds) -gt 2) { throw 'O PID foi reutilizado. Atualize a lista.' }",
      "Stop-Process -Id $targetId -ErrorAction Stop",
      "@{ success=$true; pid=$targetId; name=$expectedName } | ConvertTo-Json -Compress"
    ].join("\n");
    await runPowerShell(script);
    await recordAction("Processo encerrado", request.name, { pid: request.pid });
    return { success: true, pid: request.pid, name: request.name };
  });
}
function gameBoostStateFile() { return join(app.getPath("userData"), "game-boost-session.json"); }
async function restoreGameBoostSession() {
  const state = await readJsonFile(gameBoostStateFile(), null);
  if (!state || typeof state.originalScheme !== "string" || !/^[a-f0-9-]{36}$/i.test(state.originalScheme)) return false;
  try {
    await runPowerCfg(["/setactive", state.originalScheme]);
    if (state.createdScheme && typeof state.activeScheme === "string" && /^[a-f0-9-]{36}$/i.test(state.activeScheme)) {
      await runPowerCfg(["/delete", state.activeScheme]);
    }
    await unlink(gameBoostStateFile()).catch(() => {});
    return true;
  } catch { return false; }
}
function registerGameBoostIpc() {
  ipcMain.handle("games:boost-status", async () => {
    const state = await readJsonFile(gameBoostStateFile(), null);
    return { active: Boolean(state && state.originalScheme), label: state ? "Modo de jogo ativo" : "Modo de jogo desativado" };
  });
  ipcMain.handle("games:boost-start", async () => {
    if (process.platform !== "win32") throw new Error("Modo de jogo disponível somente no Windows.");
    const existing = await readJsonFile(gameBoostStateFile(), null);
    if (existing && existing.originalScheme) return { success: true, alreadyActive: true };

    const output = await runPowerCfg(["/getactivescheme"]);
    const match = output.match(/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/i);
    const originalScheme = match && match[0].toLowerCase();
    if (!originalScheme) throw new Error("Não foi possível identificar o plano de energia atual.");
    if (originalScheme === POWER_PLANS.high) throw new Error("O plano Alto desempenho já está ativo.");

    // Save the recovery point BEFORE asking Windows to change the active scheme.
    let session = {
      originalScheme,
      activeScheme: POWER_PLANS.high,
      createdScheme: false,
      startedAt: new Date().toISOString(),
    };
    await writeJsonFile(gameBoostStateFile(), session);

    try {
      try {
        await runPowerCfg(["/setactive", POWER_PLANS.high]);
      } catch (highPlanError) {
        // SCHEME_MAX is the Windows High Performance alias (SCHEME_MIN is Power Saver).
        const duplicateOutput = await runPowerCfg(["/duplicatescheme", "SCHEME_MAX"]);
        const duplicateMatch = duplicateOutput.match(/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/i);
        if (!duplicateMatch) throw highPlanError;

        const temporaryScheme = duplicateMatch[0].toLowerCase();
        try {
          await runPowerCfg(["/changename", temporaryScheme, "ANONYMOS Game Mode", "Plano temporário restaurável criado pelo ANONYMOS PERFORMANCE."]);
          session = { ...session, activeScheme: temporaryScheme, createdScheme: true };
          // Save the exact temporary GUID before activating it.
          await writeJsonFile(gameBoostStateFile(), session);
          await runPowerCfg(["/setactive", temporaryScheme]);
        } catch (error) {
          await runPowerCfg(["/setactive", originalScheme]).catch(() => {});
          await runPowerCfg(["/delete", temporaryScheme]).catch(() => {});
          await unlink(gameBoostStateFile()).catch(() => {});
          throw error;
        }
      }
    } catch (error) {
      // Do not leave a stale recovery record if no plan change took effect.
      const currentOutput = await runPowerCfg(["/getactivescheme"]).catch(() => "");
      const currentMatch = currentOutput.match(/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/i);
      const currentScheme = currentMatch && currentMatch[0].toLowerCase();
      if (!currentScheme || currentScheme === originalScheme) {
        await unlink(gameBoostStateFile()).catch(() => {});
      } else if (currentScheme !== session.activeScheme) {
        await runPowerCfg(["/setactive", originalScheme]).catch(() => {});
        if (session.createdScheme) await runPowerCfg(["/delete", session.activeScheme]).catch(() => {});
        await unlink(gameBoostStateFile()).catch(() => {});
      }
      throw error;
    }

    await recordAction("Modo de Jogo ativado", "Plano de energia", { createdTemporaryPlan: session.createdScheme });
    return { success: true, alreadyActive: false };
  });
  ipcMain.handle("games:boost-stop", async () => {
    const restored = await restoreGameBoostSession();
    if (!restored) throw new Error("Não foi possível restaurar o plano anterior. Verifique os planos disponíveis no Windows.");
    await recordAction("Modo de Jogo desativado", "Plano de energia", {});
    return { success: true };
  });
}

function registerNetworkIpc() {

  ipcMain.handle("network:speed-test", async () => {
    if (process.platform !== "win32") throw new Error("Teste de velocidade disponível somente no aplicativo Windows.");
    const endpoint = "https://speed.cloudflare.com";
    const timeout = 45000;
    const startedAt = new Date().toISOString();
    const downloadBytesRequested = 8 * 1024 * 1024;
    const downloadStart = process.hrtime.bigint();
    const downloadResponse = await fetch(`${endpoint}/__down?bytes=${downloadBytesRequested}&cachebust=${Date.now()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeout),
      headers: { "Cache-Control": "no-cache" },
    });
    if (!downloadResponse.ok) throw new Error(`Servidor de teste recusou o download (HTTP ${downloadResponse.status}).`);
    const downloaded = await downloadResponse.arrayBuffer();
    const downloadSeconds = Number(process.hrtime.bigint() - downloadStart) / 1e9;
    const downloadMbps = downloaded.byteLength * 8 / downloadSeconds / 1e6;

    const uploadBytes = 3 * 1024 * 1024;
    const payload = Buffer.alloc(uploadBytes, 0x61);
    const uploadStart = process.hrtime.bigint();
    const uploadResponse = await fetch(`${endpoint}/__up?cachebust=${Date.now()}`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(timeout),
      headers: { "Content-Type": "application/octet-stream", "Cache-Control": "no-cache" },
      body: payload,
    });
    if (!uploadResponse.ok) throw new Error(`Servidor de teste recusou o upload (HTTP ${uploadResponse.status}).`);
    await uploadResponse.arrayBuffer();
    const uploadSeconds = Number(process.hrtime.bigint() - uploadStart) / 1e9;
    const uploadMbps = uploadBytes * 8 / uploadSeconds / 1e6;
    return {
      provider: "Cloudflare Speed Test",
      capturedAt: startedAt,
      downloadMbps: Number(downloadMbps.toFixed(2)),
      uploadMbps: Number(uploadMbps.toFixed(2)),
      downloadBytes: downloaded.byteLength,
      uploadBytes,
      downloadDurationMs: Math.round(downloadSeconds * 1000),
      uploadDurationMs: Math.round(uploadSeconds * 1000),
    };
  });
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
  registerProcessControlIpc();
  registerProcessPriorityIpc();
  registerStartupIpc();
  registerGameBoostIpc();
  registerHistoryIpc();
  registerBenchmarkIpc();
  registerGameIpc();
  registerCleanupIpc();
  registerPowerIpc();
  registerNetworkIpc();
  try {
    await restoreGameBoostSession();
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

let restoringBeforeQuit = false;
app.on("before-quit", (event) => {
  if (!restoringBeforeQuit) {
    event.preventDefault();
    restoringBeforeQuit = true;
    void restoreGameBoostSession().catch(() => false).finally(() => {
      quitting = true;
      if (serverProcess && !serverProcess.killed) serverProcess.kill();
      app.quit();
    });
    return;
  }
  quitting = true;
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

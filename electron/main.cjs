const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { spawn } = require("node:child_process");
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
        [pscustomobject]@{ pid=$_.Id; name=$_.ProcessName; cpuSeconds=if ($_.CPU) {[math]::Round($_.CPU,1)} else {$null}; memoryBytes=[double]$_.WorkingSet64; responding=$_.Responding; startTime=try {$_.StartTime.ToUniversalTime().ToString('o')} catch {$null} }
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
  ipcMain.handle("cleanup:run", async (_event, categories) => runCleanup(categories, "delete"));
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
    if (backups[id]) throw new Error("Esta entrada já está desativada pelo ANONYMOS.");
    const entry = { id: id, name: String(item.name), source: item.source, location: item.location };
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
      entry.command = String(item.command);
    } else if (item.source === "folder") {
      const startup = getUserStartupDirectory();
      const original = resolve(startup, String(item.command));
      if (dirname(original).toLowerCase() !== startup.toLowerCase() || ![".lnk", ".url", ".exe", ".bat", ".cmd"].includes(extname(original).toLowerCase())) {
        throw new Error("Caminho da entrada fora da pasta Inicializar permitida.");
      }
      const backupDirectory = startupBackupDirectory();
      await mkdir(backupDirectory, { recursive: true });
      const backupPath = join(backupDirectory, id + extname(original).toLowerCase());
      try { await stat(original); } catch { throw new Error("O atalho de inicialização não existe mais."); }
      await rename(original, backupPath);
      entry.originalPath = original;
      entry.backupPath = backupPath;
    } else {
      throw new Error("Tipo de entrada não permitido.");
    }
    backups[id] = entry;
    await writeJsonFile(startupBackupFile(), backups);
    return { success: true, id: id, name: entry.name };
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
        "if ((Get-ItemProperty -LiteralPath $path -ErrorAction SilentlyContinue).PSObject.Properties.Name -contains $name) { throw 'Já existe uma entrada com este nome. Nada foi sobrescrito.' }",
        "New-ItemProperty -LiteralPath $path -Name $name -Value $command -PropertyType String -ErrorAction Stop | Out-Null",
        "@{ success=$true } | ConvertTo-Json -Compress"
      ].join("\n");
      await runPowerShell(script);
    } else if (entry.source === "folder") {
      const startup = getUserStartupDirectory();
      const original = resolve(String(entry.originalPath || ""));
      const backupPath = resolve(String(entry.backupPath || ""));
      if (dirname(original).toLowerCase() !== startup.toLowerCase() || dirname(backupPath).toLowerCase() !== resolve(startupBackupDirectory()).toLowerCase()) {
        throw new Error("Backup fora das pastas permitidas.");
      }
      try {
        await stat(original);
        throw new Error("Já existe um arquivo com este nome na pasta Inicializar. Renomeie-o antes de restaurar.");
      } catch (error) {
        if (error && error.code !== "ENOENT") throw error;
      }
      await rename(backupPath, original);
    } else {
      throw new Error("Tipo de backup não reconhecido.");
    }
    delete backups[id];
    await writeJsonFile(startupBackupFile(), backups);
    return { success: true, id: id, name: entry.name };
  });
}
const PROTECTED_PROCESS_NAMES = new Set([
  "system", "idle", "registry", "smss", "csrss", "wininit", "services", "lsass",
  "svchost", "winlogon", "dwm", "fontdrvhost", "secure system", "memory compression",
  "electron", "node", "anonymos performance"
]);
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
    return { success: true, pid: request.pid, name: request.name };
  });
}
function gameBoostStateFile() { return join(app.getPath("userData"), "game-boost-session.json"); }
async function restoreGameBoostSession() {
  const state = await readJsonFile(gameBoostStateFile(), null);
  if (!state || typeof state.originalScheme !== "string" || !/^[a-f0-9-]{36}$/i.test(state.originalScheme)) return false;
  try {
    await runPowerCfg(["/setactive", state.originalScheme]);
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
    await runPowerCfg(["/setactive", POWER_PLANS.high]);
    await writeJsonFile(gameBoostStateFile(), { originalScheme: originalScheme, startedAt: new Date().toISOString() });
    return { success: true, alreadyActive: false };
  });
  ipcMain.handle("games:boost-stop", async () => {
    const restored = await restoreGameBoostSession();
    if (!restored) throw new Error("Não foi possível restaurar o plano anterior. Verifique os planos disponíveis no Windows.");
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
  registerStartupIpc();
  registerGameBoostIpc();
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

app.on("before-quit", () => {
  quitting = true;
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

const { parentPort } = require("node:worker_threads");
const { createHash } = require("node:crypto");
const { performance } = require("node:perf_hooks");
const { Buffer } = require("node:buffer");

async function runBenchmark() {
  const cpuBlock = Buffer.alloc(1024 * 1024, 0x41);
  const cpuDurationMs = 1600;
  const cpuStart = performance.now();
  let hashes = 0;
  while (performance.now() - cpuStart < cpuDurationMs) {
    createHash("sha256").update(cpuBlock).digest();
    hashes++;
  }
  const cpuElapsedMs = performance.now() - cpuStart;
  const cpuMiB = (hashes * cpuBlock.byteLength) / (1024 * 1024);
  const cpuMiBPerSecond = cpuMiB / (cpuElapsedMs / 1000);

  const memorySize = 24 * 1024 * 1024;
  const source = Buffer.alloc(memorySize, 0x5a);
  const destination = Buffer.allocUnsafe(memorySize);
  const memoryDurationMs = 1000;
  const memoryStart = performance.now();
  let copies = 0;
  while (performance.now() - memoryStart < memoryDurationMs) {
    source.copy(destination);
    copies++;
  }
  const memoryElapsedMs = performance.now() - memoryStart;
  const memoryMiB = (copies * memorySize) / (1024 * 1024);
  const memoryMiBPerSecond = memoryMiB / (memoryElapsedMs / 1000);

  parentPort.postMessage({
    capturedAt: new Date().toISOString(),
    methodology: "CPU SHA-256 de blocos de 1 MiB e cópia sequencial de buffer de 24 MiB",
    cpu: {
      durationMs: Math.round(cpuElapsedMs),
      hashes,
      processedMiB: Number(cpuMiB.toFixed(1)),
      mebibytesPerSecond: Number(cpuMiBPerSecond.toFixed(1)),
    },
    memory: {
      durationMs: Math.round(memoryElapsedMs),
      copies,
      copiedMiB: Number(memoryMiB.toFixed(1)),
      mebibytesPerSecond: Number(memoryMiBPerSecond.toFixed(1)),
    },
  });
}

runBenchmark().catch((error) => {
  parentPort.postMessage({ error: error instanceof Error ? error.message : String(error) });
});

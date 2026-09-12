/* eslint-disable */
const fs = require("fs-extra");
const path = require("path");
const archiver = require("archiver");

const root = process.cwd();
const buildDir = path.join(root, "build");

const zipName = "found-hint.zip";
const outputPath = path.join(root, zipName);

// ── helpers ──────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " kB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function formatTime(ms) {
  if (ms < 1000) return ms + "ms";
  return (ms / 1000).toFixed(2) + "s";
}

function pad(str, len) {
  return String(str).padEnd(len);
}

// ── zip ───────────────────────────────────────────────────
function createZip() {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath, {
      highWaterMark: 1024 * 1024,
    });

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    const fileList = [];

    archive.on("entry", (entry) => {
      if (!entry.stats.isDirectory()) {
        fileList.push({
          name: entry.name,
          size: entry.stats.size,
        });
      }
    });
    output.on("close", () => resolve({ fileList, totalSize: archive.pointer() }));
    archive.on("warning", (err) => {
      if (err.code !== "ENOENT") reject(err);
    });
    archive.on("error", (err) => reject(err));

    archive.pipe(output);
    archive.directory(buildDir + "/", false);
    archive.finalize();
  });
}

// ── main ──────────────────────────────────────────────────
(async () => {
  try {
    const totalStart = Date.now();

    // step 1 — zip
    console.log("");
    console.log("📦 creating zip...");
    const zipStart = Date.now();
    const { fileList, totalSize } = await createZip();
    const zipTime = Date.now() - zipStart;

    // step 2 — cleanup
    const cleanStart = Date.now();
    await fs.remove(buildDir);
    const cleanTime = Date.now() - cleanStart;
    const totalTime = Date.now() - totalStart;

    // ── summary table (vite style) ────────────────────────
    const col1 = 40;
    const col2 = 10;
    console.log("   " + zipName);
    console.log(`   ${"compressed".padEnd(col1)} ${formatBytes(totalSize).padStart(col2)}`);
    console.log("");
    console.log(
      `⚡ zipped in ${formatTime(zipTime)}  |  cleaned in ${formatTime(cleanTime)}  |  total ${formatTime(totalTime)}`,
    );
    console.log("");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();

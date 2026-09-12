/* eslint-disable */
const fs = require('fs-extra');
const path = require('path');
const micromatch = require('micromatch');

const root = process.cwd();
const buildDir = path.join(root, 'build');

const pkg = require(path.join(root, 'package.json'));
const rawPatterns = pkg.buildExclude || [];

// ── helpers ──────────────────────────────────────────────
function formatTime(ms) {
  if (ms < 1000) return ms + 'ms';
  return (ms / 1000).toFixed(2) + 's';
}

function isExcluded(relativePath) {
  const rel = relativePath.replace(/\\/g, '/');
  return micromatch.isMatch(rel, rawPatterns);
}

// ── copy ─────────────────────────────────────────────────
let filesCopied = 0;
let filesSkipped = 0;

async function copyRecursive(src, dest) {
  await fs.ensureDir(dest);

  const items = await fs.readdir(src);

  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const relative = path.relative(root, srcPath);

    if (relative.startsWith('build')) continue;

    if (isExcluded(relative)) {
      filesSkipped++;
      continue;
    }

    const stat = await fs.stat(srcPath);

    if (stat.isDirectory()) {
      await copyRecursive(srcPath, destPath);
    } else {
      await fs.copy(srcPath, destPath);
      filesCopied++;
    }
  }
}

// ── main ─────────────────────────────────────────────────
async function run() {
  const totalStart = Date.now();
  console.log('');
  const col1 = 40;
  const col2 = 10;
  // step 1 — clean
  const cleanStart = Date.now();
  await fs.remove(buildDir);
  const cleanTime = Date.now() - cleanStart;

  // step 2 — build
  const buildStart = Date.now();
  console.log('📑 copying files...');
  await copyRecursive(root, buildDir);
  const buildTime = Date.now() - buildStart;

  const totalTime = Date.now() - totalStart;

  // ── summary ───────────────────────────────────────────
  console.log(`   ${'files copied'.padEnd(col1)} ${String(filesCopied).padStart(col2)}`);
  console.log(`   ${'files skipped'.padEnd(col1)} ${String(filesSkipped).padStart(col2)}`);
  console.log('');
  console.log(
    `⚡ cleaned in ${formatTime(cleanTime)}  |  copied in ${formatTime(buildTime)}  |  total ${formatTime(totalTime)}`,
  );
}

run().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});

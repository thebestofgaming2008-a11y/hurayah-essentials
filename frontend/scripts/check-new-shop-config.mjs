import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const roots = ["index.html", "wrangler.toml", "src", "functions", "convex", "public"];
const ignoredDirs = new Set(["node_modules", "dist", ".git", ".wrangler", ".softgen"]);
const ignoredExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".ico", ".woff", ".woff2"]);

const markers = [
  {
    label: "old Hurayrah brand name",
    pattern: /\bHurayrah Essentials\b|\bHurayrah\b/i,
  },
  {
    label: "old Hurayrah domains",
    pattern: /hurayrahessentials\.com|abuhurayrahessentials\.site|media\.abuhurayrahessentials\.site/i,
  },
  {
    label: "old Hurayrah social handle",
    pattern: /hurayrah_essentials/i,
  },
  {
    label: "old WhatsApp or phone number",
    pattern: /918491943437|84919\s*43437|\+91\s*84919\s*43437/i,
  },
  {
    label: "old SEO tagline",
    pattern: /Seek Knowledge Affordably|Seek Knowledge/i,
  },
];

function walk(path, files = []) {
  if (!existsSync(path)) return files;
  const stats = statSync(path);
  if (stats.isFile()) {
    if (![...ignoredExtensions].some((ext) => path.toLowerCase().endsWith(ext))) files.push(path);
    return files;
  }
  if (!stats.isDirectory()) return files;
  for (const entry of readdirSync(path)) {
    if (ignoredDirs.has(entry)) continue;
    walk(join(path, entry), files);
  }
  return files;
}

const findings = [];
for (const entry of roots) {
  for (const file of walk(resolve(root, entry))) {
    let text = "";
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const lines = text.split(/\r?\n/);
    for (const marker of markers) {
      for (const [index, line] of lines.entries()) {
        if (marker.pattern.test(line)) {
          findings.push({
            file: file.slice(root.length + 1).replace(/\\/g, "/"),
            line: index + 1,
            label: marker.label,
            preview: line.trim().slice(0, 160),
          });
        }
      }
    }
  }
}

if (!findings.length) {
  console.log("PASS No old-shop runtime branding markers found.");
  process.exit(0);
}

console.error(`FAIL Found ${findings.length} old-shop runtime branding marker(s).`);
for (const finding of findings.slice(0, 80)) {
  console.error(`${finding.file}:${finding.line} ${finding.label}`);
  console.error(`  ${finding.preview}`);
}
if (findings.length > 80) {
  console.error(`  ...and ${findings.length - 80} more.`);
}
console.error("\nReplace these before launching a copied shop. This check is expected to fail on the original Hurayrah shop.");
process.exit(1);

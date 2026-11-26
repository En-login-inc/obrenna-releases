// Publish release artifacts to this repo via the gh CLI.
// Usage: node publish.mjs --tag <tag> --title <title> [--notes <text>] [--desktop] --assets <files...>
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}
const tag = flag('tag');
const title = flag('title') ?? tag;
const notes = flag('notes') ?? '';
const desktop = args.includes('--desktop');
const assetsStart = args.indexOf('--assets');
const assets = assetsStart >= 0 ? args.slice(assetsStart + 1).filter(a => !a.startsWith('--')) : [];
if (!tag || assets.length === 0) {
  console.error('Usage: node publish.mjs --tag <tag> --title <title> [--desktop] --assets <files...>');
  process.exit(2);
}

const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const repo = 'En-login-inc/obrenna-releases';

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function osFor(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.exe') || lower.endsWith('.msi')) return 'windows';
  if (lower.endsWith('.dmg')) return 'macos';
  if (lower.endsWith('.appimage') || lower.endsWith('.deb')) return 'linux';
  return null;
}

// Create or reuse the release, then upload assets (clobber keeps re-runs idempotent).
try {
  gh('release', 'view', tag, '--repo', repo);
  console.log(`Release ${tag} exists; uploading assets.`);
} catch {
  gh('release', 'create', tag, '--repo', repo, '--title', title, '--notes', notes);
  console.log(`Created release ${tag}.`);
}
gh('release', 'upload', tag, '--repo', repo, '--clobber', ...assets);
console.log(`Uploaded ${assets.length} asset(s).`);

if (desktop) {
  const release = JSON.parse(gh('release', 'view', tag, '--repo', repo, '--json', 'assets,publishedAt'));
  const byUrl = new Map(release.assets.map(a => [a.name, a.url]));
  // Prefer the NSIS exe / dmg / AppImage when several formats exist per OS.
  const preference = { windows: ['.exe', '.msi'], macos: ['.dmg'], linux: ['.appimage', '.deb'] };
  const chosen = {};
  for (const asset of release.assets) {
    const os = osFor(asset.name);
    if (!os) continue;
    const rank = preference[os].findIndex(ext => asset.name.toLowerCase().endsWith(ext));
    if (rank < 0) continue;
    if (!chosen[os] || rank < chosen[os].rank) chosen[os] = { asset, rank };
  }
  const manifest = {
    version: tag.replace(/^desktop-v/, ''),
    published_at: release.publishedAt,
    assets: Object.entries(chosen).map(([os, { asset }]) => ({
      os,
      url: byUrl.get(asset.name) ?? asset.url,
      checksum_sha256: sha256(assets.find(p => basename(p) === asset.name)),
    })),
  };
  const dir = mkdtempSync(join(tmpdir(), 'obrenna-release-'));
  const manifestPath = join(dir, 'desktop-latest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  gh('release', 'upload', tag, '--repo', repo, '--clobber', manifestPath);
  console.log('Published desktop-latest.json:', JSON.stringify(manifest.assets.map(a => a.os)));
}
console.log(`Done: https://github.com/${repo}/releases/tag/${tag}`);
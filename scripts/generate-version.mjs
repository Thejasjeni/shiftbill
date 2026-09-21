// Build-time hook: writes public/version.json with the current git short SHA.
// Published with the site, it is the canonical "which build is current" answer:
// src/lib/updateCheck.js fetches it from the live origin and compares it against
// the SHA baked into its own bundle. Runs from the "prebuild" npm script, before
// Vite copies public/ into dist/.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let sha = 'dev';
try {
  sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root })
    .toString()
    .trim();
} catch {
  // No git (archive download, CI tarball): the bundle's baked-in BUILD_SHA
  // stays 'dev' too, so the comparison sees "same" and shows nothing.
}

mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public', 'version.json'), JSON.stringify({ sha }) + '\n');

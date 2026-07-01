#!/usr/bin/env node
/*
 * build-setup.mjs — regenerate ./setup.mjs from the local ./.local/ workflow.
 *
 * setup.mjs embeds every .local/ file as base64 so it can reproduce the whole
 * private workflow anywhere. When you EDIT anything under .local/, re-run:
 *
 *     node build-setup.mjs
 *
 * and commit the updated setup.mjs. (setup.template.mjs holds the installer
 * logic; this script injects the file contents into it.)
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const LOCAL = path.join(ROOT, '.local');
const SKIP = new Set(['node_modules', '.cache', '.runtime', '.playwright',
  'test-results', 'playwright-report', 'storybook-static', '.maestro']);

// NEVER embed these into the committed setup.mjs — secrets and per-machine
// runtime files (mirrors .local/.gitignore). base64 is not encryption, so an
// embedded secret would leak into the tracked installer and its git history.
const SKIP_FILE_BASENAME = [
  /^\.env$/, /^\.env\..+/, /\.local\.json$/, /\.secret$/, /^credentials/i, /^\.DS_Store$/,
];
const SKIP_FILE_RELPATH = [
  /^opencode\/(package\.json|package-lock\.json|bun\.lock)$/,
];

function skipFile(abs) {
  if (SKIP_FILE_BASENAME.some((re) => re.test(path.basename(abs)))) return true;
  const rel = path.relative(LOCAL, abs).split(path.sep).join('/');
  return SKIP_FILE_RELPATH.some((re) => re.test(rel));
}

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) out.push(...await walk(path.join(dir, e.name))); }
    else if (e.isFile() && !skipFile(path.join(dir, e.name))) out.push(path.join(dir, e.name));
  }
  return out;
}

const files = (await walk(LOCAL)).sort();
const map = {};
for (const f of files) {
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  map[rel] = (await fs.readFile(f)).toString('base64');
}

const tpl = await fs.readFile(path.join(ROOT, 'setup.template.mjs'), 'utf8');
const out = tpl.replace('/*__FILES__*/{}/*__END__*/', JSON.stringify(map, null, 2));
await fs.writeFile(path.join(ROOT, 'setup.mjs'), out);
console.log(`Regenerated setup.mjs with ${files.length} embedded files.`);

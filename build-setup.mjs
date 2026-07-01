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
const SKIP = new Set(['node_modules', '.cache', '.playwright', 'test-results',
  'playwright-report', 'storybook-static', '.maestro']);

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) out.push(...await walk(path.join(dir, e.name))); }
    else if (e.isFile()) out.push(path.join(dir, e.name));
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

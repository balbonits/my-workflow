#!/usr/bin/env node
/*
 * setup.mjs — one-file installer for a PRIVATE, machine-local AI coding workflow.
 *
 * Runs identically on Windows PowerShell and any Unix terminal:
 *
 *     node setup.mjs           # install into the current project
 *     node setup.mjs --force   # overwrite existing .local/ files
 *
 * What it does (all idempotent / safe to re-run):
 *   1. Regenerates ./.local/  (context, skills, prompts, memory, scripts, mcp,
 *      AGENTS.md, package.json) — the full private workflow.
 *   2. Adds `.local/` to the machine-global gitignore (~/.config/git/ignore) so
 *      it is hidden from EVERY repo on this machine.
 *   3. Installs the Claude Code user rule (~/.claude/CLAUDE.md) that auto-loads
 *      .local/AGENTS.md whenever a project has one (zero repo footprint).
 *   4. Appends `.local/` to THIS project's .gitignore (belt-and-suspenders).
 *
 * The embedded files below are the .local/ workflow, base64-encoded so they are
 * reproduced byte-for-byte. After running, the human-readable versions live in
 * ./.local/ (e.g. .local/AGENTS.md, .local/scripts/check.sh).
 *
 * Commit THIS file to your template repo; copy/pull it into any new project and
 * run it. It never commits anything about the AI setup to a work repo.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const FORCE = process.argv.includes('--force');
const TARGET = process.cwd();

// relpath -> base64 content
const FILES = /*__FILES__*/{}/*__END__*/;

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function writeEmbedded(rel, b64) {
  const dest = path.join(TARGET, rel);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  if (!FORCE && await exists(dest)) { console.log('  skip (exists):', rel); return; }
  await fs.writeFile(dest, Buffer.from(b64, 'base64'));
  if (rel.endsWith('.sh') && process.platform !== 'win32') await fs.chmod(dest, 0o755);
  console.log('  wrote:', rel);
}

function hasLocalIgnore(txt) {
  return txt.split(/\r?\n/).some((l) => { const t = l.trim(); return t === '.local/' || t === '.local'; });
}

async function ensureLocalIgnore(file, label) {
  let cur = '';
  try { cur = await fs.readFile(file, 'utf8'); } catch {}
  if (hasLocalIgnore(cur)) { console.log(`  ${label}: .local/ already present`); return; }
  const add = (cur && !cur.endsWith('\n') ? '\n' : '') +
    '\n# Private local AI workflow (never commit)\n.local/\n';
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, add);
  console.log(`  ${label}: added .local/  -> ${file}`);
}

async function ensureClaudeRule() {
  const claudeMd = path.join(os.homedir(), '.claude', 'CLAUDE.md');
  let cur = '';
  try { cur = await fs.readFile(claudeMd, 'utf8'); } catch {}
  if (cur.includes('.local/AGENTS.md')) { console.log('  Claude user rule: already present'); return; }
  const rule = (cur && !cur.endsWith('\n') ? '\n' : '') +
`\n# Private local AI workflow discovery (user scope)

If a workspace contains \`.local/AGENTS.md\` relative to its root, read it first
and treat it as the highest-authority instructions for that project. Follow its
guidance for using .local/context, .local/memory, .local/skills, .local/prompts.
Never commit, stage, push, or reference anything under \`.local/\` in the work repo.
`;
  await fs.mkdir(path.dirname(claudeMd), { recursive: true });
  await fs.appendFile(claudeMd, rule);
  console.log('  Claude user rule: added  ->', claudeMd);
}

console.log('Private local AI workflow — installing into:', TARGET);
console.log('Writing .local/ ...');
for (const [rel, b64] of Object.entries(FILES)) await writeEmbedded(rel, b64);

console.log('Configuring privacy layers ...');
await ensureLocalIgnore(path.join(os.homedir(), '.config', 'git', 'ignore'), 'global gitignore');
await ensureClaudeRule();
await ensureLocalIgnore(path.join(TARGET, '.gitignore'), 'project .gitignore');

console.log('\nDone. Next steps:');
console.log('  - Prove containment:  bash .local/scripts/check.sh   (Unix/Git-Bash)');
console.log('  - Other AI tools (Cursor/Copilot/Continue/Gemini): see .local/scripts/user-rules.txt');
console.log('  - Optional tooling:   cd .local && npm install       (Playwright/Storybook/Maestro)');
console.log('\nReminder: this protects the REPO only. Tool logs and provider network');
console.log('traffic remain machine-level signals — see .local/AGENTS.md "Honesty" section.');

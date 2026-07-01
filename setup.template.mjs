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
import { execFileSync } from 'node:child_process';

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

async function ensureLocalIgnore(file, label, comment) {
  // `comment` is written only for the machine-global ignore (never in a repo).
  // The project's .gitignore is tracked, so we add a bare `.local/` there with no
  // AI-identifying comment (a "Private local AI workflow" note would leak intent
  // into the work repo's history via git blame/diff).
  let cur = '';
  try { cur = await fs.readFile(file, 'utf8'); } catch {}
  if (hasLocalIgnore(cur)) { console.log(`  ${label}: .local/ already present`); return; }
  const header = comment ? comment + '\n' : '';
  const add = (cur && !cur.endsWith('\n') ? '\n' : '') + '\n' + header + '.local/\n';
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, add);
  console.log(`  ${label}: added .local/  -> ${file}`);
}

function globalGitignorePath() {
  // Honor a pre-existing custom core.excludesfile; otherwise pin the XDG default
  // so git deterministically reads the file we append `.local/` to.
  try {
    const p = execFileSync('git', ['config', '--global', '--get', 'core.excludesfile'],
      { encoding: 'utf8' }).trim();
    if (p) return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
  } catch {}
  const def = path.join(os.homedir(), '.config', 'git', 'ignore');
  try { execFileSync('git', ['config', '--global', 'core.excludesfile', def]); } catch {}
  return def;
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

function ensureOllamaCaps() {
  // Memory-safety caps for local Ollama (macOS only; applied on next Ollama start).
  if (process.platform !== 'darwin') { console.log('  ollama caps: skipped (macOS only)'); return; }
  const caps = {
    OLLAMA_CONTEXT_LENGTH: '8192', OLLAMA_KEEP_ALIVE: '30s',
    OLLAMA_MAX_LOADED_MODELS: '1', OLLAMA_NUM_PARALLEL: '1',
  };
  try {
    for (const [k, v] of Object.entries(caps)) execFileSync('launchctl', ['setenv', k, v]);
    console.log('  ollama caps: set (CONTEXT_LENGTH=8192, KEEP_ALIVE=30s, MAX_LOADED=1, NUM_PARALLEL=1)');
    console.log('    -> restart Ollama to apply:  bash .local/scripts/ollama-guard.sh');
  } catch { console.log('  ollama caps: launchctl unavailable, skipped'); }
}

console.log('Configuring privacy layers ...');
// Global ignore: resolve the effective excludesfile (honor a custom one) so the
// machine-wide `.local/` rule actually takes effect. Comment is safe here (not a repo).
await ensureLocalIgnore(globalGitignorePath(), 'global gitignore', '# Private local AI workflow (never commit)');
await ensureClaudeRule();
// Project ignore: bare `.local/`, no AI-identifying comment (this file is tracked).
await ensureLocalIgnore(path.join(TARGET, '.gitignore'), 'project .gitignore');

console.log('Configuring local AI workhorse ...');
// opencode config is NOT installed globally — the launchers (start.sh/workhorse.sh)
// point opencode at .local/opencode/opencode.json via XDG, keeping it contained and
// avoiding hijacking bare `opencode` in unrelated projects.
console.log('  opencode config: contained in .local/opencode/ (used by start.sh/workhorse.sh)');
ensureOllamaCaps();

console.log('\nDone. Next steps:');
console.log('  - Prove containment:  bash .local/scripts/check.sh   (Unix/Git-Bash)');
console.log('  - Other AI tools (Cursor/Copilot/Continue/Gemini): see .local/scripts/user-rules.txt');
console.log('  - Optional tooling:   cd .local && npm install       (Playwright/Storybook/Maestro)');
console.log('\nReminder: this protects the REPO only. Tool logs and provider network');
console.log('traffic remain machine-level signals — see .local/AGENTS.md "Honesty" section.');

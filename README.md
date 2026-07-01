# my-workflow

Canonical, private **local AI coding workflow** — one installer file you commit,
copy, or pull into any project. It scaffolds a `.local/` workspace for AI
context/skills/prompts/memory and guarantees that **nothing about the AI setup
touches the work/company repo**.

## One-command install

Runs natively in **PowerShell and any Unix terminal** (needs Node — you have it):

```bash
node setup.mjs           # install into the current project
node setup.mjs --force   # overwrite existing .local/ files
```

That single file:
1. Writes `./.local/` (context, wiki, skills, prompts, memory, scripts, mcp, opencode, `AGENTS.md`).
2. Adds `.local/` to the **machine-global gitignore** (honoring a custom `core.excludesfile`) — hides it in every repo on the machine.
3. Installs the **Claude Code user rule** (`~/.claude/CLAUDE.md`) so any project with `.local/AGENTS.md` is auto-discovered — zero repo footprint.
4. Appends a bare `.local/` to the project's own `.gitignore` (belt-and-suspenders, no AI-identifying comment).
5. Applies **Ollama memory-safety caps** for the local model (macOS).

Idempotent and safe to re-run.

## Local AI workhorse (two-tier)

- **Claude Code (cloud)** = intelligence — specs, docs, wiki, review, orchestration.
- **Local model** = workhorse — `opencode` + Ollama **MLX** (`qwen3.5:9b-nvfp4`) doing the
  token-heavy grunt work locally. All opencode data is contained inside `.local/`.

```bash
bash .local/scripts/start.sh          # one command: bring up + launch opencode
bash .local/scripts/workhorse.sh "…"  # hand one task to the local model
bash .local/scripts/kill-local-ai.sh  # emergency: free RAM
```
Full details in the wiki: `.local/context/wiki/` (INDEX, running, architecture,
local-ai, cli-prompting, project-playbook).

## Phased build methodology

`.local/context/wiki/project-playbook.md` is a 9-phase, spiral (not waterfall)
methodology for building a product solo with AI as a "relief pitcher" for the
non-coding gaps. Each phase ships a fill-in **scaffold** under `.local/templates/`
(`concept` → P1, `scope` → P2, `business` → P8) — copy one into the wiki at the
start of a phase and fill it in with the cloud brain:

```bash
cp .local/templates/concept.md .local/context/wiki/concept.md
```

> **Why Node, not a bash script?** A single file that runs *natively* in both
> PowerShell and Unix can't be plain bash (PowerShell can't execute it, and a
> bash/PowerShell polyglot is fragile). `node setup.mjs` is one testable
> implementation that works in both. A Unix-only `setup.sh` can be added if you
> want one.

## What's inside `.local/`

| Path                     | Purpose |
|--------------------------|---------|
| `AGENTS.md`              | Master instructions for **all** AI agents (Claude, Cursor, Copilot, Gemini…). |
| `context/`              | LLM wiki, saved docs, design/architecture notes (AI grounding). |
| `templates/`            | Phase scaffolds for new projects (concept, scope, business). |
| `skills/`               | Reusable agent skills — installed/created/run only here. |
| `prompts/`              | Reusable prompt & command templates. |
| `memory/`               | `journal.md` + `decisions.md` (persistent notes). |
| `opencode/`             | opencode config for the local MLX workhorse (data contained in `.local/`). |
| `scripts/start.sh`      | One command: apply caps, start Ollama, pull model, launch opencode. |
| `scripts/workhorse.sh`  | Hand one task to the local model (runs from project root). |
| `scripts/ollama-guard.sh`| Apply/verify/persist Ollama memory-safety caps. |
| `scripts/kill-local-ai.sh`| Emergency RAM free (`--hard` stops the server). |
| `scripts/bootstrap.sh`  | Deploy `.local/` into another project (copy-based alternative to `setup.mjs`). |
| `scripts/check.sh`      | Privacy/leak check — run before committing in any project. |
| `scripts/user-rules.txt`| Paste-in discovery rules for Cursor/Copilot/Continue/Gemini. |
| `mcp/`                  | Local MCP server config (secrets stay local). |

## Discovery model (how AI finds `.local/AGENTS.md`)

No file about AI usage is committed. Discovery is driven from **machine-level
user config**: a standing rule ("*if the workspace has `.local/AGENTS.md`, read
it first and treat it as authoritative*") lives in each tool's user profile.
`setup.mjs` installs it for Claude Code; `.local/scripts/user-rules.txt` has the
snippets for other tools. See the "Honesty" section of `.local/AGENTS.md`: this
protects the **repo**, not machine-level signals (tool logs, provider traffic).

## Verify containment

```bash
bash .local/scripts/check.sh   # Unix / Git-Bash — proves .local/ can't leak
```

## Editing the workflow

`.local/` is itself git-ignored (even here), so the committed source of truth is
`setup.mjs`. To change the workflow: edit files under `.local/`, then rebuild
the installer and commit it:

```bash
node build-setup.mjs           # re-embeds .local/ into setup.mjs
git add setup.mjs && git commit -m "Update AI workflow"
```

## Files in this repo

- `setup.mjs` — the one-command installer (generated; commit this).
- `setup.template.mjs` — installer logic (edit this for installer behavior).
- `build-setup.mjs` — regenerates `setup.mjs` from `.local/`.
- `.local/` — the live workflow (git-ignored; source for the installer).

## Progression & decisions (recordkeeping)

How this ended up the way it is — the non-obvious calls, in order:

**Architecture**
- **Two-tier split.** Cloud brain (Opus 4.8 / Sonnet 5) = intelligence
  (specs, docs, review, orchestration); local model = token-saving BTS coder.
  Local execution is **serial** (one model, one request) on the 32GB M2 Max.
- **Sonnet 5 is real** (`claude-sonnet-5`, Claude 5 family) — a viable
  cheaper/faster cloud tier if Opus is overkill.

**Local model selection (memory-driven)**
- Hard requirement: the local model must run **alongside VS Code + Docker +
  Chrome** on 32GB. This ruled out the big ones.
- `qwen3.6:27b-mlx` (~19–20GB, no sub-27B size) → **rejected**, can't coexist.
- Landed on **`qwen3.5:9b-nvfp4`** (~8.9GB MLX/nvfp4) — Apple-Silicon optimized,
  leaves headroom for the other apps.
- Ollama **does** run MLX (v0.19+, nvfp4 quant). Earlier "it can't" was wrong.
- **Mandatory Ollama caps** (via `launchctl setenv`) after a near-OOM crash
  (30GB used + ~32GB swap): `OLLAMA_CONTEXT_LENGTH=8192`, `KEEP_ALIVE=30s`,
  `MAX_LOADED_MODELS=1`, `NUM_PARALLEL=1`. Enforced by `ollama-guard.sh`.

**Containment (keep everything inside `.local/`, don't break the machine)**
- opencode is pointed at Ollama via an OpenAI-compatible provider
  (`localhost:11434/v1`); custom models need `cost`+`limit` (a cosmetic
  `DecimalError` is a known, harmless quirk).
- Config via **`OPENCODE_CONFIG`** env var, **not `XDG_CONFIG_HOME`** — the
  latter broke `git`/`gh` identity ("Author identity unknown"). Runtime data is
  contained via `XDG_DATA/CACHE/STATE_HOME` → `.local/opencode/.runtime/`.

**Installer safety (`build-setup.mjs` → `setup.mjs`)**
- **Secrets are never embedded**: a basename/relpath filter excludes `.env*`,
  `*.local.json`, `*.secret`, `credentials*`, keys/pems, `.npmrc`, `.netrc`, etc.
- `.runtime/`, opencode lockfiles, and `node_modules` are skipped.
- Base64 map is injected via a **function replacement** to avoid `$`-sequence
  corruption. Currently **32 embedded files**.

**Privacy posture**
- `.local/` is git-ignored two ways: machine-global (`~/.config/git/ignore`,
  honoring custom `core.excludesfile`) **and** a bare `.local/` line per project
  (no AI-identifying comment in tracked files).
- This protects the **repo**, not machine-level signals (tool logs, and — most
  importantly — provider network traffic). See `.local/AGENTS.md` "Honesty".

**Process**
- Hardened over **two adversarial review rounds** (multi-agent finder + verify),
  fixing ~24 defects total (secret leakage, the XDG/git break, arg-parsing bugs,
  symlink-glob false negatives, strict-JSON validation).
- Added the 9-phase **spiral playbook** + reusable phase **templates** so new
  projects start with structured scaffolds, not a blank page.

> **Status:** functional and verified end-to-end (fresh blank-project install →
> `check.sh` clean → `start.sh` green → git identity intact → contained runs
> only wrote under `.local/opencode/.runtime/`). Kept as a reference template.

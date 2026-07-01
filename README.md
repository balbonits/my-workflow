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
local-ai, cli-prompting).

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
| `skills/`               | Reusable agent skills — installed/created/run only here. |
| `prompts/`              | Reusable prompt & command templates. |
| `memory/`               | `journal.md` + `decisions.md` (persistent notes). |
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

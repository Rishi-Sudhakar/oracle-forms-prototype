# Oracle Forms Modernization & AI-Assisted Maintenance Prototype

Prototype demonstrating two AI-assisted approaches for legacy Oracle Forms applications.
Built for a leadership presentation — see `CLAUDE.md` for full context.

## Two paths

| Path | What it does | Folder |
|------|-------------|--------|
| **Modernize** | Forms → APEX: extract PL/SQL logic, rebuild UI in Oracle APEX | `apps/modernize/` |
| **Maintain** | Keep Forms as-is: AI generates docs, tests, explains triggers, suggests fixes | `apps/maintain/` |

## Setup

See [`docs/setup.md`](docs/setup.md) for full tool installation and configuration steps.

**TL;DR stack:**
- Oracle Cloud Always Free — Autonomous Database 23ai
- SQLcl + Oracle SQL Developer Extension for VS Code (ships MCP server)
- Claude Code connected to MCP server (queries live schema directly)
- Oracle APEX (free, built into Autonomous DB)

## Structure

```
apps/
  modernize/    input → analysis → plsql → apex → report
  maintain/     input → docs, tests, explanations, tickets
shared/         db config, utility scripts
presentation/   slide deck
docs/           setup guide
```

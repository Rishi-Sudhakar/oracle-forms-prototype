# Tool Setup Guide

This guide covers everything needed to run both prototype paths (modernize and maintain)
against a live Oracle database with Claude Code as the AI agent.

**Target DB direction:** The prototype runs on Autonomous Database 23ai (Always Free tier).
The client's stated direction is Oracle AI Database 26ai (the AI-native LTS release,
internally versioned 23.26.x). The MCP-based architecture used here is the same pattern
26ai is built around -- upgrading from 23ai to 26ai is a release update, not a
re-architecture. EBS 12.2 is certified on 26ai.

---

## 1. Oracle Cloud — Provision Autonomous Database

You need a free Oracle Cloud account with an Always Free Autonomous Database.

1. Sign up at https://cloud.oracle.com (select "Always Free" during registration)
2. Go to **Oracle Database → Autonomous Database → Create Autonomous Database**
3. Settings:
   - Workload type: **Transaction Processing** (or JSON — either works)
   - Always Free: **Yes**
   - Database name: `FORMSPROTOTYPE` (or anything)
   - Password: set a strong ADMIN password, save it — you'll need it
4. Once provisioned (2–5 min), click **Database Actions** to confirm it's up
5. Download the **Wallet** (Connection → Download Wallet) — save the zip, you'll need it for SQLcl

> APEX is included automatically — access it via **Database Actions → APEX** from the OCI console.

---

## 2. SQLcl — Oracle's SQL CLI

SQLcl is Oracle's modern SQL command-line tool. It's required for running scripts against
the DB and is the foundation for the MCP server.

### Install

**macOS (Homebrew):**
```bash
brew install sqlcl
```

**Manual:** Download from https://www.oracle.com/database/sqldeveloper/technologies/sqlcl/

Verify:
```bash
sql -v
# Should print: SQLcl: Release 24.x.x ...
```

### Connect to your Autonomous DB

```bash
sql ADMIN@"(description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=<your-host>))(connect_data=(service_name=<your-service>))(security=(ssl_server_dn_match=yes)))"
```

Or using the wallet:
```bash
sql /nolog
SQL> set cloudconfig /path/to/wallet.zip
SQL> connect ADMIN@<db_name>_high
```

The connection string is in your wallet's `tnsnames.ora`. Use the `_high` or `_medium` service.

---

## 3. Oracle SQL Developer Extension for VS Code (MCP Server)

This VS Code extension ships a built-in MCP server that auto-exposes your DB schema and
tools to any MCP-compatible client — including Claude Code.

### Install

1. Open VS Code → Extensions → search **"Oracle SQL Developer"**
2. Install: **Oracle SQL Developer Extension for VS Code** (publisher: Oracle)
3. Restart VS Code

### Create a connection

1. In VS Code, open the **Oracle SQL** panel (left sidebar)
2. Click **+** → New Connection
3. Fill in:
   - Connection name: `FORMSPROTOTYPE`
   - Authentication: Basic
   - Username: `ADMIN`
   - Password: your ADMIN password
   - Connection type: **Cloud Wallet**
   - Configuration file: path to your wallet zip
   - Service: `<db_name>_high`
4. Test → Save

### Enable the MCP server

1. Open VS Code Settings (`Cmd+,`) → search `oracle.sqldev.mcp`
2. Enable **Oracle SQL Developer: MCP Server**
3. Note the MCP server port (default: `3000`) — shown in the Output panel under "Oracle SQL Developer MCP"

The server auto-exposes:
- Schema browser (tables, views, packages, triggers)
- SQL execution tool
- Object DDL tool
- Query results as structured data

---

## 4. Wire Claude Code to the MCP Server

With the VS Code MCP server running, tell Claude Code to connect to it.

### Add to `.claude/settings.json` (project-level)

Create or edit `/Users/rishisudhakar/oracle-forms-prototype/.claude/settings.json`:

```json
{
  "mcpServers": {
    "oracle-db": {
      "type": "sse",
      "url": "http://localhost:3000/sse"
    }
  }
}
```

> The port (`3000`) must match what the VS Code extension is using. Check the Output panel
> in VS Code under "Oracle SQL Developer MCP" to confirm the port.

### Verify the connection

Start a new Claude Code session in this directory:
```bash
claude
```

Then ask: *"List the tables in my Oracle schema"* — Claude Code should use the MCP tool
to query the live DB and return results.

---

## 5. Load the Summit Sample Schema

The Summit schema is Oracle's canonical sample Forms dataset (orders, customers, inventory).
It's the source material for both prototype paths.

### Option A — Use the pre-built Summit SQL scripts

Oracle provides Summit as a set of SQL scripts. Download from:
https://github.com/oracle/apex/tree/main/apex-samples  
(or search for "Oracle Summit Sample Application" on apex.oracle.com)

Run via SQLcl:
```bash
sql ADMIN@<connection> @shared/db/summit_install.sql
```

### Option B — Use Oracle APEX Sample Application

1. Log into your APEX workspace (Database Actions → APEX → create a workspace)
2. **App Gallery → Sample Database Application** → Install
3. This installs the Summit schema objects and sample data automatically

> Option B is faster for the demo. The schema is the same either way.

---

## 6. Oracle APEX Workspace Setup

Required for the modernization path (rebuilding the UI in APEX).

1. From OCI Console → your Autonomous DB → **Database Actions → APEX**
2. First launch: create an **Internal** workspace admin account
3. Log in → **Create Workspace**:
   - Workspace name: `FORMSPROTOTYPE`
   - Schema: `ADMIN` (or a dedicated schema if you created one)
4. Log out of Internal → log in to `FORMSPROTOTYPE` workspace

You'll build the modernized APEX app in `apps/modernize/apex/` and import it here.

---

## 7. Project Layout Reference

```
oracle-forms-prototype/
├── apps/
│   ├── modernize/          # Path 1: Forms → APEX
│   │   ├── input/          # .fmb export / XML source
│   │   ├── analysis/       # AI-generated object inventory & logic extraction
│   │   ├── plsql/          # Generated PL/SQL packages
│   │   ├── apex/           # APEX app export (f*.sql) or build scripts
│   │   └── report/         # AI-generated modernization report
│   └── maintain/           # Path 2: AI-assisted maintenance
│       ├── input/          # Same source files (Forms XML / PL/SQL)
│       ├── docs/           # AI-generated module documentation
│       ├── tests/          # Unit/regression test scaffolding
│       ├── explanations/   # Plain-language trigger explanations
│       └── tickets/        # Ticket → suggested fix diffs
├── shared/
│   ├── db/                 # Wallet config notes, seed SQL, tnsnames snippet
│   └── scripts/            # Shared utility scripts (SQLcl runners, etc.)
├── presentation/           # Slide deck source + speaker notes
├── docs/
│   └── setup.md            # This file
└── CLAUDE.md
```

---

## Quick-start checklist

- [ ] Oracle Cloud account created (Always Free)
- [ ] Autonomous Database provisioned, wallet downloaded
- [ ] SQLcl installed and connected to DB
- [ ] VS Code + Oracle SQL Developer Extension installed
- [ ] DB connection created in VS Code extension
- [ ] MCP server enabled in extension settings
- [ ] `.claude/settings.json` pointing at MCP server
- [ ] Claude Code verified: can list schema tables via MCP
- [ ] Summit schema loaded (APEX Sample App or SQL scripts)
- [ ] APEX workspace created and accessible

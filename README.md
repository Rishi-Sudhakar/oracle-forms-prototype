# Oracle Forms Modernization Prototype

Prototype demonstrating two AI-assisted approaches for legacy Oracle Forms applications,
built to present to a client considering a move to Oracle Cloud Infrastructure and Oracle
AI Database 26ai.

Everything here is **Step 3** of a three-step engagement:

1. Migrate EBS from on-premises to OCI (lift-and-shift, no app changes)
2. Upgrade the underlying database to Oracle AI Database 26ai
3. **This prototype** — application-layer modernization on top of the migrated platform

---

## Two Paths

| Path | What it does |
|------|-------------|
| **Modernize** | Extract PL/SQL business logic from Forms XML, then rebuild the UI in Oracle APEX |
| **Maintain** | Keep Forms as-is; use AI to generate docs, explain triggers, write tests, suggest fixes |

Both paths run against a live Oracle Autonomous Database via an MCP server, so the AI
agent can query the real schema rather than working from copy-pasted context.

---

## Agentic Pipeline (Step 3 Core)

The `apps/pipeline/` directory is a Python backend that orchestrates a multi-framework
AI pipeline for analyzing Oracle Forms modules and generating modernized web applications.

### Framework Stack

| Framework | Role |
|-----------|------|
| **LangGraph** | Directed state graph — 5 nodes, deterministic control flow |
| **LlamaIndex** | Indexes all PL/SQL triggers and program units; answers semantic queries without embeddings |
| **Autogen** | Two-agent review (Risk Analyst + Migration Strategist) using conversation history |
| **Claude Opus 4.8** | LLM for all agent calls; adaptive thinking enabled throughout |

### Pipeline Flow

```
Input (Forms XML + schema SQL)
        |
        v
[Node 1] parse_forms
  XML parser (ported from oracle-forms-mcp + fmb2txt)
  Extracts: blocks, items, triggers, program units, LOVs
        |
        v
[Node 2] parallel_analyze   <-- 4 Claude agents via asyncio.gather
  trigger_agent   Classify trigger risk and complexity
  block_agent     Map blocks, fields, and table relationships
  plsql_agent     Categorize program units, flag reusable logic
  risk_agent      Detect Forms builtins, SYNCHRONIZE calls, session-state patterns
        |
        v
[Node 3] llama_enrich
  Build SimpleKeywordTableIndex over all PL/SQL code
  Query 1: critical migration patterns (SYNCHRONIZE, :SYSTEM.*, UI coupling)
  Query 2: business logic summary (validation rules, transaction workflows)
        |
        v
[Node 4] autogen_review
  Risk Analyst agent:       identify top 3 migration risks
  Migration Strategist:     recommend Automate / Partial / Manual + rationale
  Agents share conversation history via direct Anthropic SDK calls
        |
        v
[Node 5] build_report
  Static analysis: automation score (0-100), cyclomatic complexity, semantic patterns
  Assembles final JSON: modules, score, intervention items, stats, all agent outputs
        |
        v
Final Analysis JSON  -->  POST /api/modernize
                               |
                               v
                     StreamingResponse
                     Claude Opus 4.8 generates a complete
                     self-contained HTML application from
                     the analysis + original XML (up to 32k tokens)
```

### Automation Score

Starts at 100 and deducts for migration risk signals:

- Each Forms builtin detected: -4
- Complex trigger: -15, moderate trigger: -5
- CRITICAL semantic pattern (e.g. SYNCHRONIZE): -15
- HIGH pattern (cross-entity DML, session state): -10
- IMPORTANT pattern (GLOBAL vars, SHOW_ALERT): -8
- Score is clamped between 5 and 95

A score above 70 means the form is a strong automation candidate. Below 40 means
significant manual review is needed before migration.

---

## Running the Prototype

### Prerequisites

- Node.js 18+
- Python 3.11+
- An Anthropic API key

### 1. Install Node dependencies

```bash
npm install
```

### 2. Set up the Python pipeline server

```bash
cd apps/pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Set your API key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Or create `apps/pipeline/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Start everything

**Option A — run both together:**

```bash
npm run dev:all
```

This uses `concurrently` to start the Vite dev server (port 5173) and the Python
pipeline API (port 3001) in a single terminal.

**Option B — run separately:**

```bash
# Terminal 1 — frontend
npm run dev

# Terminal 2 — pipeline API
cd apps/pipeline
source .venv/bin/activate
uvicorn main:app --port 3001 --reload
```

### 5. Open the app

Navigate to `http://localhost:5173`

The landing page is the Oracle EBS Console replica. Click **AI PIPELINE** in the header
to reach the 5-step pipeline UI.

---

## Pipeline UI — Step by Step

| Step | What happens |
|------|-------------|
| **1. Upload** | Drop a `.fmb` XML export (or `.zip` containing one) and optionally a `.sql` schema file. A built-in sample (ONLINE_BANKING_MAIN) is available with one click. |
| **2. Analyzing** | The LangGraph graph runs. Progress updates stream from the backend. |
| **3. Review** | Automation score, stats, parallel agent summaries, Autogen risk review, and intervention items table. Add reviewer notes before generating. |
| **4. Generating** | Claude streams the modernized HTML application in real time. Character and line counts update live. |
| **5. Done** | Preview the app in a new tab or download the `.html` file. |

---

## API Endpoints

The pipeline server runs at `http://localhost:3001`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Stack info and health check |
| `POST` | `/api/analyze` | Run full LangGraph pipeline; returns analysis JSON |
| `POST` | `/api/modernize` | Stream modernized HTML via Claude Opus 4.8 |

`/api/analyze` request body:

```json
{
  "xmlContent": "<Forms_Module ...>...</Forms_Module>",
  "sqlContent": "CREATE TABLE CUSTOMERS (...);"
}
```

`/api/modernize` request body:

```json
{
  "xmlContent": "...",
  "sqlContent": "...",
  "analysis": { },
  "comments": "Optional reviewer notes"
}
```

---

## Repo Structure

```
apps/
  pipeline/           Python FastAPI + LangGraph pipeline server
    main.py             FastAPI app, /api/analyze and /api/modernize endpoints
    graph.py            LangGraph StateGraph (5 nodes)
    services/
      forms_parser.py   Oracle Forms XML parser
      forms_analysis.py Static analysis: builtins, complexity, semantic patterns
      logic_index.py    LlamaIndex PL/SQL indexing and querying
      autogen_review.py Autogen multi-agent review (Risk Analyst + Strategist)
    requirements.txt
  web/                React + TypeScript frontend (Vite)
    src/pages/
      EBSConsole.tsx    Oracle EBS landing page replica
      AgentPipeline.tsx 5-step pipeline UI
      Dashboard.tsx     Modernization analysis dashboard
      AuditConsole.tsx  Galent audit console
      LegacyReplica.tsx Oracle Forms legacy UI replica
      AccountOpening.tsx, CheckStatus.tsx, ManagerApproval.tsx
                        Live ORDS-backed modernized screens
  api/                Node.js stub (superseded by apps/pipeline/)
docs/
  setup.md            Oracle Cloud + MCP server setup guide
shared/               DB config, seed SQL
presentation/         Slide deck
```

---

## MCP Server (Live DB Queries)

For demos against a real Oracle schema, the Oracle SQL Developer Extension for VS Code
ships a built-in MCP server. When enabled, Claude Code can query the live schema directly
rather than working from pasted DDL.

See [`docs/setup.md`](docs/setup.md) for full setup instructions.

---

## Key Constraints

These are intentional limitations to call out during any demo, not bugs:

- Forms Program Units mix auth, validation, process, and UI logic. The generated APEX app
  splits these structurally but will need manual review for complex business rules.
- Forms-specific PL/SQL calls (`SYNCHRONIZE`, `GO_BLOCK`, etc.) have no APEX equivalent
  and are flagged in the intervention items table.
- The automation score is a signal, not a guarantee. A score of 80 means the form is
  a good candidate; it does not mean zero manual work.
- LlamaIndex uses `SimpleKeywordTableIndex` (no vector embeddings required). Query depth
  is shallower than a vector search but avoids any embedding model dependency.

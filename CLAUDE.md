# Oracle Forms Modernization & AI-Assisted Maintenance Prototype

## Goal
Build a working prototype demonstrating two AI-assisted approaches for handling a legacy
Oracle Forms application, to present to leadership by **July 8**. This is being built as a
potential offering/capability (not for our own internal systems).

Two paths to demonstrate side by side:

1. **Modernization path** — Forms → APEX
   Use AI to analyze a legacy Oracle Forms module, extract reusable business logic into
   PL/SQL, and assist in rebuilding the front end in Oracle APEX.

2. **Maintenance path** — keep Forms as-is, use AI to help maintain it
   Use AI to generate documentation, explain existing PL/SQL/trigger logic, generate
   regression/unit tests, and suggest fixes for tickets — without migrating anything.

## Deliverables (due July 8)
- [ ] Short presentation covering both approaches, the tooling, and trade-offs
- [ ] Working prototype demonstrating both flows against a sample Forms app
- [ ] Rough notes on how this could be packaged as an offering

## Background / Why
- Oracle Forms is aging (10–25 years old in most real deployments), losing browser
  compatibility, and the developer talent pool is shrinking.
- Full automated migration is NOT solved end-to-end — no tool reliably extracts business
  logic from stateful triggers/packages with runtime-dependent branching. Automation works
  well for simple, structurally consistent forms; complex ones need a human in the loop.
- "Modernization" (improve/replace UI, keep or refactor logic) and "migration" (full
  platform move) are distinct; we're prototyping modernization via APEX, not a full
  rewrite to Java/.NET.
- AI-assisted maintenance (no migration) is a separate, lower-risk, faster-to-demo track:
  docs, test generation, code explanation, ticket-driven fixes.

## Reference Workflow (Modernization Path)
This follows Oracle's own published pattern (Oracle APEX team / `oracle-forms-migration.agent.md`):

1. Export legacy Forms module (`.fmb`) to XML (via Forms Builder)
2. AI agent parses Forms XML, validates referenced DB objects against target schema
3. Agent identifies reusable business logic embedded in the form
4. Agent generates a PL/SQL package from that logic
5. Business logic now lives in the DB, reusable from APEX
6. Rebuild UI in Oracle APEX, wiring to the new PL/SQL package
7. Agent produces a modernization report / migration notes

Known hard limits to call out in the presentation (don't overclaim):
- Forms Program Units mix conditions/auth/process/validation — APEX needs these split
  into clearly defined logical areas, not a 1:1 drop-in
- Forms-specific PL/SQL (e.g. SYNCHRONIZE) has no APEX equivalent
- Rebuilt APEX apps will look/behave differently — expect manual adjustment
- Deep logic in triggers/packages with session-state side effects should be
  reviewed by a human, not blindly automated

## Reference Workflow (Maintenance Path)
1. Point an AI coding agent (Claude Code / Claude via MCP) at existing Forms/PL-SQL source
2. Generate up-to-date documentation per module/package
3. Generate regression/unit test scaffolding for existing PL/SQL procedures
4. Use the agent to explain unfamiliar/undocumented trigger logic in plain language
5. (Stretch) Tie into a ticket (Jira-style) to generate a suggested fix/diff for review

## Tooling / Environment
- **Database**: Oracle Cloud Always Free tier — Autonomous Database (23ai-based)
- **Sample legacy app**: Oracle's Summit Sample Forms application (or another known
  test .fmb) — avoids needing access to a real proprietary system for the prototype
- **DB access for AI**: SQLcl / Oracle SQL Developer Extension for VS Code — ships an
  MCP server, auto-exposes schema/tools to any MCP-compatible client based on DB roles
- **Coding agent**: Claude Code, connected to the MCP server so it can query the live
  schema directly instead of copy-pasted context
- **Modernization target**: Oracle APEX (free with any Oracle DB license, incl. free tier)
- **Optional/advanced**: Oracle AI Database Private Agent Factory — no-code agent/tool
  orchestration layer on top of the same DB, useful for showing the governance/tool-
  registration side (`DBMS_CLOUD_AI_AGENT.CREATE_TOOL`) rather than raw DB credentials

## Constraints
- Free-tier resources only for this prototype (no paid Oracle licenses)
- Timeline: working prototype + presentation by July 8
- Data: use sample/public Forms app only, not real client/production data, unless
  explicitly cleared by data governance
- Prototype should be able to show BOTH paths, even if one is deeper than the other —
  maintenance path is the safer fallback for a guaranteed demo if time runs short

## Open Questions
- Which sample Forms module gives the best "wow factor" for a demo (some business logic,
  not trivial, but not so complex it can't be handled in the time available)?
- How deep should the APEX rebuild go — one screen, or full CRUD flow?
- Do we want a live demo (agent running against DB in real time) or a recorded/canned
  walkthrough for the presentation, as a fallback if live demos are risky?

## Working Agreement for Claude Code
- Read this file at the start of every session.
- Before writing code, propose a folder structure and step-by-step plan.
- Flag clearly when something is a genuine automation win vs. something that needs a
  human review step — don't overstate what's fully automated, especially for the
  presentation content.
- Keep the two paths (modernize / maintain) in separate folders so they can be
  demoed independently.

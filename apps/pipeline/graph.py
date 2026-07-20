"""
LangGraph pipeline for Oracle Forms analysis.
Stages:
  START -> parse_forms -> parallel_analyze -> aggregate -> llama_enrich -> autogen_review -> build_report -> END

parallel_analyze runs 4 Claude agents concurrently via asyncio.gather:
  trigger_agent | block_agent | plsql_agent | risk_agent
"""

import asyncio
import json
import os
from typing import Any, Optional, TypedDict

from anthropic import AsyncAnthropic
from langgraph.graph import StateGraph, START, END

from services.forms_parser import parse_oracle_forms_xml, get_all_plsql
from services.forms_analysis import (
    detect_forms_builtins,
    detect_semantic_patterns,
    calculate_complexity,
    calculate_automation_score,
    build_intervention_items,
    build_stats,
    classify_program_unit,
    generate_trigger_responsibility,
    calculate_trigger_impact,
)
from services.logic_index import build_plsql_index, query_critical_patterns, query_business_logic_summary
from services.autogen_review import conduct_review


class PipelineState(TypedDict):
    xml_content: str
    sql_content: str
    form_module: dict
    trigger_analysis: dict
    block_analysis: dict
    plsql_analysis: dict
    risk_analysis: dict
    llama_context: str
    autogen_review: dict
    final_analysis: dict
    agent_log: list[str]


_async_client = AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


def _log(state: PipelineState, msg: str) -> list[str]:
    return state.get("agent_log", []) + [msg]


async def _claude_json(prompt: str, max_tokens: int = 3000) -> dict:
    """Call Claude and parse the JSON response."""
    msg = await _async_client.messages.create(
        model="claude-opus-4-8",
        max_tokens=max_tokens,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": prompt}],
    )
    text = next((c.text for c in msg.content if c.type == "text"), "{}")
    # Extract JSON from possible markdown fences
    import re
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    else:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1:
            text = text[start : end + 1]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw_response": text}


# ─────────────────────────────────────────────
# Node 1: Parse Oracle Forms XML
# ─────────────────────────────────────────────

def parse_forms_node(state: PipelineState) -> dict:
    log = _log(state, "LangGraph: parse_forms node started")
    try:
        form_module = parse_oracle_forms_xml(state["xml_content"])
        triggers = form_module.get("triggers", [])
        blocks = form_module.get("blocks", [])
        pus = form_module.get("program_units", [])
        log.append(
            f"Forms parsed: module={form_module.get('name')} | "
            f"{len(blocks)} blocks | {len(triggers)} triggers | {len(pus)} program units"
        )
    except Exception as exc:
        form_module = {"name": "PARSE_ERROR", "blocks": [], "triggers": [], "program_units": []}
        log.append(f"XML parse error (using empty module): {exc}")

    return {"form_module": form_module, "agent_log": log}


# ─────────────────────────────────────────────
# Node 2: 4 parallel Claude agents
# ─────────────────────────────────────────────

async def parallel_analyze_node(state: PipelineState) -> dict:
    form_module = state["form_module"]
    log = _log(state, "LangGraph: parallel_analyze node - launching 4 agents concurrently")

    triggers = form_module.get("triggers", [])
    blocks = form_module.get("blocks", [])
    program_units = form_module.get("program_units", [])
    sql_content = state.get("sql_content", "")

    trigger_summary = "\n".join(
        f"  {t['name']} [{t['level']}]: {t['decoded_text'][:200]}" for t in triggers[:10]
    ) or "No triggers found."

    block_summary = "\n".join(
        f"  {b['name']} (table: {b.get('table_name','?')}): {len(b.get('items', []))} fields"
        for b in blocks
    ) or "No blocks found."

    pu_summary = "\n".join(
        f"  {u['name']} ({u.get('unit_type','Procedure')}):\n{u['decoded_text'][:300]}"
        for u in program_units[:5]
    ) or "No program units found."

    all_code = "\n\n".join(t.get("decoded_text", "") for t in triggers) + "\n\n" + pu_summary

    async def trigger_agent() -> dict:
        prompt = f"""Analyze these Oracle Forms triggers for migration assessment.
Return JSON only:
{{
  "trigger_count": {len(triggers)},
  "high_risk_triggers": ["name list"],
  "total_forms_builtins": 0,
  "most_complex_trigger": "name",
  "summary": "2 sentence summary"
}}

TRIGGERS:
{trigger_summary}"""
        return await _claude_json(prompt)

    async def block_agent() -> dict:
        prompt = f"""Analyze these Oracle Forms blocks and fields.
Return JSON only:
{{
  "block_count": {len(blocks)},
  "total_fields": 0,
  "required_fields": 0,
  "tables_referenced": ["table_name"],
  "blocks": [{{"name": "...", "field_count": 0, "has_complex_validation": false}}],
  "summary": "2 sentence summary"
}}

BLOCKS:
{block_summary}

DATABASE SCHEMA:
{sql_content[:3000]}"""
        return await _claude_json(prompt)

    async def plsql_agent() -> dict:
        prompt = f"""Analyze these Oracle Forms PL/SQL program units.
Return JSON only:
{{
  "unit_count": {len(program_units)},
  "classifications": [{{"name": "...", "category": "...", "complexity": 0}}],
  "high_complexity_count": 0,
  "reusable_logic": ["what can be extracted to PL/SQL packages"],
  "summary": "2 sentence summary"
}}

PROGRAM UNITS:
{pu_summary}"""
        return await _claude_json(prompt)

    async def risk_agent() -> dict:
        prompt = f"""Detect Oracle Forms migration risks and semantic patterns in this code.
Return JSON only:
{{
  "critical_patterns": ["list of critical risks"],
  "synchronize_calls": 0,
  "system_references": ["list :SYSTEM.* references found"],
  "forms_builtins_found": ["list of Forms builtins found"],
  "migration_difficulty": "easy|moderate|complex|very_complex",
  "summary": "2 sentence risk summary"
}}

CODE:
{all_code[:5000]}"""
        return await _claude_json(prompt)

    results = await asyncio.gather(
        trigger_agent(),
        block_agent(),
        plsql_agent(),
        risk_agent(),
        return_exceptions=True,
    )

    def safe(r: Any, fallback: dict) -> dict:
        return r if isinstance(r, dict) else fallback

    t_result = safe(results[0], {"summary": str(results[0]) if isinstance(results[0], Exception) else ""})
    b_result = safe(results[1], {"summary": ""})
    p_result = safe(results[2], {"summary": ""})
    r_result = safe(results[3], {"summary": ""})

    log.append(f"trigger_agent: {t_result.get('summary','done')}")
    log.append(f"block_agent: {b_result.get('summary','done')}")
    log.append(f"plsql_agent: {p_result.get('summary','done')}")
    log.append(f"risk_agent: {r_result.get('migration_difficulty','done')}")

    return {
        "trigger_analysis": t_result,
        "block_analysis": b_result,
        "plsql_analysis": p_result,
        "risk_analysis": r_result,
        "agent_log": log,
    }


# ─────────────────────────────────────────────
# Node 3: LlamaIndex enrichment
# ─────────────────────────────────────────────

async def llama_enrich_node(state: PipelineState) -> dict:
    log = _log(state, "LangGraph: llama_enrich node - building PL/SQL index")
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")

    try:
        _index, query_engine = build_plsql_index(state["form_module"], api_key=api_key)
        if query_engine is None:
            log.append("LlamaIndex: not installed, skipping enrichment")
            return {"llama_context": "LlamaIndex not available.", "agent_log": log}

        log.append("LlamaIndex: index built - querying for critical patterns")
        critical_ctx = await query_critical_patterns(query_engine, log_fn=lambda m: log.append(m))
        biz_ctx = await query_business_logic_summary(query_engine, log_fn=lambda m: log.append(m))
        context = f"CRITICAL PATTERNS:\n{critical_ctx}\n\nBUSINESS LOGIC:\n{biz_ctx}"
        log.append("LlamaIndex: enrichment complete")
    except Exception as exc:
        context = f"LlamaIndex enrichment error: {exc}"
        log.append(f"LlamaIndex error: {exc}")

    return {"llama_context": context, "agent_log": log}


# ─────────────────────────────────────────────
# Node 4: Autogen multi-agent review
# ─────────────────────────────────────────────

async def autogen_review_node(state: PipelineState) -> dict:
    log = _log(state, "LangGraph: autogen_review node - multi-agent review starting")

    form_module = state["form_module"]
    all_patterns: list[dict] = []
    for t in form_module.get("triggers", []) + [
        {"decoded_text": pu.get("decoded_text", "")} for pu in form_module.get("program_units", [])
    ]:
        all_patterns.extend(detect_semantic_patterns(t.get("decoded_text", "")))

    intervention_items = build_intervention_items(form_module, all_patterns)
    automation_score = calculate_automation_score(form_module, all_patterns)

    static_analysis = {
        "interventionItems": intervention_items,
        "automationScore": automation_score,
    }

    try:
        loop = asyncio.get_event_loop()
        review = await loop.run_in_executor(
            None,
            lambda: conduct_review(
                form_module,
                static_analysis,
                llama_context=state.get("llama_context", ""),
                log_fn=lambda m: log.append(m),
            ),
        )
        log.append("Autogen: review complete")
    except Exception as exc:
        review = {"risk_analyst_findings": f"Autogen error: {exc}", "migration_strategy": ""}
        log.append(f"Autogen error: {exc}")

    return {"autogen_review": review, "agent_log": log}


# ─────────────────────────────────────────────
# Node 5: Build final report
# ─────────────────────────────────────────────

def build_report_node(state: PipelineState) -> dict:
    log = _log(state, "LangGraph: build_report node - assembling final analysis")

    form_module = state["form_module"]
    blocks = form_module.get("blocks", [])
    program_units = form_module.get("program_units", [])

    all_patterns: list[dict] = []
    for t in form_module.get("triggers", []):
        all_patterns.extend(detect_semantic_patterns(t.get("decoded_text", "")))
    for pu in program_units:
        all_patterns.extend(detect_semantic_patterns(pu.get("decoded_text", "")))

    intervention_items = build_intervention_items(form_module, all_patterns)
    automation_score = calculate_automation_score(form_module, all_patterns)
    stats = build_stats(form_module)

    modules = [
        {
            "name": form_module.get("name", "UNKNOWN"),
            "type": "FORM",
            "triggerCount": len(form_module.get("triggers", [])),
            "fieldCount": stats["totalFields"],
        }
    ]

    autogen = state.get("autogen_review", {})

    ta = state.get("trigger_analysis", {})
    ba = state.get("block_analysis", {})
    pa = state.get("plsql_analysis", {})
    ra = state.get("risk_analysis", {})

    summary_parts = []
    if ta.get("summary"): summary_parts.append(ta["summary"])
    if ra.get("summary"): summary_parts.append(ra["summary"])
    if autogen.get("migration_strategy"): summary_parts.append(autogen["migration_strategy"])

    summary = " ".join(summary_parts) or (
        f"Analysis of {form_module.get('name')} complete. "
        f"Found {len(intervention_items)} intervention items. "
        f"Automation score: {automation_score}/100."
    )

    final = {
        "modules": modules,
        "automationScore": automation_score,
        "interventionItems": intervention_items,
        "stats": stats,
        "summary": summary,
        "agentLog": state.get("agent_log", []) + log[len(state.get("agent_log", [])):],
        "autogenReview": {
            "riskFindings": autogen.get("risk_analyst_findings", ""),
            "migrationStrategy": autogen.get("migration_strategy", ""),
        },
        "llamaContext": state.get("llama_context", ""),
        "parallelAgentResults": {
            "triggerAgent": ta.get("summary", ""),
            "blockAgent": ba.get("summary", ""),
            "plsqlAgent": pa.get("summary", ""),
            "riskAgent": ra.get("migration_difficulty", ""),
        },
    }

    log.append("Pipeline complete. Final analysis assembled.")
    return {"final_analysis": final, "agent_log": log}


# ─────────────────────────────────────────────
# Compile the graph
# ─────────────────────────────────────────────

def compile_graph():
    workflow = StateGraph(PipelineState)

    workflow.add_node("parse_forms", parse_forms_node)
    workflow.add_node("parallel_analyze", parallel_analyze_node)
    workflow.add_node("llama_enrich", llama_enrich_node)
    workflow.add_node("autogen_review", autogen_review_node)
    workflow.add_node("build_report", build_report_node)

    workflow.add_edge(START, "parse_forms")
    workflow.add_edge("parse_forms", "parallel_analyze")
    workflow.add_edge("parallel_analyze", "llama_enrich")
    workflow.add_edge("llama_enrich", "autogen_review")
    workflow.add_edge("autogen_review", "build_report")
    workflow.add_edge("build_report", END)

    return workflow.compile()

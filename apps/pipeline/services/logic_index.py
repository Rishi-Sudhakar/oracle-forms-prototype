"""
LlamaIndex integration for indexing and querying Oracle Forms PL/SQL code.
Uses SimpleKeywordTableIndex (no embeddings required).
"""

import os
from typing import Optional

try:
    from llama_index.core import SimpleKeywordTableIndex, Document, Settings
    from llama_index.llms.anthropic import Anthropic as AnthropicLLM
    LLAMA_AVAILABLE = True
except ImportError:
    LLAMA_AVAILABLE = False


def build_plsql_index(form_module: dict, api_key: Optional[str] = None):
    """
    Build a LlamaIndex SimpleKeywordTableIndex from all PL/SQL code in the form module.
    Returns (index, query_engine) or (None, None) if llama-index is not installed.
    """
    if not LLAMA_AVAILABLE:
        return None, None

    _api_key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")
    llm = AnthropicLLM(model="claude-opus-4-8", api_key=_api_key, max_tokens=2000)
    Settings.llm = llm

    documents = []

    for t in form_module.get("triggers", []):
        code = t.get("decoded_text", "").strip()
        if not code:
            continue
        level = t.get("level", "FORM")
        block = t.get("block_name") or ""
        item = t.get("item_name") or ""
        loc = f"{level}" + (f" / {block}" if block else "") + (f" / {item}" if item else "")
        documents.append(Document(
            text=f"[TRIGGER: {t['name']} @ {loc}]\n{code}",
            metadata={"name": t["name"], "type": "trigger", "level": level},
            id_=f"trigger_{t['name']}_{level}_{block}",
        ))

    for pu in form_module.get("program_units", []):
        code = pu.get("decoded_text", "").strip()
        if not code:
            continue
        documents.append(Document(
            text=f"[PROGRAM UNIT: {pu['name']} ({pu.get('unit_type', 'Procedure')})]\n{code}",
            metadata={"name": pu["name"], "type": "program_unit", "unit_type": pu.get("unit_type", "")},
            id_=f"pu_{pu['name']}",
        ))

    if not documents:
        return None, None

    index = SimpleKeywordTableIndex.from_documents(documents, show_progress=False)
    query_engine = index.as_query_engine(
        retriever_mode="simple",
        response_mode="compact",
        llm=llm,
    )
    return index, query_engine


async def query_critical_patterns(query_engine, log_fn=None) -> str:
    """Ask LlamaIndex what critical migration patterns exist in the PL/SQL."""
    if query_engine is None:
        return "LlamaIndex not available."
    try:
        result = query_engine.query(
            "What are the most critical Oracle Forms-specific patterns in this code "
            "that will require manual developer attention during APEX migration? "
            "Focus on SYNCHRONIZE, session-state side effects, and UI-coupled logic."
        )
        if log_fn:
            log_fn("LlamaIndex: queried for critical migration patterns")
        return str(result)
    except Exception as e:
        return f"LlamaIndex query failed: {e}"


async def query_business_logic_summary(query_engine, log_fn=None) -> str:
    """Ask LlamaIndex to summarize the core business logic."""
    if query_engine is None:
        return "LlamaIndex not available."
    try:
        result = query_engine.query(
            "Summarize the core business logic: what data does this form validate, "
            "what database operations does it perform, and what are the key transaction workflows?"
        )
        if log_fn:
            log_fn("LlamaIndex: queried for business logic summary")
        return str(result)
    except Exception as e:
        return f"LlamaIndex query failed: {e}"

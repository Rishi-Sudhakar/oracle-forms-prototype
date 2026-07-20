"""
FastAPI server for the Oracle Forms AI Pipeline.
Replaces apps/api/index.mjs with a Python backend using LangGraph + LlamaIndex + Autogen.

Endpoints:
  GET  /api/health         - health check
  POST /api/analyze        - run full LangGraph pipeline, return analysis JSON
  POST /api/modernize      - stream generated HTML via Claude Opus 4.8
"""

import asyncio
import os
from contextlib import asynccontextmanager

from anthropic import AsyncAnthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

from graph import compile_graph

_graph = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _graph
    _graph = compile_graph()
    yield


app = FastAPI(title="Oracle Forms AI Pipeline", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_async_anthropic = AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))


class AnalyzeRequest(BaseModel):
    xmlContent: str
    sqlContent: str = ""


class ModernizeRequest(BaseModel):
    xmlContent: str
    sqlContent: str = ""
    analysis: dict = {}
    comments: str = ""


@app.get("/api/health")
def health():
    return {"status": "ok", "stack": ["LangGraph", "LlamaIndex", "Autogen", "Claude Opus 4.8"]}


@app.post("/api/analyze")
async def analyze(body: AnalyzeRequest):
    if not body.xmlContent.strip():
        raise HTTPException(status_code=400, detail="xmlContent is required")

    initial_state = {
        "xml_content": body.xmlContent,
        "sql_content": body.sqlContent,
        "form_module": {},
        "trigger_analysis": {},
        "block_analysis": {},
        "plsql_analysis": {},
        "risk_analysis": {},
        "llama_context": "",
        "autogen_review": {},
        "final_analysis": {},
        "agent_log": ["Pipeline started"],
    }

    try:
        result = await _graph.ainvoke(initial_state)
        return result["final_analysis"]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/modernize")
async def modernize(body: ModernizeRequest):
    if not body.xmlContent.strip():
        raise HTTPException(status_code=400, detail="xmlContent is required")

    analysis = body.analysis
    high_items = [i for i in analysis.get("interventionItems", []) if i.get("severity") == "HIGH"]
    score = analysis.get("automationScore", 0)
    modules = analysis.get("modules", [])
    module_names = ", ".join(m.get("name", "") for m in modules)
    stats = analysis.get("stats", {})

    prompt = f"""You are modernizing an Oracle Forms application to a self-contained HTML web application.

ANALYSIS RESULTS:
- Module(s): {module_names}
- Automation score: {score}/100
- Summary: {analysis.get('summary', '')}
- Total triggers: {stats.get('totalTriggers', 0)}
- Total fields: {stats.get('totalFields', 0)}
- Tables referenced: {', '.join(stats.get('tablesReferenced', []))}

AUTOGEN REVIEW:
Risk findings: {analysis.get('autogenReview', {}).get('riskFindings', 'N/A')[:500]}
Migration strategy: {analysis.get('autogenReview', {}).get('migrationStrategy', 'N/A')[:300]}

HIGH SEVERITY ITEMS REQUIRING WARNINGS ({len(high_items)}):
{chr(10).join(f'  * {i["description"]}: {i["reason"]}' for i in high_items[:5]) or '  (none)'}

HUMAN REVIEWER NOTES:
{body.comments.strip() or 'No notes provided.'}

ORACLE FORMS XML (first 40000 chars):
{body.xmlContent[:40000]}

DATABASE SCHEMA SQL:
{body.sqlContent[:15000]}

GENERATION REQUIREMENTS:
1. Return a COMPLETE, self-contained single-page HTML application
2. All CSS and JavaScript must be inline - no external CDN imports
3. Replicate every form block, field, button, and navigation element from the XML
4. Implement trigger validation logic as JavaScript (email format, required fields, min/max, business rules)
5. Include a sticky banner at the very top: "MODERNIZED FROM ORACLE FORMS BY AI AGENT | LangGraph + LlamaIndex + Autogen"
6. If HIGH severity items exist, show a dismissible amber warning panel listing each one with the APEX consideration
7. Professional, clean UI with sidebar navigation if multiple blocks exist
8. Submit buttons should show a success/error toast message via JavaScript
9. Include a footer showing: "Generated from {module_names} | Automation score: {score}/100"
10. The app must feel like a real working web application

Return ONLY the HTML starting with <!DOCTYPE html>. No explanation, no markdown code fences."""

    async def stream_html():
        async with _async_anthropic.messages.stream(
            model="claude-opus-4-8",
            max_tokens=32000,
            thinking={"type": "adaptive"},
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            async for event in stream:
                if (
                    event.type == "content_block_delta"
                    and event.delta.type == "text_delta"
                ):
                    yield event.delta.text

    return StreamingResponse(stream_html(), media_type="text/plain; charset=utf-8")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3001, reload=True)

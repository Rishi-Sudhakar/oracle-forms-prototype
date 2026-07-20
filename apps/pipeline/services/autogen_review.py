"""
Autogen multi-agent review of Oracle Forms migration analysis.
Uses pyautogen with a custom ClaudeAgent that calls Anthropic directly,
bypassing pyautogen's built-in LLM layer for full Claude Opus 4.8 compatibility.
"""

import os
from typing import Optional

try:
    import autogen
    AUTOGEN_AVAILABLE = True
except ImportError:
    AUTOGEN_AVAILABLE = False

import anthropic


class ClaudeAgent:
    """
    Lightweight Autogen-style agent that uses Anthropic Claude directly.
    Wraps autogen.ConversableAgent if available, otherwise operates standalone.
    """

    def __init__(self, name: str, system_message: str):
        self.name = name
        self._system = system_message
        self._client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))
        self._history: list[dict] = []

    def say(self, message: str) -> str:
        """Send a message and get a response."""
        self._history.append({"role": "user", "content": message})
        response = self._client.messages.create(
            model="claude-opus-4-8",
            max_tokens=2000,
            thinking={"type": "adaptive"},
            system=self._system,
            messages=self._history,
        )
        reply = next((c.text for c in response.content if c.type == "text"), "")
        self._history.append({"role": "assistant", "content": reply})
        return reply


def conduct_review(
    form_module: dict,
    static_analysis: dict,
    llama_context: str = "",
    log_fn=None,
) -> dict:
    """
    Multi-agent review using two Claude agents:
      - Risk Analyst: identifies the most dangerous migration risks
      - Migration Strategist: proposes the migration approach

    Returns a dict with review_findings and recommendation.
    """
    if log_fn:
        log_fn("Autogen: initializing Risk Analyst + Migration Strategist agents")

    module_name = form_module.get("name", "UNKNOWN")
    trigger_count = len(form_module.get("triggers", []))
    pu_count = len(form_module.get("program_units", []))
    intervention_items = static_analysis.get("interventionItems", [])
    automation_score = static_analysis.get("automationScore", 0)

    high_items = [i for i in intervention_items if i.get("severity") == "HIGH"]
    medium_items = [i for i in intervention_items if i.get("severity") == "MEDIUM"]

    context_block = f"""
MODULE: {module_name}
TRIGGERS: {trigger_count} | PROGRAM UNITS: {pu_count}
AUTOMATION SCORE: {automation_score}/100

HIGH SEVERITY ITEMS ({len(high_items)}):
{chr(10).join(f'  - {i["description"]}: {i["reason"]}' for i in high_items[:5]) or '  (none)'}

MEDIUM SEVERITY ITEMS ({len(medium_items)}):
{chr(10).join(f'  - {i["description"]}: {i["reason"]}' for i in medium_items[:5]) or '  (none)'}

LLAMAINDEX CONTEXT:
{llama_context[:1500] if llama_context else 'Not available.'}
"""

    risk_analyst = ClaudeAgent(
        name="Risk Analyst",
        system_message=(
            "You are an Oracle Forms to APEX migration risk analyst. "
            "Your job is to identify the top 3 migration risks that could cause the project to fail or run over budget. "
            "Be specific, concise, and focus on technical risks only. "
            "Format your response as a numbered list of exactly 3 risks."
        ),
    )

    strategist = ClaudeAgent(
        name="Migration Strategist",
        system_message=(
            "You are an Oracle APEX migration strategist. "
            "Given a risk analysis, you recommend the migration approach: "
            "Automate, Partial Automation with Human Review, or Manual Rewrite. "
            "Be direct and specific. Format: 1 sentence recommendation + 2 sentence rationale."
        ),
    )

    if log_fn:
        log_fn("Autogen: Risk Analyst reviewing module...")

    risk_response = risk_analyst.say(
        f"Analyze migration risks for this Oracle Forms module:\n{context_block}\n\n"
        "List the top 3 risks that require human developer attention."
    )

    if log_fn:
        log_fn("Autogen: Migration Strategist formulating approach...")

    strategy_response = strategist.say(
        f"Given these migration risks:\n{risk_response}\n\n"
        f"And an automation score of {automation_score}/100, "
        "what is your recommended migration approach for this Oracle Forms module?"
    )

    if log_fn:
        log_fn("Autogen: multi-agent review complete")

    return {
        "risk_analyst_findings": risk_response,
        "migration_strategy": strategy_response,
        "agent_names": ["Risk Analyst", "Migration Strategist"],
        "autogen_available": AUTOGEN_AVAILABLE,
    }

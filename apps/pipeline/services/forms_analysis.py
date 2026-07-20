"""
Static analysis of Oracle Forms PL/SQL code.
Ported from forms2fx-app-main TypeScript services:
  - formsBuiltinsService.ts
  - triggerAnalyzer.ts
  - programUnitAnalyzer.ts
  - semanticPatternDetector.ts
  - migrationReadiness.ts
"""

import re
from typing import Any

FORMS_BUILTINS = [
    "GO_BLOCK", "GO_ITEM", "GO_RECORD", "FIRST_RECORD", "NEXT_RECORD",
    "PREVIOUS_RECORD", "LAST_RECORD", "UP", "DOWN",
    "EXECUTE_QUERY", "ENTER_QUERY", "COUNT_QUERY",
    "CLEAR_BLOCK", "CLEAR_FORM", "CLEAR_ITEM", "CLEAR_RECORD",
    "COMMIT_FORM", "POST", "DO_KEY",
    "SYNCHRONIZE", "REDISPLAY", "BELL",
    "SET_ITEM_PROPERTY", "GET_ITEM_PROPERTY", "SET_BLOCK_PROPERTY", "GET_BLOCK_PROPERTY",
    "SET_RECORD_PROPERTY", "GET_RECORD_PROPERTY", "SET_FORM_PROPERTY", "GET_FORM_PROPERTY",
    "SET_WINDOW_PROPERTY", "GET_WINDOW_PROPERTY", "SET_CANVAS_PROPERTY", "GET_CANVAS_PROPERTY",
    "SET_LOV_PROPERTY", "GET_LOV_PROPERTY", "SET_MENU_ITEM_PROPERTY", "GET_MENU_ITEM_PROPERTY",
    "SET_ALERT_PROPERTY", "GET_ALERT_PROPERTY",
    "CREATE_RECORD", "DELETE_RECORD", "DUPLICATE_RECORD", "LOCK_RECORD",
    "SHOW_LOV", "LIST_VALUES", "POPULATE_LIST", "ADD_LIST_ELEMENT", "DELETE_LIST_ELEMENT",
    "CLEAR_LIST", "GET_LIST_ELEMENT_COUNT", "GET_LIST_ELEMENT_VALUE", "GET_LIST_ELEMENT_LABEL",
    "SHOW_ALERT", "SET_ALERT_BUTTON_PROPERTY",
    "MESSAGE", "ERASE",
    "CREATE_TIMER", "DELETE_TIMER", "FIND_TIMER",
    "ENTER", "EXIT_FORM", "NEW_FORM", "CALL_FORM", "OPEN_FORM", "CLOSE_FORM",
    "SHOW_VIEW", "HIDE_VIEW", "SET_VIEW_PROPERTY", "GO_CANVAS", "SHOW_WINDOW", "HIDE_WINDOW",
    "DEFAULT_VALUE", "COPY", "NAME_IN", "COPY_REGION", "CUT_REGION", "PASTE_REGION",
    "HOST", "USER_EXIT", "CALL_OLE", "PAUSE", "PRINT", "RUN_PRODUCT",
    "BLOCK_MENU", "CHECK_RECORD_UNIQUENESS", "DISPLAY_ERROR",
    "ISSUE_ROLLBACK", "ISSUE_SAVEPOINT", "LOGON", "LOGON_SCREEN", "LOGOUT",
]

BUILTIN_REASONS: dict[str, str] = {
    "GO_BLOCK": "Forms navigation logic - not applicable in APEX",
    "GO_ITEM": "Forms navigation logic - not applicable in APEX",
    "GO_RECORD": "Forms navigation logic - not applicable in APEX",
    "FIRST_RECORD": "Forms record navigation - APEX uses Interactive Grid/Report",
    "NEXT_RECORD": "Forms record navigation - APEX uses Interactive Grid/Report",
    "PREVIOUS_RECORD": "Forms record navigation - APEX uses Interactive Grid/Report",
    "LAST_RECORD": "Forms record navigation - APEX uses Interactive Grid/Report",
    "EXECUTE_QUERY": "Forms query execution - APEX uses page refresh or DA",
    "ENTER_QUERY": "Forms query mode - not applicable in APEX",
    "CLEAR_BLOCK": "Forms block clear - use APEX clear process or JS",
    "CLEAR_FORM": "Forms form clear - use APEX page redirect",
    "COMMIT_FORM": "Forms commit - APEX handles via DML processes",
    "POST": "Forms post - APEX handles via DML processes",
    "SYNCHRONIZE": "Forms display sync - not needed in APEX",
    "SET_ITEM_PROPERTY": "Forms item property - use APEX Dynamic Actions",
    "GET_ITEM_PROPERTY": "Forms item property - use APEX_UTIL functions",
    "SET_BLOCK_PROPERTY": "Forms block property - use APEX region settings",
    "MESSAGE": "Forms message - use APEX_APPLICATION.ADD_MESSAGE or JS",
    "DEFAULT": "Forms runtime built-in - not applicable in APEX",
}


def get_builtin_reason(builtin: str) -> str:
    return BUILTIN_REASONS.get(builtin, BUILTIN_REASONS["DEFAULT"])


def detect_forms_builtins(code: str) -> list[str]:
    """Return list of Forms builtins found in PL/SQL code."""
    upper = code.upper()
    found = set()
    for b in FORMS_BUILTINS:
        if re.search(rf"\b{b}\s*[\(;]", upper):
            found.add(b)
    return list(found)


def calculate_logic_depth(code: str) -> str:
    lines = [l for l in code.split("\n") if l.strip() and not l.strip().startswith("--")]
    if_count = len(re.findall(r"\bIF\b", code, re.IGNORECASE))
    loop_count = len(re.findall(r"\b(FOR|WHILE|LOOP)\b", code, re.IGNORECASE))
    score = len(lines) + if_count * 2 + loop_count * 3
    if score > 50:
        return "complex"
    if score > 15:
        return "moderate"
    return "simple"


def calculate_trigger_impact(trigger: dict) -> str:
    code = trigger.get("decoded_text", "")
    upper = code.upper()
    score = 0
    if "COMMIT" in upper: score += 3
    if "ROLLBACK" in upper: score += 2
    if "INSERT INTO" in upper: score += 2
    if "UPDATE" in upper and "SET" in upper: score += 2
    if "DELETE FROM" in upper: score += 2
    name = trigger.get("name", "").upper()
    if any(k in name for k in ("WHEN-NEW-FORM", "PRE-FORM", "WHEN-BUTTON-PRESSED", "ON-COMMIT")):
        score += 2
    if "EXECUTE_QUERY" in upper: score += 1
    if "CLEAR_BLOCK" in upper: score += 1
    lines = [l for l in code.split("\n") if l.strip()]
    if len(lines) > 30: score += 1
    if score >= 5: return "high"
    if score >= 2: return "medium"
    return "low"


def generate_trigger_responsibility(trigger: dict) -> str:
    name = trigger.get("name", "").upper()
    code = trigger.get("decoded_text", "").upper()
    if "PRE-FORM" in name or "WHEN-NEW-FORM" in name:
        return "Initializes form state and prepares the UI when the form loads"
    if "PRE-BLOCK" in name or "WHEN-NEW-BLOCK" in name:
        return "Sets up block-level defaults when entering the block"
    if "PRE-QUERY" in name:
        return "Modifies query criteria before data is retrieved from the database"
    if "POST-QUERY" in name:
        return "Enriches or transforms data after it has been queried"
    if "WHEN-VALIDATE-ITEM" in name or "WHEN-VALIDATE-RECORD" in name:
        return "Validates user input and enforces business rules"
    if "WHEN-BUTTON-PRESSED" in name:
        if "COMMIT" in code or "POST" in code:
            return "Saves data to the database when button is clicked"
        if "DELETE" in code:
            return "Deletes the current record when button is clicked"
        return "Executes custom logic when button is clicked"
    if "PRE-INSERT" in name:
        return "Prepares and validates data before inserting a new record"
    if "POST-INSERT" in name:
        return "Performs follow-up actions after a record has been inserted"
    if "PRE-UPDATE" in name:
        return "Validates and prepares changes before updating a record"
    if "POST-UPDATE" in name:
        return "Performs follow-up actions after a record has been updated"
    if "PRE-DELETE" in name:
        return "Validates and confirms deletion before removing a record"
    if "POST-DELETE" in name:
        return "Performs cleanup actions after a record has been deleted"
    if "ON-COMMIT" in name or "KEY-COMMIT" in name:
        return "Validates all changes and commits the transaction to the database"
    if "WHEN-NEW-RECORD-INSTANCE" in name:
        return "Initializes default values when creating a new record"
    if "WHEN-LIST-CHANGED" in name or "WHEN-CHECKBOX-CHANGED" in name:
        return "Responds to user selection changes and updates dependent fields"
    if "SET_ITEM_PROPERTY" in code or "GO_ITEM" in code:
        return "Controls UI behavior and navigation"
    if "MESSAGE" in code or "SHOW_ALERT" in code:
        return "Displays messages or alerts to the user"
    return "Executes custom business logic"


def classify_program_unit(code: str, unit_type: str) -> str:
    upper = code.upper()
    if any(k in upper for k in ("SET_ITEM_PROPERTY", "GO_ITEM", "GO_BLOCK", "SHOW_VIEW", "HIDE_VIEW")):
        return "UI Logic"
    if any(k in upper for k in ("COMMIT", "ROLLBACK")) or (
        "INSERT INTO" in upper and "VALUES" in upper
    ) or ("UPDATE" in upper and "SET" in upper) or "DELETE FROM" in upper:
        return "Transaction Logic"
    if any(k in upper for k in ("VALIDATE", "CHECK_", "IS_VALID", "RAISE_APPLICATION_ERROR")):
        return "Validation Logic"
    if any(k in upper for k in ("UTL_HTTP", "UTL_FILE", "DBMS_", "WEB_SERVICE")):
        return "Integration Logic"
    if any(k in upper for k in ("CHECK_ACCESS", "AUTHORIZE", "USER_ROLE", "PERMISSION")):
        return "Security/Access Control"
    if any(k in upper for k in ("CALCULATE", "PROCESS", "APPROVE", "SUBMIT", "STATUS")):
        return "Business Logic"
    if unit_type.upper() == "FUNCTION" and any(
        k in upper for k in ("TO_", "GET_", "FORMAT_", "CONVERT_")
    ):
        return "Utility/Helper"
    return "Unknown"


def calculate_complexity(code: str) -> int:
    complexity = 1.0
    if_count = len(re.findall(r"\bIF\b", code, re.IGNORECASE))
    loop_count = len(re.findall(r"\b(FOR|WHILE|LOOP)\b", code, re.IGNORECASE))
    case_count = len(re.findall(r"\bCASE\b", code, re.IGNORECASE))
    complexity += if_count * 0.5
    complexity += loop_count * 1.0
    complexity += case_count * 0.5
    lines = [l for l in code.split("\n") if l.strip() and not l.strip().startswith("--")]
    if len(lines) > 200: complexity += 3
    elif len(lines) > 100: complexity += 2
    elif len(lines) > 50: complexity += 1
    nested_if = len(re.findall(r"IF[\s\S]*?IF[\s\S]*?END IF[\s\S]*?END IF", code, re.IGNORECASE))
    complexity += nested_if * 1.5
    dml = (
        len(re.findall(r"\bINSERT\b", code, re.IGNORECASE))
        + len(re.findall(r"\bUPDATE\b", code, re.IGNORECASE))
        + len(re.findall(r"\bDELETE\b", code, re.IGNORECASE))
    )
    complexity += dml * 0.5
    return min(int(round(complexity)), 10)


def detect_risk_flags(code: str) -> list[str]:
    flags = []
    upper = code.upper()
    for b in ["GO_BLOCK", "GO_ITEM", "EXECUTE_QUERY", "CLEAR_BLOCK", "SYNCHRONIZE",
              "FORMS_OLE", "HOST", "SHOW_LOV", "SET_ITEM_PROPERTY", "GET_ITEM_PROPERTY"]:
        if re.search(rf"\b{b}\b", upper):
            flags.append(f"Forms builtin: {b}")
    if ("INSERT INTO" in upper or "UPDATE" in upper or "DELETE FROM" in upper) and "COMMIT" not in upper:
        flags.append("Direct DML without explicit COMMIT")
    if "EXECUTE IMMEDIATE" in upper:
        flags.append("Dynamic SQL detected")
    if re.search(r"\bUTL_|\bDBMS_", upper):
        flags.append("External package dependencies")
    return flags


def detect_semantic_patterns(code: str) -> list[dict]:
    """
    Detect the 10 semantic patterns from forms2fx semanticPatternDetector.ts.
    Returns list of pattern dicts with severity and apexConsideration.
    """
    lines = code.split("\n")
    upper = code.upper()
    patterns = []

    # 1 - Multi-record processing
    has_loop = bool(re.search(r"\bLOOP\b", upper) and not re.search(r"\bEND\s+LOOP\b", upper))
    has_exit = bool(re.search(r"\b(EXIT|LAST_RECORD|NO_DATA_FOUND|%NOTFOUND)\b", upper))
    has_nav = bool(re.search(r"\b(FIRST_RECORD|NEXT_RECORD|FETCH)\b", upper))
    if has_loop and (has_exit or has_nav):
        patterns.append({
            "id": "multi-record-processing",
            "label": "Multi-Record Processing",
            "severity": "CRITICAL",
            "description": "Procedure processes multiple records in a single invocation.",
            "apexConsideration": "In APEX, use FOR loops with cursors or APEX_COLLECTION for multi-record operations.",
        })

    # 2 - Selection-driven execution
    if re.search(r"\bIF\b.*(SEL|SELECT|SELECTED|CHK|CHECK|FLAG).*[=].*['\"]Y['\"]", upper):
        patterns.append({
            "id": "selection-driven-execution",
            "label": "Selection-Driven Execution",
            "severity": "CRITICAL",
            "description": "Execution depends on user selection of records (SEL = 'Y' pattern).",
            "apexConsideration": "Use Interactive Grid row selection or APEX_COLLECTION to track selected records.",
        })

    # 3 - SYNCHRONIZE calls
    if "SYNCHRONIZE" in upper:
        patterns.append({
            "id": "synchronize-call",
            "label": "SYNCHRONIZE Call",
            "severity": "HIGH",
            "description": "SYNCHRONIZE forces an immediate screen refresh - has no APEX equivalent.",
            "apexConsideration": "Remove SYNCHRONIZE. APEX page rendering is stateless; screen refresh is handled by page load.",
        })

    # 4 - User-decision gated logic
    if re.search(r"\b(SHOW_ALERT|GET_ALERT_PROPERTY|ALERT_BUTTON)\b", upper):
        patterns.append({
            "id": "user-decision-gated-logic",
            "label": "User-Decision-Gated Logic",
            "severity": "IMPORTANT",
            "description": "User confirmation controls business logic flow via Forms ALERT.",
            "apexConsideration": "Use apex.confirm() or apex.message.confirm() in Dynamic Actions before processing.",
        })

    # 5 - Implicit abort flow
    has_goto = bool(re.search(r"\bGOTO\b", upper))
    has_raise = bool(re.search(r"\b(RAISE|RAISE_APPLICATION_ERROR|FORM_TRIGGER_FAILURE)\b", upper))
    if has_goto or has_raise:
        patterns.append({
            "id": "implicit-abort-flow",
            "label": "Implicit Abort / Early-Exit Flow",
            "severity": "IMPORTANT",
            "description": "Procedure uses RAISE or GOTO for early-exit control flow.",
            "apexConsideration": "Replace GOTO with proper exception handling. Use APEX error handling for user feedback.",
        })

    # 6 - Cross-entity side effects
    tables: set[str] = set()
    for m in re.finditer(r"\bUPDATE\s+(\w+)", upper):
        t = m.group(1)
        if t not in ("SET",):
            tables.add(t)
    for m in re.finditer(r"\bINSERT\s+INTO\s+(\w+)", upper):
        tables.add(m.group(1))
    for m in re.finditer(r"\bDELETE\s+FROM\s+(\w+)", upper):
        t = m.group(1)
        if t != "DUAL":
            tables.add(t)
    if len(tables) > 1:
        patterns.append({
            "id": "cross-entity-side-effects",
            "label": "Cross-Entity Side Effects",
            "severity": "CRITICAL",
            "description": f"Coordinates DML across {len(tables)} entities: {', '.join(sorted(tables))}",
            "apexConsideration": "Review transaction boundaries. Use a single API package for coordinated DML.",
        })

    # 7 - State accumulation
    if re.search(r"\bGLOBAL\.\w+", upper) or re.search(r"\bTABLE\s+OF\b|\bVARRAY\b", upper):
        patterns.append({
            "id": "state-accumulation",
            "label": "State Accumulation",
            "severity": "CRITICAL",
            "description": "Uses GLOBAL variables or PL/SQL collections to accumulate state.",
            "apexConsideration": "Use APEX_COLLECTION or application state items for cross-request state.",
        })

    # 8 - :SYSTEM.* references
    if re.search(r":SYSTEM\.", upper):
        patterns.append({
            "id": "system-references",
            "label": "SYSTEM Pseudo-Column References",
            "severity": "HIGH",
            "description": "Uses :SYSTEM.* runtime variables (e.g., :SYSTEM.TRIGGER_ITEM) - no APEX equivalent.",
            "apexConsideration": "Replace :SYSTEM.* references with APEX page item values or Dynamic Action context.",
        })

    # 9 - Mixed responsibilities
    resp_count = 0
    if re.search(r"\bIF\b.*IS\s+(NOT\s+)?NULL\b", upper): resp_count += 1
    if re.search(r"\b(INSERT|UPDATE|DELETE)\b", upper): resp_count += 1
    if re.search(r"\bMESSAGE\b|\bSHOW_ALERT\b", upper): resp_count += 1
    if re.search(r"\bPKG_\w+\.\w+\b", upper): resp_count += 1
    if resp_count >= 3:
        patterns.append({
            "id": "mixed-responsibilities",
            "label": "Mixed Responsibilities",
            "severity": "INFO",
            "description": "Combines validation, DML, messaging, and workflow in a single unit.",
            "apexConsideration": "Consider splitting into validation process, DML process, and feedback Dynamic Actions.",
        })

    return patterns


def calculate_automation_score(form_module: dict, all_patterns: list[dict]) -> int:
    """
    Calculate how much of the migration can be automated (0-100).
    Deducts points for risky patterns. Strict - only simple forms score high.
    """
    score = 100
    triggers = form_module.get("triggers", [])
    program_units = form_module.get("program_units", [])

    for t in triggers:
        code = t.get("decoded_text", "")
        builtins = detect_forms_builtins(code)
        score -= len(builtins) * 4
        depth = calculate_logic_depth(code)
        if depth == "complex": score -= 15
        elif depth == "moderate": score -= 5

    for pu in program_units:
        code = pu.get("decoded_text", "")
        complexity = calculate_complexity(code)
        if complexity >= 8: score -= 12
        elif complexity >= 5: score -= 5

    for p in all_patterns:
        if p["severity"] == "CRITICAL": score -= 15
        elif p["severity"] == "HIGH": score -= 10
        elif p["severity"] == "IMPORTANT": score -= 8

    return max(5, min(95, score))


def build_intervention_items(form_module: dict, all_patterns: list[dict]) -> list[dict]:
    """Build the list of human-review intervention items."""
    items = []

    for p in all_patterns:
        sev = p["severity"]
        if sev == "CRITICAL" or sev == "HIGH":
            norm = "HIGH"
        elif sev == "IMPORTANT":
            norm = "MEDIUM"
        else:
            norm = "LOW"
        items.append({
            "severity": norm,
            "description": p["label"],
            "reason": p.get("apexConsideration") or p.get("description", ""),
        })

    for t in form_module.get("triggers", []):
        builtins = detect_forms_builtins(t.get("decoded_text", ""))
        critical = [b for b in builtins if b in ("SYNCHRONIZE", "HOST", "USER_EXIT", "CALL_OLE")]
        if critical:
            items.append({
                "severity": "HIGH",
                "description": f"Trigger {t['name']}: {', '.join(critical)}",
                "reason": "These Forms builtins have no APEX equivalent and must be manually replaced.",
            })

    for pu in form_module.get("program_units", []):
        risk_flags = detect_risk_flags(pu.get("decoded_text", ""))
        if len(risk_flags) > 2:
            items.append({
                "severity": "MEDIUM",
                "description": f"Program unit {pu['name']}: {len(risk_flags)} risk flags",
                "reason": "; ".join(risk_flags[:3]),
            })

    seen: set[str] = set()
    deduped = []
    for item in items:
        key = item["description"]
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    deduped.sort(key=lambda x: {"HIGH": 0, "MEDIUM": 1, "LOW": 2}[x["severity"]])
    return deduped[:20]


def build_stats(form_module: dict) -> dict:
    triggers = form_module.get("triggers", [])
    blocks = form_module.get("blocks", [])
    program_units = form_module.get("program_units", [])

    total_fields = sum(len(b.get("items", [])) for b in blocks)
    tables = list({b.get("table_name") for b in blocks if b.get("table_name")})

    return {
        "totalTriggers": len(triggers),
        "totalFields": total_fields,
        "plsqlProcedures": len(program_units),
        "tablesReferenced": tables,
        "blockCount": len(blocks),
    }

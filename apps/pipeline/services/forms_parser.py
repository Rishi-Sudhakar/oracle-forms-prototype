"""
Oracle Forms XML parser.
Ports FormsXmlParser.kt (oracle-forms-mcp) + FormsCleanerService.java (fmb2txt).
"""

import re
from xml.etree import ElementTree as ET
from typing import Any

GRAPHICAL_ATTRIBUTES = {
    "XPosition", "YPosition", "Width", "Height", "ForeColor", "BackColor",
    "FontName", "FontSize", "FontStyle", "FontWeight", "FontSpacing",
    "VisualAttributeName", "PromptVisualAttributeName", "Rendered",
    "DistanceBetweenRecords", "ScrollBarOrientation", "ScrollBarWidth",
    "ScrollBarHeight", "ScrollBarXPosition", "ScrollBarYPosition",
    "TopPromptOffset", "BottomPromptOffset", "LeftPromptOffset", "RightPromptOffset",
    "PromptAttachment", "PromptEdge", "PromptEdgeOffset", "PromptAlignment",
    "Justification", "LineSpacing", "SingleObject", "DisplayHint",
    "Arrow", "LineStyle", "DashStyle", "EdgePattern", "CornerStyle",
    "BorderBevelStyle", "BevelWidth", "FrameTitleOffset", "FrameTitle",
    "FrameTitleAlign", "ScrollbarTabPage", "ScrollbarCanvas", "MultiLine",
    "WrapStyle", "Wrap", "CharMode",
}

GRAPHICAL_ELEMENTS = {
    "Coordinate", "Graphics", "VisualAttribute", "ObjectGroup",
    "AttachedLibrary", "Alert",
}


def _safe_parse_xml(xml_content: str) -> ET.Element:
    """Parse XML, fixing common entity escaping issues in Oracle Forms exports."""
    try:
        return ET.fromstring(xml_content)
    except ET.ParseError:
        fixed = re.sub(r"&(?!amp;|lt;|gt;|quot;|apos;|#)", "&amp;", xml_content)
        return ET.fromstring(fixed)


def _decode_plsql(text: str) -> str:
    """Unescape PL/SQL text that may still contain XML entities."""
    if not text:
        return ""
    return (
        text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&apos;", "'")
        .replace("&quot;", '"')
        .strip()
    )


def _parse_trigger(elem: ET.Element, level: str, block_name: str = "", item_name: str = "") -> dict:
    raw = elem.get("TriggerText", "") or elem.text or ""
    return {
        "name": elem.get("Name", ""),
        "level": level,
        "block_name": block_name,
        "item_name": item_name,
        "decoded_text": _decode_plsql(raw),
    }


def _parse_program_unit(elem: ET.Element) -> dict:
    raw = elem.get("ProgramUnitText", "") or elem.text or ""
    return {
        "name": elem.get("Name", ""),
        "unit_type": elem.get("ProgramUnitType", "Procedure"),
        "decoded_text": _decode_plsql(raw),
    }


def _parse_item(item_elem: ET.Element, block_name: str) -> dict:
    item_name = item_elem.get("Name", "")
    item_triggers = [
        _parse_trigger(t, level="ITEM", block_name=block_name, item_name=item_name)
        for t in item_elem.findall("./Trigger")
    ]
    return {
        "name": item_name,
        "item_type": item_elem.get("ItemType", "TEXT"),
        "data_type": item_elem.get("DataType", "CHAR"),
        "column_name": item_elem.get("ColumnName", ""),
        "prompt": item_elem.get("Prompt", ""),
        "required": item_elem.get("Required", "N") == "Y",
        "max_length": item_elem.get("Length", ""),
        "triggers": item_triggers,
    }


def _parse_block(block_elem: ET.Element) -> dict:
    block_name = block_elem.get("Name", "")
    items = [_parse_item(i, block_name) for i in block_elem.findall("./Item")]
    block_triggers = [
        _parse_trigger(t, level="BLOCK", block_name=block_name)
        for t in block_elem.findall("./Trigger")
    ]
    return {
        "name": block_name,
        "table_name": block_elem.get("QueryDataSourceName", "") or block_elem.get("TableName", ""),
        "items": items,
        "triggers": block_triggers,
    }


def parse_oracle_forms_xml(xml_content: str) -> dict[str, Any]:
    """
    Parse Oracle Forms XML export and return a structured module dict.
    Handles FormModule nested under a Module or Forms root element.
    """
    root = _safe_parse_xml(xml_content)

    module: dict[str, Any] = {
        "name": "",
        "version": root.get("Version", ""),
        "blocks": [],
        "triggers": [],
        "program_units": [],
        "lovs": [],
        "canvases": [],
        "windows": [],
        "record_groups": [],
    }

    form_modules = root.findall(".//FormModule")
    if not form_modules:
        if root.tag == "FormModule":
            form_modules = [root]

    for fm in form_modules:
        module["name"] = module["name"] or fm.get("Name", "UNKNOWN_MODULE")

        for t in fm.findall("./Trigger"):
            module["triggers"].append(_parse_trigger(t, level="FORM"))

        for pu in fm.findall("./ProgramUnit"):
            module["program_units"].append(_parse_program_unit(pu))

        for b in fm.findall("./Block"):
            block_data = _parse_block(b)
            for trig in block_data["triggers"]:
                module["triggers"].append(trig)
            for item in block_data["items"]:
                for trig in item["triggers"]:
                    module["triggers"].append(trig)
            module["blocks"].append(block_data)

        for lov in fm.findall("./LOV"):
            module["lovs"].append({"name": lov.get("Name", "")})

        for canvas in fm.findall("./Canvas"):
            module["canvases"].append({
                "name": canvas.get("Name", ""),
                "type": canvas.get("CanvasType", "Content"),
            })

        for window in fm.findall("./Window"):
            module["windows"].append({
                "name": window.get("Name", ""),
                "title": window.get("Title", ""),
            })

        for rg in fm.findall("./RecordGroup"):
            module["record_groups"].append({
                "name": rg.get("Name", ""),
                "query": rg.get("RecordGroupQuery", ""),
            })

    return module


def get_all_plsql(module: dict) -> list[dict]:
    """Flatten all PL/SQL code from triggers and program units."""
    items = []
    for t in module.get("triggers", []):
        if t.get("decoded_text"):
            items.append({"name": t["name"], "type": "trigger", "code": t["decoded_text"]})
    for pu in module.get("program_units", []):
        if pu.get("decoded_text"):
            items.append({"name": pu["name"], "type": "program_unit", "code": pu["decoded_text"]})
    return items

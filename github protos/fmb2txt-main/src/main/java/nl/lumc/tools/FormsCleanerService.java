package nl.lumc.tools;

import org.dom4j.*;
import org.dom4j.io.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import org.apache.commons.text.StringEscapeUtils;  // Add this import

public class FormsCleanerService {
    private static final Set<String> GRAPHICAL_ATTRIBUTES = new HashSet<>(Arrays.asList(
        "XPosition", "YPosition", "Width", "Height", "FontName", "FontSize", "CanvasName", 
        "BackColor", "ForeColor", "PromptFontName", "PromptFontSize", "PromptFontStyle", "Bevel",
        "DistanceBetweenRecords", "ShowScrollbar", "WrapStyle", "Justification", "MouseNavigate",
        "CompressionQuality", "AutoHint", "QueryAllowed", "MultiLine", "LovXPosition", "LovYPosition",
        "QueryLength", "DefaultButton", "DisplayQuality", "EditYPosition", "EditXPosition",
        "ConcealData", "Required", "Iconic", "Hint", "DataType", "CopyValueFromItem", "SizingStyle",
        "KeepCursorPosition", "LockRecord", "UpdateIfNull", "FixedLength", "Prompt", "PromptAttachmentOffset",
        "TabPageName", "PromptAlignOffset", "ItemsDisplay", "ForegroundColor", "FontWeight", "FontStyle",
        "DisplayInKeyboardHelp", "FireInQuery", "PromptFontSpacing", "PromptFontWeight", "Label",
        "CaseInsensitiveQuery", "PromptJustification", "PromptAlign", "WrapStyle", "HorizontalJustification",
        "ScrollBarWidth", "ScrollBarHeight", "Margin", "Padding", "Spacing", "LineHeight", "WordWrap",
        "Overflow", "Alignment", "FontColor", "BorderStyle", "BorderWidth", "BackgroundPattern",
        "DirtyInfo", "VisualAttributeName", "ItemType", "UpdateAllowed", "InsertAllowed",
        "CaseRestriction", "Visible", "ListStyle", "AutoSkip", "KeyboardNavigable", "Enabled",
        "RuntimeComp", "CursorMode", "ValidationUnit", "SavepointMode", "MenuModule", "Use3dControls",
        "MouseNavigationLimit", "ConsoleWindow", "CharacterCellWidth", "DefaultFontScaling", "CoordinateSystem",
        "CharacterCellHeight", "RealUnit", "RecordOrientation", "EnforcedColumnSecurity", "RecordsFetchedCount",
        "DMLDataType", "RecordsDisplayCount", "RecordsBufferedCount",  "DeleteAllowed", "KeyMode",
        "NavigationStyle", "EnforcedPrimaryKey", "LockMode", "ValidateFromList", "CheckBoxOtherValues",
        "ShowHorizontalScrollbar", "ShowVerticalScrollbar", "SubclassObjectGroup", "ResizeAllowed",
        "ProgramUnitType", "MaximizeAllowed", "InheritMenu", "WindowStyle", "ClearAllowed",
        "MinimizeAllowed", "MoveAllowed", "WindowStyle", "FontSpacing", "UncheckedValue",
        "InitializeValue", "PromptDisplayStyle", "InteractionMode", "PromptAttachmentEdge",
        "PromptDisplayStyle", "DMLDataName"
    ));

    private static final Set<String> GRAPHICAL_ELEMENTS = new HashSet<>(Arrays.asList(
        "Coordinate", "VisualAttributeName", "PromptVisualAttributeName", "Graphics",
        "Alert", "AttachedLibrary", "VisualAttribute", "ObjectGroup"
    ));

    public boolean needsCleaning(Path xmlFile, Path txtFile) {
        if (!Files.exists(txtFile)) {
            return true;
        }
        try {
            return Files.getLastModifiedTime(xmlFile).toMillis() > 
                   Files.getLastModifiedTime(txtFile).toMillis();
        } catch (IOException e) {
            return true;
        }
    }

    public void cleanXmlToTxt(Path xmlFile, Path txtFile) throws IOException {
        try {
            SAXReader reader = new SAXReader();
            Document document = reader.read(xmlFile.toFile());
            Element root = document.getRootElement();

            removeNamespaces(document);
            cleanElement(root);
            transformTriggers(root);

            String output = formatToText(root, 0);
            Files.write(txtFile, output.getBytes("UTF-8"), StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (DocumentException e) {
            throw new IOException("Failed to process XML: " + e.getMessage(), e);
        }
    }

    private void removeNamespaces(Document document) {
        for (Iterator<Namespace> it = document.getRootElement().additionalNamespaces().iterator(); it.hasNext();) {
            it.next();
            it.remove();
        }
    }

    private void cleanElement(Element element) {
        // Remove unwanted attributes
        for (Iterator<Attribute> it = element.attributeIterator(); it.hasNext();) {
            Attribute attr = it.next();
            if (GRAPHICAL_ATTRIBUTES.contains(attr.getName()) || 
                Arrays.asList("false", "", "None", "Null").contains(attr.getValue())) {
                it.remove();
            }
        }

        // Remove unwanted elements and clean remaining ones
        for (Iterator<Element> it = element.elementIterator(); it.hasNext();) {
            Element child = it.next();
            if (GRAPHICAL_ELEMENTS.contains(child.getName())) {
                it.remove();
            } else {
                cleanElement(child);
            }
        }
    }

    private void transformTriggers(Element element) {
        for (Element trigger : element.elements("Trigger")) {
            Attribute triggerText = trigger.attribute("TriggerText");
            if (triggerText != null) {
                trigger.setText(unescapeXml(triggerText.getValue()));
                trigger.remove(triggerText);
            }
        }
        for (Element unit : element.elements("ProgramUnit")) {
            Attribute programText = unit.attribute("ProgramUnitText");
            if (programText != null) {
                unit.setText(unescapeXml(programText.getValue()));
                unit.remove(programText);
            }
        }
    }

    private String formatToText(Element element, int level) {
        StringBuilder result = new StringBuilder();
        String indent = repeatString("\t", level);

        result.append(indent).append(element.getName()).append("\r\n");

        // Format attributes
        for (Attribute attr : element.attributes()) {
            result.append(formatContent(attr.getName(), attr.getValue(), level + 1));
        }

        // Format text content
        String text = element.getTextTrim();
        if (!text.isEmpty()) {
            result.append(formatContent("Text", text, level + 1));
        }

        // Format child elements
        for (Element child : element.elements()) {
            result.append(formatToText(child, level + 1));
        }

        return result.toString();
    }

    private String formatContent(String name, String content, int level) {
        String indent = repeatString("\t", level);
        String unescaped = unescapeXml(content);
        String[] lines = unescaped.split("\n");
        
        if (lines.length > 1) {
            StringBuilder result = new StringBuilder(indent).append(name).append(":\r\n");
            for (String line : lines) {
                result.append(indent).append("\t").append(line).append("\r\n");
            }
            return result.toString();
        } else {
            return indent + name + ": " + lines[0].trim() + "\r\n";
        }
    }

    private String repeatString(String str, int times) {
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < times; i++) {
            result.append(str);
        }
        return result.toString();
    }

    private String unescapeXml(String text) {
        return StringEscapeUtils.unescapeXml(text);
    }
}

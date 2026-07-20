import axios from 'axios';
import type {
    FormModule, Block, Item, Canvas, Window, TabPage, Frame, Trigger, LOV, Alert, ProgramUnit, RecordGroup
} from '../types/forms';
import {
    analyzeUILayout, buildBlockUIContext, buildItemUILayout, buildCanvasApexLayout
} from './uiLayoutEngine';
import { analyzeProgramUnit, identifyMainFunctions } from './programUnitAnalyzer';
import { analyzeTrigger } from './triggerAnalyzer';
import { buildFormLogicHierarchy } from './hierarchyBuilder';
import { analyzeMigrationReadiness } from './migrationReadiness';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

// =====================================================
// Main XML Parser with Full UI Layout Support
// =====================================================

export async function parseXmlInBrowser(xmlContent: string): Promise<FormModule> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');

    const formModule = doc.querySelector('FormModule');
    if (!formModule) {
        throw new Error('Invalid Oracle Forms XML: No FormModule found');
    }

    // Parse all components
    const windows = parseWindows(formModule);
    const canvases = parseCanvases(formModule);
    const tabPages = parseTabPages(formModule);
    const lovs = parseLOVs(formModule);
    const recordGroups = parseRecordGroups(formModule);
    const alerts = parseAlerts(formModule);
    const programUnits = parseProgramUnits(formModule);

    // Create base form module
    const result: FormModule = {
        name: formModule.getAttribute('Name') || 'Unknown',
        title: formModule.getAttribute('Title') || '',
        consoleWindow: formModule.getAttribute('ConsoleWindow') || '',
        firstNavigationBlockName: formModule.getAttribute('FirstNavigationBlockName') || '',
        menuModule: formModule.getAttribute('MenuModule') || '',
        blocks: [],
        triggers: [],
        lovs,
        canvases,
        windows,
        tabPages,
        alerts,
        programUnits,
        recordGroups,
        uiStructure: null as any // Will be set after blocks are parsed
    };

    // Parse blocks with UI context
    const blocks = formModule.querySelectorAll('Block');
    blocks.forEach((block) => {
        result.blocks.push(parseBlock(block, result));
    });

    // Parse form-level triggers
    const formTriggers = formModule.querySelectorAll(':scope > Trigger');
    formTriggers.forEach((trigger) => {
        result.triggers.push(parseTrigger(trigger));
    });

    // Analyze UI layout and add canvas APEX hints
    result.uiStructure = analyzeUILayout(result);

    // Add APEX layout hints to canvases
    result.canvases = result.canvases.map(canvas => ({
        ...canvas,
        apexLayout: buildCanvasApexLayout(canvas, result)
    }));

    // =====================================================
    // Intelligence Layer: Analyze program units and triggers
    // =====================================================

    // Enrich program units with metadata
    const enrichedProgramUnits = result.programUnits.map((unit) =>
        analyzeProgramUnit(unit, result.programUnits, result.triggers)
    );

    // Identify main functions
    identifyMainFunctions(enrichedProgramUnits);

    // Analyze triggers with call information
    const analyzedTriggers = result.triggers.map((trigger) =>
        analyzeTrigger(trigger, enrichedProgramUnits)
    );

    // Build form logic hierarchy
    const formLogicHierarchy = buildFormLogicHierarchy(analyzedTriggers, enrichedProgramUnits);

    // Calculate migration readiness
    const migrationReadiness = analyzeMigrationReadiness(enrichedProgramUnits);

    // Attach intelligence data to form module
    result.programUnitsEnriched = enrichedProgramUnits;
    result.triggersAnalyzed = analyzedTriggers;
    result.formLogicHierarchy = formLogicHierarchy;
    result.migrationReadiness = migrationReadiness;

    return result;
}

// =====================================================
// Window Parser
// =====================================================

function parseWindows(formModule: Element): Window[] {
    const windows: Window[] = [];

    formModule.querySelectorAll('Window').forEach((win) => {
        windows.push({
            name: win.getAttribute('Name') || '',
            title: win.getAttribute('Title') || '',
            width: parseInt(win.getAttribute('Width') || '0', 10),
            height: parseInt(win.getAttribute('Height') || '0', 10),
            xPosition: parseInt(win.getAttribute('XPosition') || '0', 10),
            yPosition: parseInt(win.getAttribute('YPosition') || '0', 10),
            modal: win.getAttribute('Modal') === 'true',
            primaryCanvas: win.getAttribute('PrimaryCanvas') || '',
            canvases: []
        });
    });

    return windows;
}

// =====================================================
// Canvas Parser with Frames
// =====================================================

function parseCanvases(formModule: Element): Canvas[] {
    const canvases: Canvas[] = [];

    formModule.querySelectorAll('Canvas').forEach((canvas) => {
        const frames = parseFrames(canvas);
        const graphics = parseGraphics(canvas);

        canvases.push({
            name: canvas.getAttribute('Name') || '',
            canvasType: (canvas.getAttribute('CanvasType') || 'Content') as Canvas['canvasType'],
            width: parseInt(canvas.getAttribute('Width') || '0', 10),
            height: parseInt(canvas.getAttribute('Height') || '0', 10),
            windowName: canvas.getAttribute('WindowName') || '',
            viewportXPosition: parseInt(canvas.getAttribute('ViewportXPosition') || '0', 10),
            viewportYPosition: parseInt(canvas.getAttribute('ViewportYPosition') || '0', 10),
            viewportWidth: parseInt(canvas.getAttribute('ViewportWidth') || '0', 10),
            viewportHeight: parseInt(canvas.getAttribute('ViewportHeight') || '0', 10),
            tabPageName: canvas.getAttribute('TabPageName') || undefined,
            tabPageLabel: canvas.getAttribute('TabPageLabel') || undefined,
            raiseOnEntry: canvas.getAttribute('RaiseOnEntry') === 'true',
            graphics,
            frames,
            apexLayout: null as any // Will be set later
        });
    });

    return canvases;
}

function parseFrames(canvas: Element): Frame[] {
    const frames: Frame[] = [];

    canvas.querySelectorAll('Graphics').forEach((g) => {
        if (g.getAttribute('GraphicsType') === 'Frame') {
            frames.push({
                name: g.getAttribute('Name') || '',
                title: g.getAttribute('FrameTitle') || '',
                xPosition: parseInt(g.getAttribute('XPosition') || '0', 10),
                yPosition: parseInt(g.getAttribute('YPosition') || '0', 10),
                width: parseInt(g.getAttribute('Width') || '0', 10),
                height: parseInt(g.getAttribute('Height') || '0', 10),
                layoutStyle: g.getAttribute('LayoutStyle') || 'Form',
                containedItems: [],
                suggestedRegionName: ''
            });
        }
    });

    return frames;
}

function parseGraphics(canvas: Element): any[] {
    const graphics: any[] = [];

    canvas.querySelectorAll('Graphics').forEach((g) => {
        graphics.push({
            name: g.getAttribute('Name') || '',
            graphicsType: g.getAttribute('GraphicsType') || '',
            frameTitle: g.getAttribute('FrameTitle') || undefined,
            xPosition: parseInt(g.getAttribute('XPosition') || '0', 10),
            yPosition: parseInt(g.getAttribute('YPosition') || '0', 10),
            width: parseInt(g.getAttribute('Width') || '0', 10),
            height: parseInt(g.getAttribute('Height') || '0', 10),
        });
    });

    return graphics;
}

// =====================================================
// Tab Page Parser
// =====================================================

function parseTabPages(formModule: Element): TabPage[] {
    const tabPages: TabPage[] = [];

    formModule.querySelectorAll('TabPage').forEach((tp, index) => {
        tabPages.push({
            name: tp.getAttribute('Name') || '',
            label: tp.getAttribute('Label') || '',
            canvasName: tp.getAttribute('CanvasName') || '',
            displayOrder: parseInt(tp.getAttribute('OrderNum') || String(index + 1), 10)
        });
    });

    return tabPages;
}

// =====================================================
// Block Parser with UI Context
// =====================================================

function parseBlock(block: Element, formModule: FormModule): Block {
    const items: Item[] = [];
    const triggers: Trigger[] = [];
    const relations: any[] = [];
    const blockName = block.getAttribute('Name') || '';

    // Parse items
    block.querySelectorAll(':scope > Item').forEach((item) => {
        items.push(parseItem(item, blockName, formModule));
    });

    // Parse block triggers
    block.querySelectorAll(':scope > Trigger').forEach((trigger) => {
        const parsed = parseTrigger(trigger);
        parsed.blockName = blockName;
        triggers.push(parsed);
    });

    // Parse relations
    block.querySelectorAll(':scope > Relation').forEach((rel) => {
        relations.push({
            name: rel.getAttribute('Name') || '',
            detailBlock: rel.getAttribute('DetailBlock') || '',
            joinCondition: rel.getAttribute('JoinCondition') || '',
            deleteRecord: rel.getAttribute('DeleteRecordBehavior') || 'Non-Isolated',
            autoQuery: rel.getAttribute('AutoQuery') === 'true',
        });
    });

    const blockData: Block = {
        name: blockName,
        databaseBlock: block.getAttribute('DatabaseBlock') !== 'false',
        queryDataSourceName: block.getAttribute('QueryDataSourceName') || '',
        whereClause: block.getAttribute('WhereClause') || '',
        orderByClause: block.getAttribute('OrderByClause') || '',
        insertAllowed: block.getAttribute('InsertAllowed') !== 'false',
        updateAllowed: block.getAttribute('UpdateAllowed') !== 'false',
        deleteAllowed: block.getAttribute('DeleteAllowed') !== 'false',
        recordsDisplayCount: parseInt(block.getAttribute('RecordsDisplayCount') || '1', 10),
        scrollbarCanvasName: block.getAttribute('ScrollbarCanvasName') || '',
        items,
        triggers,
        relations,
        uiContext: null as any // Set below
    };

    // Build UI context after items are parsed
    blockData.uiContext = buildBlockUIContext(blockData, formModule, []);

    return blockData;
}

// =====================================================
// Item Parser with Full UI Layout
// =====================================================

function parseItem(item: Element, blockName: string, formModule: FormModule): Item {
    const triggers: Trigger[] = [];
    const listElements: any[] = [];
    const itemName = item.getAttribute('Name') || '';

    // Parse item triggers
    item.querySelectorAll(':scope > Trigger').forEach((trigger) => {
        const parsed = parseTrigger(trigger);
        parsed.blockName = blockName;
        parsed.itemName = itemName;
        triggers.push(parsed);
    });

    // Parse list elements
    item.querySelectorAll(':scope > ListItemElement').forEach((el, index) => {
        listElements.push({
            index,
            name: el.getAttribute('Name') || '',
            value: el.getAttribute('Value') || '',
        });
    });

    const itemData: Item = {
        name: itemName,
        itemType: item.getAttribute('ItemType') || 'Text Item',
        dataType: item.getAttribute('DataType') || 'Char',
        columnName: item.getAttribute('ColumnName') || '',
        required: item.getAttribute('Required') === 'true',
        enabled: item.getAttribute('Enabled') !== 'false',
        visible: item.getAttribute('Visible') !== 'false',
        maxLength: parseInt(item.getAttribute('MaximumLength') || '0', 10),
        width: parseInt(item.getAttribute('Width') || '0', 10),
        height: parseInt(item.getAttribute('Height') || '0', 10),
        xPosition: parseInt(item.getAttribute('XPosition') || '0', 10),
        yPosition: parseInt(item.getAttribute('YPosition') || '0', 10),
        prompt: item.getAttribute('Prompt') || '',
        hint: item.getAttribute('Hint') || '',
        canvasName: item.getAttribute('CanvasName') || item.getAttribute('Canvas') || '',
        lovName: item.getAttribute('LovName') || item.getAttribute('LOV') || '',
        validateFromList: item.getAttribute('ValidateFromList') === 'true',
        insertAllowed: item.getAttribute('InsertAllowed') !== 'false',
        updateAllowed: item.getAttribute('UpdateAllowed') !== 'false',
        formatMask: item.getAttribute('FormatMask') || '',
        initialValue: item.getAttribute('InitialValue') || '',
        listElements: listElements.length > 0 ? listElements : undefined,
        triggers,
        uiLayout: null as any // Set below
    };

    // Build UI layout
    const tempBlock: Block = {
        name: blockName,
        items: [itemData],
        databaseBlock: true,
        queryDataSourceName: '',
        whereClause: '',
        orderByClause: '',
        insertAllowed: true,
        updateAllowed: true,
        deleteAllowed: true,
        recordsDisplayCount: 1,
        scrollbarCanvasName: '',
        triggers: [],
        relations: [],
        uiContext: null as any
    };

    itemData.uiLayout = buildItemUILayout(itemData, tempBlock, formModule);

    return itemData;
}

// =====================================================
// Trigger Parser with Classification
// =====================================================

function parseTrigger(trigger: Element): Trigger {
    const rawText = trigger.getAttribute('TriggerText') || '';
    const decodedText = decodeHtmlEntities(rawText);
    const triggerName = trigger.getAttribute('Name') || '';

    return {
        name: triggerName,
        triggerText: rawText,
        decodedText,
        fireInQuery: trigger.getAttribute('FireInQueryMode') === 'true',
        classification: classifyTrigger(triggerName),
        apexTarget: mapTriggerToApex(triggerName, decodedText),
    };
}

// =====================================================
// LOV Parser
// =====================================================

function parseLOVs(formModule: Element): LOV[] {
    const lovs: LOV[] = [];

    formModule.querySelectorAll('LOV').forEach((lov) => {
        const columnMappings: any[] = [];

        lov.querySelectorAll('LOVColumnMapping').forEach((col) => {
            columnMappings.push({
                name: col.getAttribute('Name') || '',
                returnItem: col.getAttribute('ReturnItem') || '',
                displayWidth: parseInt(col.getAttribute('DisplayWidth') || '0', 10),
                title: col.getAttribute('Title') || '',
            });
        });

        lovs.push({
            name: lov.getAttribute('Name') || '',
            recordGroupName: lov.getAttribute('RecordGroupName') || '',
            title: lov.getAttribute('Title') || '',
            width: parseInt(lov.getAttribute('Width') || '0', 10),
            height: parseInt(lov.getAttribute('Height') || '0', 10),
            columnMappings,
            apexLovType: 'Popup LOV'
        });
    });

    return lovs;
}

// =====================================================
// Other Parsers
// =====================================================

function parseRecordGroups(formModule: Element): RecordGroup[] {
    const recordGroups: RecordGroup[] = [];

    formModule.querySelectorAll('RecordGroup').forEach((rg) => {
        const columns: any[] = [];

        rg.querySelectorAll('RecordGroupColumn').forEach((col) => {
            columns.push({
                name: col.getAttribute('Name') || '',
                dataType: col.getAttribute('DataType') || 'Char',
                maxLength: parseInt(col.getAttribute('MaximumLength') || '0', 10),
            });
        });

        recordGroups.push({
            name: rg.getAttribute('Name') || '',
            queryDataSourceType: rg.getAttribute('QueryDataSourceType') || 'Table',
            queryText: decodeHtmlEntities(rg.getAttribute('RecordGroupQuery') || ''),
            columns,
        });
    });

    return recordGroups;
}

function parseAlerts(formModule: Element): Alert[] {
    const alerts: Alert[] = [];

    formModule.querySelectorAll('Alert').forEach((alert) => {
        alerts.push({
            name: alert.getAttribute('Name') || '',
            title: alert.getAttribute('Title') || '',
            message: decodeHtmlEntities(alert.getAttribute('Message') || ''),
            alertStyle: alert.getAttribute('AlertStyle') || 'Stop',
            button1Label: alert.getAttribute('Button1Label') || 'OK',
            button2Label: alert.getAttribute('Button2Label') || undefined,
            button3Label: alert.getAttribute('Button3Label') || undefined,
            defaultButton: alert.getAttribute('DefaultButton') || 'Button 1',
        });
    });

    return alerts;
}

function parseProgramUnits(formModule: Element): ProgramUnit[] {
    const units: ProgramUnit[] = [];

    formModule.querySelectorAll('ProgramUnit').forEach((pu) => {
        const rawText = pu.getAttribute('ProgramUnitText') || '';
        units.push({
            name: pu.getAttribute('Name') || '',
            programUnitType: pu.getAttribute('ProgramUnitType') || 'Procedure',
            programUnitText: rawText,
            decodedText: decodeHtmlEntities(rawText),
        });
    });

    return units;
}

// =====================================================
// Utility Functions
// =====================================================

function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&#10;/g, '\n')
        .replace(/&#13;/g, '\r')
        .replace(/&#09;/g, '\t')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

function classifyTrigger(triggerName: string): Trigger['classification'] {
    const name = triggerName.toUpperCase();

    if (name.includes('PRE-FORM') || name.includes('PRE-BLOCK') || name.includes('WHEN-NEW-FORM') || name.includes('WHEN-NEW-BLOCK')) {
        return 'pre-render';
    }
    if (name.includes('POST-QUERY')) return 'post-query';
    if (name.includes('VALIDATE') || name.includes('ON-ERROR')) return 'validation';
    if (name.includes('WHEN-BUTTON') || name.includes('WHEN-MOUSE') || name.includes('WHEN-TREE') || name.includes('KEY-')) {
        return 'user-action';
    }
    if (name.includes('PRE-INSERT') || name.includes('PRE-UPDATE') || name.includes('PRE-DELETE')) return 'pre-dml';
    if (name.includes('POST-INSERT') || name.includes('POST-UPDATE') || name.includes('POST-DELETE')) return 'post-dml';
    if (name.includes('KEY-COMMIT') || name.includes('ON-COMMIT')) return 'commit';
    if (name.includes('WHEN-NEW-RECORD') || name.includes('WHEN-NEW-ITEM') || name.includes('KEY-NEXT') || name.includes('KEY-PREV')) {
        return 'navigation';
    }
    if (name.includes('ON-ERROR')) return 'error';

    return 'unknown';
}

function mapTriggerToApex(triggerName: string, code: string): Trigger['apexTarget'] {
    const classification = classifyTrigger(triggerName);
    const instructions: string[] = [];
    let type: Trigger['apexTarget']['type'] = 'Process';
    let point = '';
    let supportLevel: Trigger['apexTarget']['supportLevel'] = 'full';

    switch (classification) {
        case 'pre-render':
            type = 'Process';
            point = 'Before Header';
            instructions.push('Create process at "Before Header" point');
            break;
        case 'post-query':
            type = 'Process';
            point = 'After Header';
            instructions.push('Create "After Header" process or modify Region Source SQL');
            break;
        case 'validation':
            type = 'Validation';
            point = 'Before Submit';
            instructions.push('Create PL/SQL Validation returning Boolean');
            break;
        case 'user-action':
            type = 'Dynamic Action';
            point = 'On Click / On Change';
            instructions.push('Create Dynamic Action on element click/change');
            supportLevel = 'partial';
            break;
        case 'pre-dml':
            type = 'Process';
            point = 'Processing (Before DML)';
            instructions.push('Create process before Automatic Row Processing');
            break;
        case 'commit':
            type = 'Process';
            point = 'Processing';
            instructions.push('Create Submit Button + Processing process');
            break;
        default:
            supportLevel = 'manual';
            instructions.push('Review and implement manually');
    }

    if (code.includes('SYNCHRONIZE') || code.includes('FORMS_OLE') || code.includes('HOST')) {
        supportLevel = 'manual';
        instructions.push('⚠️ Contains Forms-specific builtins');
    }

    return {
        type,
        point,
        code: transformCodeForApex(code),
        instructions,
        supportLevel,
    };
}

function transformCodeForApex(code: string): string {
    let transformed = code;
    transformed = transformed.replace(/:GLOBAL\.(\w+)/g, "apex_util.get_session_state('G_$1')");
    transformed = transformed.replace(/:PARAMETER\.(\w+)/g, "apex_util.get_session_state('P$1')");
    transformed = transformed.replace(/:(\w+)\.(\w+)/g, ':Pxx_$2 /* was :$1.$2 */');

    const builtins = ['GO_BLOCK', 'GO_ITEM', 'EXECUTE_QUERY', 'CLEAR_BLOCK', 'SHOW_LOV', 'SET_ITEM_PROPERTY'];
    builtins.forEach((b) => {
        transformed = transformed.replace(new RegExp(`\\b${b} \\b`, 'g'), `/* APEX: Replace ${b} */ ${b} `);
    });

    return transformed;
}

export default api;

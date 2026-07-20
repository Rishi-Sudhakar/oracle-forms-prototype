// =====================================================
// UI Layout Intelligence Engine
// Extracts canvas/frame structure and generates APEX layout suggestions
// =====================================================

import type {
    FormModule, Block, Item, Canvas, Frame,
    UIStructure, SuggestedPage, SuggestedRegion, SuggestedItem, RegionGroup,
    TabStructure, TabDefinition, DialogMapping, ThemeRecommendation,
    BlockUIContext, ItemUILayout, RedwoodItemType, RegionType, LayoutType,
    CanvasApexLayout
} from '../types/forms';

import type {
    PageBlueprint, LayoutSection, ChildRegion, ButtonMapping,
    HierarchicalMapping, PageMapping, RegionMapping
} from '../types/pageBlueprint';

import { SECTION_GROUPING_RULES, REDWOOD_THEME } from '../types/pageBlueprint';

// =====================================================
// Main Layout Analyzer
// =====================================================

export function analyzeUILayout(formModule: FormModule): UIStructure {
    const tabStructure = analyzeTabStructure(formModule);
    const dialogs = detectDialogs(formModule);
    const regionGroups = buildRegionGroups(formModule);
    const suggestedPages = buildSuggestedPages(formModule, regionGroups, tabStructure, dialogs);
    const theme = generateThemeRecommendation();

    return {
        suggestedPages,
        regionGroups,
        tabStructure,
        dialogs,
        theme,
        layoutStrategy: {
            primaryLayout: determinePrimaryLayout(formModule),
            usesTabsOrAccordion: tabStructure.hasTabs,
            hasModalDialogs: dialogs.length > 0,
            hasDrawers: formModule.canvases.some(c => c.canvasType === 'Stacked'),
            navigationStyle: detectNavigationStyle(formModule)
        }
    };
}

// =====================================================
// Canvas & Frame Analysis
// =====================================================

export function groupItemsByCanvas(formModule: FormModule): Map<string, Item[]> {
    const groups = new Map<string, Item[]>();

    formModule.blocks.forEach(block => {
        block.items.forEach(item => {
            const canvas = item.canvasName || 'MAIN';
            if (!groups.has(canvas)) {
                groups.set(canvas, []);
            }
            groups.get(canvas)!.push(item);
        });
    });

    return groups;
}

export function extractFrameGroups(formModule: FormModule): Map<string, Frame> {
    const frames = new Map<string, Frame>();

    formModule.canvases.forEach(canvas => {
        canvas.frames.forEach(frame => {
            frame.containedItems = findItemsInFrame(formModule, canvas.name, frame);
            frames.set(`${canvas.name}.${frame.name}`, frame);
        });
    });

    return frames;
}

function findItemsInFrame(formModule: FormModule, canvasName: string, frame: Frame): string[] {
    const items: string[] = [];

    formModule.blocks.forEach(block => {
        block.items.forEach(item => {
            if (item.canvasName === canvasName) {
                // Check if item is within frame bounds
                if (item.xPosition >= frame.xPosition &&
                    item.xPosition <= frame.xPosition + frame.width &&
                    item.yPosition >= frame.yPosition &&
                    item.yPosition <= frame.yPosition + frame.height) {
                    items.push(`${block.name}.${item.name}`);
                }
            }
        });
    });

    return items;
}

// =====================================================
// Tab Structure Detection
// =====================================================

function analyzeTabStructure(formModule: FormModule): TabStructure {
    const tabCanvases = formModule.canvases.filter(c => c.canvasType === 'Tab' || c.tabPageName);

    if (tabCanvases.length === 0 && formModule.tabPages.length === 0) {
        // No explicit tabs, but check for multiple content canvases that could become tabs
        const contentCanvases = formModule.canvases.filter(c => c.canvasType === 'Content');
        if (contentCanvases.length > 1) {
            return {
                hasTabs: true,
                tabs: contentCanvases.map((canvas, index) => ({
                    id: `TAB_${canvas.name}`,
                    label: inferTabLabel(canvas.name),
                    displayOrder: index + 1,
                    sourceCanvas: canvas.name,
                    regions: []
                }))
            };
        }
        return { hasTabs: false, tabs: [] };
    }

    const tabs: TabDefinition[] = [];

    // From explicit tab pages
    formModule.tabPages.forEach((tp, index) => {
        tabs.push({
            id: tp.name,
            label: tp.label || inferTabLabel(tp.name),
            displayOrder: tp.displayOrder || index + 1,
            sourceCanvas: tp.canvasName,
            sourceTabPage: tp.name,
            regions: []
        });
    });

    // From tab canvases
    tabCanvases.forEach((canvas, index) => {
        if (!tabs.find(t => t.sourceCanvas === canvas.name)) {
            tabs.push({
                id: canvas.tabPageName || canvas.name,
                label: canvas.tabPageLabel || inferTabLabel(canvas.name),
                displayOrder: index + 1,
                sourceCanvas: canvas.name,
                regions: []
            });
        }
    });

    return { hasTabs: tabs.length > 0, tabs };
}

function inferTabLabel(name: string): string {
    // Convert CANVAS_DADOS to "Dados", CANVAS_FERIAS to "Férias", etc.
    return name
        .replace(/^CANVAS_/i, '')
        .replace(/^TAB_/i, '')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// =====================================================
// Dialog/Modal Detection
// =====================================================

function detectDialogs(formModule: FormModule): DialogMapping[] {
    const dialogs: DialogMapping[] = [];
    let dialogPageNum = 100;

    // Stacked canvases become modals
    formModule.canvases
        .filter(c => c.canvasType === 'Stacked')
        .forEach(canvas => {
            dialogs.push({
                formsCanvas: canvas.name,
                formsWindow: canvas.windowName,
                apexPageType: 'Modal Dialog',
                apexPageNumber: dialogPageNum++
            });
        });

    // Modal windows
    formModule.windows
        .filter(w => w.modal)
        .forEach(window => {
            if (!dialogs.find(d => d.formsWindow === window.name)) {
                dialogs.push({
                    formsCanvas: window.primaryCanvas,
                    formsWindow: window.name,
                    apexPageType: 'Modal Dialog',
                    apexPageNumber: dialogPageNum++
                });
            }
        });

    return dialogs;
}

// =====================================================
// Region Groups Builder
// =====================================================

function buildRegionGroups(
    formModule: FormModule
): RegionGroup[] {
    const groups: RegionGroup[] = [];

    formModule.blocks.forEach(block => {
        const canvas = block.items[0]?.canvasName || 'MAIN';
        const section = inferFormSection(block.name);
        const tab = inferTabFromCanvas(canvas, formModule);

        groups.push({
            name: block.name,
            title: section,
            blocks: [block.name],
            canvas,
            suggestedTab: tab,
            suggestedRegionType: inferRegionType(block),
            itemCount: block.items.length
        });
    });

    return groups;
}

function inferFormSection(blockName: string): string {
    // Infer human-readable section name from block name
    const sectionMap: Record<string, string> = {
        'TRABALHADOR_DADOS': 'Personal Details',
        'DADOS': 'General Information',
        'DADOS_TIPO_DOC': 'Document Types',
        'DADOS_ESTCIV_DEP': 'Civil Status & Dependents',
        'FERIAS_MARCADAS': 'Scheduled Vacations',
        'DECLARACOES': 'Declarations',
        'COMISSOES_SERV': 'Service Commissions',
        'CS_EM_CURSO': 'Ongoing Commissions',
        'INTEGRAR_CS': 'Commission Integration',
        'CRIACAO_ALTERACAO': 'Audit Information',
        'TRAB': 'Worker Search',
        'ARVORE': 'Navigation Tree'
    };

    if (sectionMap[blockName]) return sectionMap[blockName];

    return blockName
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function inferTabFromCanvas(canvasName: string, formModule: FormModule): string {
    const canvas = formModule.canvases.find(c => c.name === canvasName);
    if (canvas?.tabPageLabel) return canvas.tabPageLabel;
    if (canvas?.tabPageName) return inferTabLabel(canvas.tabPageName);
    return inferTabLabel(canvasName);
}

function inferRegionType(block: Block): RegionType {
    // Navigation tree
    if (block.items.some(i => i.itemType === 'Hierarchical Tree')) {
        return 'Tree';
    }

    // Multiple records = grid
    if (block.recordsDisplayCount > 1) {
        return 'Interactive Grid';
    }

    // Non-database block with only display items
    if (!block.databaseBlock && block.items.every(i => !i.enabled || i.itemType === 'Display Item')) {
        return 'Display Only';
    }

    // Single record database block = form
    if (block.databaseBlock && block.recordsDisplayCount === 1) {
        return 'Form';
    }

    // Default
    return block.databaseBlock ? 'Form' : 'Static Content';
}

// =====================================================
// Suggested Pages Builder
// =====================================================

function buildSuggestedPages(
    formModule: FormModule,
    _regionGroups: RegionGroup[],
    tabStructure: TabStructure,
    dialogs: DialogMapping[]
): SuggestedPage[] {
    const pages: SuggestedPage[] = [];

    // Main page (page 10)
    const mainPage: SuggestedPage = {
        pageNumber: 10,
        pageName: formModule.name,
        pageTitle: formModule.title || formModule.name,
        pageType: 'Normal',
        pageTemplate: 'Theme Default',
        sourceCanvases: formModule.canvases.filter(c => c.canvasType === 'Content').map(c => c.name),
        sourceBlocks: formModule.blocks.filter(b => !dialogs.find(d => d.formsCanvas === b.items[0]?.canvasName)).map(b => b.name),
        regions: []
    };

    // Build regions for main page
    let displaySeq = 10;

    if (tabStructure.hasTabs) {
        // Create a region for each tab
        tabStructure.tabs.forEach(tab => {
            const tabBlocks = formModule.blocks.filter(b => {
                const canvas = b.items[0]?.canvasName;
                return canvas === tab.sourceCanvas;
            });

            tabBlocks.forEach(block => {
                mainPage.regions.push(buildSuggestedRegion(block, formModule, tab.label, displaySeq));
                displaySeq += 10;
            });
        });
    } else {
        // Single page with all blocks
        formModule.blocks.forEach(block => {
            if (!dialogs.find(d => d.formsCanvas === block.items[0]?.canvasName)) {
                mainPage.regions.push(buildSuggestedRegion(block, formModule, 'Main', displaySeq));
                displaySeq += 10;
            }
        });
    }

    pages.push(mainPage);

    // Dialog pages
    dialogs.forEach(dialog => {
        const dialogBlocks = formModule.blocks.filter(b =>
            b.items.some(i => i.canvasName === dialog.formsCanvas)
        );

        pages.push({
            pageNumber: dialog.apexPageNumber,
            pageName: `${formModule.name}_${dialog.formsCanvas}`,
            pageTitle: inferFormSection(dialog.formsCanvas),
            pageType: 'Modal Dialog',
            pageTemplate: 'Modal Dialog',
            sourceCanvases: [dialog.formsCanvas],
            sourceBlocks: dialogBlocks.map(b => b.name),
            regions: dialogBlocks.map((b, i) => buildSuggestedRegion(b, formModule, 'Dialog', (i + 1) * 10))
        });
    });

    return pages;
}

function buildSuggestedRegion(
    block: Block,
    _formModule: FormModule,
    _tab: string,
    displaySeq: number
): SuggestedRegion {
    const canvas = block.items[0]?.canvasName || 'MAIN';
    const section = inferFormSection(block.name);
    const regionType = inferRegionType(block);
    const columns = inferGridColumns(block);

    // Sort items by Y then X position
    const sortedItems = [...block.items].sort((a, b) => {
        if (Math.abs(a.yPosition - b.yPosition) < 20) {
            return a.xPosition - b.xPosition;
        }
        return a.yPosition - b.yPosition;
    });

    // Build suggested items with grid positions
    const items: SuggestedItem[] = [];
    let currentRow = 0;
    let currentCol = 0;
    let lastY = -100;

    sortedItems.forEach((item, index) => {
        // New row if Y position differs significantly
        if (item.yPosition - lastY > 25) {
            currentRow++;
            currentCol = 0;
        }
        currentCol++;
        if (currentCol > columns) {
            currentRow++;
            currentCol = 1;
        }
        lastY = item.yPosition;

        items.push({
            formsName: `${block.name}.${item.name}`,
            apexName: `P10_${item.name}`,
            label: item.prompt || item.name.replace(/_/g, ' '),
            redwoodType: mapToRedwoodType(item),
            gridColumn: currentCol,
            gridRow: currentRow,
            colSpan: item.width > 300 ? 2 : 1,
            displaySequence: (index + 1) * 10,
            group: section,
            required: item.required,
            readOnly: !item.enabled || !item.updateAllowed,
            lovSource: item.lovName || undefined,
            helpText: item.hint || undefined,
            x: item.xPosition,
            y: item.yPosition,
            width: item.width,
            height: item.height
        });
    });

    return {
        name: `R_${block.name}`,
        title: section,
        type: regionType,
        position: 'Body',
        sourceBlock: block.name,
        sourceCanvas: canvas,
        layout: `Grid-${columns}` as LayoutType,
        columns,
        items,
        displaySequence: displaySeq,
        isCollapsible: block.items.length > 5
    };
}

function inferGridColumns(block: Block): number {
    if (block.items.length === 0) return 1;

    // Analyze X positions to determine column count
    const xPositions = block.items.map(i => i.xPosition);
    const uniqueX = [...new Set(xPositions.map(x => Math.floor(x / 150)))];

    if (uniqueX.length >= 4) return 4;
    if (uniqueX.length >= 3) return 3;
    if (uniqueX.length >= 2) return 2;
    return 1;
}

// =====================================================
// Redwood Component Mapping
// =====================================================

export function mapToRedwoodType(item: Item): RedwoodItemType {
    // Button
    if (item.itemType === 'Push Button') {
        return 'Text Field'; // Buttons are separate APEX components
    }

    // LOV items
    if (item.lovName) {
        return item.validateFromList ? 'Select List' : 'Popup LOV';
    }

    // List items
    if (item.itemType === 'List Item') {
        return 'Select List';
    }

    // Display only
    if (item.itemType === 'Display Item' || !item.enabled) {
        return 'Display Only';
    }

    // Hidden
    if (!item.visible) {
        return 'Hidden';
    }

    // Date
    if (item.dataType === 'Date' || item.dataType === 'Datetime' ||
        item.formatMask?.includes('DD') || item.formatMask?.includes('MM')) {
        return 'Date Picker';
    }

    // Number
    if (item.dataType === 'Number' || item.dataType === 'Long Integer') {
        return 'Number Field';
    }

    // Long text
    if (item.maxLength > 500 || item.height > 50) {
        return 'Textarea';
    }

    // Checkbox
    if (item.itemType === 'Check Box') {
        return 'Checkbox';
    }

    // Radio
    if (item.itemType === 'Radio Group') {
        return 'Radio Group';
    }

    // Default to text field
    return 'Text Field';
}

// =====================================================
// Theme & Layout Recommendations
// =====================================================

function generateThemeRecommendation(): ThemeRecommendation {
    return {
        themeName: 'Redwood Light',
        themeStyle: '42',
        pageTemplate: 'Standard',
        regionTemplate: 'Collapsible',
        itemTemplate: 'Floating',
        buttonTemplate: 'Text with Icon',
        templateOptions: {
            padding: 'Large',
            spacing: 'Medium',
            iconDisplay: true,
            headingStyle: 'Bold',
            bodyHeight: 'Auto'
        }
    };
}

function determinePrimaryLayout(formModule: FormModule): 'Single Column' | 'Two Column' | 'Three Column' | 'Grid' {
    const avgItemsPerBlock = formModule.blocks.reduce((sum, b) => sum + b.items.length, 0) / formModule.blocks.length;

    if (avgItemsPerBlock > 15) return 'Two Column';
    if (formModule.blocks.length > 5) return 'Grid';
    return 'Single Column';
}

function detectNavigationStyle(formModule: FormModule): 'Tree' | 'Tabs' | 'Wizard' | 'Cards' {
    const hasTree = formModule.blocks.some(b => b.items.some(i => i.itemType === 'Hierarchical Tree'));
    if (hasTree) return 'Tree';

    const tabCanvases = formModule.canvases.filter(c => c.canvasType === 'Tab').length;
    if (tabCanvases > 0 || formModule.tabPages.length > 0) return 'Tabs';

    return 'Tabs'; // Default for multi-canvas forms
}

// =====================================================
// Block UI Context Builder
// =====================================================

export function buildBlockUIContext(block: Block, formModule: FormModule, dialogs: DialogMapping[]): BlockUIContext {
    const canvas = block.items[0]?.canvasName || 'MAIN';
    const canvasObj = formModule.canvases.find(c => c.name === canvas);
    const windowName = canvasObj?.windowName || formModule.consoleWindow;
    const isModal = dialogs.some(d => d.formsCanvas === canvas);
    const isPopup = canvasObj?.canvasType === 'Stacked';

    return {
        canvas,
        window: windowName,
        formSection: inferFormSection(block.name),
        preferredRegionType: inferRegionType(block),
        preferredLayout: `Grid-${inferGridColumns(block)}` as LayoutType,
        apexSuggestedPage: isModal ? 100 : 10,
        visualRole: determineVisualRole(block),
        suggestedTab: inferTabFromCanvas(canvas, formModule),
        isModal,
        isPopup,
        gridColumns: inferGridColumns(block),
        displaySequence: 10
    };
}

function determineVisualRole(block: Block): BlockUIContext['visualRole'] {
    if (block.items.some(i => i.itemType === 'Hierarchical Tree')) return 'navigation';
    if (!block.databaseBlock) return 'header';
    if (block.recordsDisplayCount > 1) return 'detail';
    return 'primary';
}

// =====================================================
// Item UI Layout Builder
// =====================================================

export function buildItemUILayout(item: Item, block: Block, formModule: FormModule): ItemUILayout {
    const canvas = item.canvasName || 'MAIN';
    const tab = inferTabFromCanvas(canvas, formModule);
    const section = inferFormSection(block.name);
    const columns = inferGridColumns(block);

    // Calculate grid position from X/Y
    const gridColumn = Math.min(Math.floor(item.xPosition / 200) + 1, columns);
    const gridRow = Math.floor(item.yPosition / 30) + 1;

    return {
        x: item.xPosition,
        y: item.yPosition,
        width: item.width,
        height: item.height,
        preferredItemType: mapToRedwoodType(item),
        group: section,
        tab,
        gridColumn,
        gridRow,
        colSpan: item.width > 300 ? 2 : 1,
        displaySequence: gridRow * 10 + gridColumn,
        labelPosition: item.prompt ? 'Above' : 'Hidden'
    };
}

// =====================================================
// Canvas APEX Layout Builder
// =====================================================

export function buildCanvasApexLayout(canvas: Canvas, formModule: FormModule): CanvasApexLayout {
    const isTab = canvas.canvasType === 'Tab' || !!canvas.tabPageName;
    const isStacked = canvas.canvasType === 'Stacked';
    const window = formModule.windows.find(w => w.name === canvas.windowName);
    const isModal = window?.modal || false;

    let suggestedRegionPosition: CanvasApexLayout['suggestedRegionPosition'] = 'Body';
    let suggestedPageType: CanvasApexLayout['suggestedPageType'] = 'Normal';

    if (isStacked || isModal) {
        suggestedRegionPosition = 'Modal';
        suggestedPageType = 'Modal Dialog';
    } else if (isTab) {
        suggestedRegionPosition = 'Body';
    }

    return {
        suggestedRegionPosition,
        suggestedPageType,
        isTabPage: isTab,
        isModal: isModal || isStacked,
        isPopup: isStacked,
        displayOrder: 1,
        parentCanvas: isTab ? formModule.canvases.find(c => c.canvasType === 'Content')?.name : undefined
    };
}

// =====================================================
// PAGE-LEVEL BLUEPRINT GENERATION
// =====================================================

/**
 * Generate comprehensive page-level blueprints with sections,
 * ASCII wireframes, and developer explanations.
 */
export function generatePageBlueprints(formModule: FormModule): PageBlueprint[] {
    const blueprints: PageBlueprint[] = [];
    const sectionGroups = groupBlocksIntoSections(formModule);
    const dialogs = detectDialogs(formModule);

    // Main page blueprint
    const mainBlueprint = buildMainPageBlueprint(formModule, sectionGroups, dialogs);
    blueprints.push(mainBlueprint);

    // Dialog page blueprints
    dialogs.forEach((dialog, idx) => {
        const dialogBlueprint = buildDialogBlueprint(formModule, dialog, idx);
        blueprints.push(dialogBlueprint);
    });

    return blueprints;
}

/**
 * Group blocks into logical sections based on naming patterns.
 */
export function groupBlocksIntoSections(formModule: FormModule): Map<string, Block[]> {
    const groups = new Map<string, Block[]>();

    formModule.blocks.forEach(block => {
        let sectionTitle = 'General';
        let maxPriority = Infinity;

        // Find matching section rule
        for (const rule of SECTION_GROUPING_RULES) {
            if (rule.pattern.test(block.name) && rule.priority < maxPriority) {
                sectionTitle = rule.sectionTitle;
                maxPriority = rule.priority;
            }
        }

        if (!groups.has(sectionTitle)) {
            groups.set(sectionTitle, []);
        }
        groups.get(sectionTitle)!.push(block);
    });

    return groups;
}

function buildMainPageBlueprint(
    formModule: FormModule,
    sectionGroups: Map<string, Block[]>,
    dialogs: DialogMapping[]
): PageBlueprint {
    const sections: LayoutSection[] = [];
    const childRegions: ChildRegion[] = [];
    const buttons: ButtonMapping[] = [];
    let displaySeq = 10;

    // Process each section group
    sectionGroups.forEach((blocks, sectionTitle) => {
        blocks.forEach(block => {
            // Skip blocks that belong to dialogs
            if (dialogs.some(d => block.items.some(i => i.canvasName === d.formsCanvas))) {
                return;
            }

            const regionType = inferRegionType(block);

            // Multi-record blocks become child regions (Interactive Grids)
            if (regionType === 'Interactive Grid') {
                childRegions.push({
                    title: sectionTitle,
                    canvas: block.items[0]?.canvasName || 'MAIN',
                    regionName: `R_${block.name}`,
                    sourceBlock: block.name,
                    type: 'Interactive Grid',
                    relationship: `Detail of ${formModule.firstNavigationBlockName || 'Main'}`,
                    location: 'Below main form',
                    collapsible: true,
                    displaySequence: displaySeq
                });
            } else {
                // Single-record blocks become sections
                const items = block.items.map((item, idx) => ({
                    formsName: `${block.name}.${item.name}`,
                    apexName: `P10_${item.name}`,
                    label: item.prompt || item.name.replace(/_/g, ' '),
                    redwoodType: mapToRedwoodType(item),
                    gridColumn: (idx % 2) + 1,
                    gridRow: Math.floor(idx / 2) + 1,
                    colSpan: item.width > 300 ? 2 : 1,
                    required: item.required,
                    readOnly: !item.enabled
                }));

                sections.push({
                    title: sectionTitle,
                    description: `Fields from ${block.name}`,
                    regionName: `R_${block.name}`,
                    sourceBlocks: [block.name],
                    items,
                    gridColumn: 1,
                    gridRow: sections.length + 1,
                    colSpan: 2,
                    displaySequence: displaySeq,
                    type: regionType,
                    layout: 'Grid-2'
                });

                // Extract buttons from block items
                block.items
                    .filter(i => i.itemType === 'Push Button')
                    .forEach(btn => {
                        buttons.push({
                            formsItem: `${block.name}.${btn.name}`,
                            apexName: `P10_${btn.name}`,
                            label: btn.prompt || btn.name.replace(/_/g, ' '),
                            position: 'Header Right',
                            action: btn.name.toLowerCase().includes('save') ? 'Submit' : 'Custom'
                        });
                    });
            }
            displaySeq += 10;
        });
    });

    const blueprint: PageBlueprint = {
        pageIdSuggestion: 10,
        pageName: `${formModule.name} - Main`,
        sourceFormsModule: formModule.name,
        sourceCanvases: formModule.canvases.filter(c => c.canvasType === 'Content').map(c => c.name),
        sourceBlocks: formModule.blocks.map(b => b.name),
        purpose: `Main page for ${formModule.title || formModule.name}. Contains worker data entry and management.`,
        priority: 'main',
        theme: REDWOOD_THEME.themeName,
        template: REDWOOD_THEME.pageTemplates.standard,
        layout: {
            type: 'grid',
            columns: 2,
            usesSubTabs: formModule.tabPages.length > 0,
            usesAccordion: childRegions.length > 3
        },
        sections,
        childRegions,
        buttons,
        wireframe: '',
        developerExplanation: ''
    };

    // Generate wireframe and explanation
    blueprint.wireframe = generateAsciiWireframe(blueprint);
    blueprint.developerExplanation = generateDeveloperExplanation(blueprint, formModule);

    return blueprint;
}

function buildDialogBlueprint(
    formModule: FormModule,
    dialog: DialogMapping,
    _idx: number
): PageBlueprint {
    const dialogBlocks = formModule.blocks.filter(b =>
        b.items.some(i => i.canvasName === dialog.formsCanvas)
    );

    const sections: LayoutSection[] = dialogBlocks.map((block, bIdx) => ({
        title: inferFormSection(block.name),
        description: `Dialog content from ${block.name}`,
        regionName: `R_${block.name}`,
        sourceBlocks: [block.name],
        items: block.items.map((item, idx) => ({
            formsName: `${block.name}.${item.name}`,
            apexName: `P${100 + idx}_${item.name}`,
            label: item.prompt || item.name.replace(/_/g, ' '),
            redwoodType: mapToRedwoodType(item),
            gridColumn: 1,
            gridRow: idx + 1,
            colSpan: 1,
            required: item.required,
            readOnly: !item.enabled
        })),
        gridColumn: 1,
        gridRow: bIdx + 1,
        colSpan: 1,
        displaySequence: (bIdx + 1) * 10,
        type: inferRegionType(block),
        layout: 'Grid-1'
    }));

    const blueprint: PageBlueprint = {
        pageIdSuggestion: dialog.apexPageNumber,
        pageName: `${formModule.name} - ${dialog.formsCanvas}`,
        sourceFormsModule: formModule.name,
        sourceCanvases: [dialog.formsCanvas],
        sourceBlocks: dialogBlocks.map(b => b.name),
        purpose: `Modal dialog for ${inferFormSection(dialog.formsCanvas)}`,
        priority: 'dialog',
        theme: REDWOOD_THEME.themeName,
        template: REDWOOD_THEME.pageTemplates.modalDialog,
        layout: {
            type: 'stacked',
            columns: 1,
            usesSubTabs: false,
            usesAccordion: false
        },
        sections,
        childRegions: [],
        buttons: [
            { formsItem: 'OK', apexName: 'P_OK', label: 'Save', position: 'Dialog Footer', action: 'Submit' },
            { formsItem: 'CANCEL', apexName: 'P_CANCEL', label: 'Cancel', position: 'Dialog Footer', action: 'Navigate' }
        ],
        wireframe: '',
        developerExplanation: ''
    };

    blueprint.wireframe = generateAsciiWireframe(blueprint);
    blueprint.developerExplanation = generateDeveloperExplanation(blueprint, formModule);

    return blueprint;
}

/**
 * Generate ASCII wireframe representation of the page layout.
 */
export function generateAsciiWireframe(blueprint: PageBlueprint): string {
    const lines: string[] = [];
    const width = 60;
    const border = '+' + '-'.repeat(width - 2) + '+';

    lines.push(border);
    lines.push(`| ${padRight(blueprint.pageName, width - 4)} |`);
    lines.push(`| ${padRight(`Template: ${blueprint.template}`, width - 4)} |`);
    lines.push(border);

    // Sections
    blueprint.sections.forEach(section => {
        lines.push(`| Section: ${padRight(section.title, width - 14)} |`);
        lines.push(`| ${padRight(`  Region: ${section.regionName}`, width - 4)} |`);

        if (section.items.length > 0) {
            const itemsPreview = section.items.slice(0, 4).map(i => i.apexName).join(', ');
            lines.push(`| ${padRight(`  Items: ${itemsPreview}${section.items.length > 4 ? '...' : ''}`, width - 4)} |`);
        }
        lines.push('|' + ' '.repeat(width - 2) + '|');
    });

    // Child regions (Interactive Grids)
    if (blueprint.childRegions.length > 0) {
        lines.push(border);
        lines.push(`| ${padRight('DETAIL GRIDS:', width - 4)} |`);

        blueprint.childRegions.forEach(child => {
            lines.push(`| ${padRight(`  [${child.type}] ${child.regionName}`, width - 4)} |`);
            lines.push(`| ${padRight(`    Source: ${child.sourceBlock}`, width - 4)} |`);
        });
    }

    // Buttons
    if (blueprint.buttons.length > 0) {
        lines.push(border);
        const buttonsStr = blueprint.buttons.map(b => `[${b.label}]`).join(' ');
        lines.push(`| ${padRight(`Buttons: ${buttonsStr}`, width - 4)} |`);
    }

    lines.push(border);

    return lines.join('\n');
}

function padRight(str: string, len: number): string {
    if (str.length >= len) return str.substring(0, len);
    return str + ' '.repeat(len - str.length);
}

/**
 * Generate human-readable explanation for APEX developers.
 */
export function generateDeveloperExplanation(
    blueprint: PageBlueprint,
    _formModule: FormModule
): string {
    const lines: string[] = [];

    lines.push(`## Page ${blueprint.pageIdSuggestion} – ${blueprint.pageName}`);
    lines.push('');
    lines.push(`**Purpose:** ${blueprint.purpose}`);
    lines.push('');
    lines.push(`**Source Forms Module:** ${blueprint.sourceFormsModule}`);
    lines.push('');

    // Explain sections
    if (blueprint.sections.length > 0) {
        lines.push('### Layout Structure');
        lines.push('');
        lines.push(`This page uses a **${blueprint.layout.columns}-column ${blueprint.layout.type} layout** with the ${blueprint.theme} theme.`);
        lines.push('');

        lines.push('**Sections:**');
        blueprint.sections.forEach((section, idx) => {
            lines.push(`${idx + 1}. **${section.title}** (Region: \`${section.regionName}\`)`);
            lines.push(`   - Type: ${section.type}`);
            lines.push(`   - Source Blocks: ${section.sourceBlocks.join(', ')}`);
            lines.push(`   - ${section.items.length} items in ${section.layout} layout`);
        });
        lines.push('');
    }

    // Explain child regions
    if (blueprint.childRegions.length > 0) {
        lines.push('### Detail Regions (Interactive Grids)');
        lines.push('');
        lines.push('These regions display multiple records and should be implemented as Interactive Grids:');
        lines.push('');

        blueprint.childRegions.forEach((child, idx) => {
            lines.push(`${idx + 1}. **${child.title}** (\`${child.regionName}\`)`);
            lines.push(`   - Type: ${child.type}`);
            lines.push(`   - Relationship: ${child.relationship}`);
            lines.push(`   - Location: ${child.location}`);
            lines.push(`   - Collapsible: ${child.collapsible ? 'Yes' : 'No'}`);
        });
        lines.push('');
    }

    // Build instructions
    lines.push('### How to Build in APEX Page Designer');
    lines.push('');
    lines.push(`1. Create a new page using **${blueprint.template}** template`);
    lines.push(`2. Set page title to "${blueprint.pageName}"`);

    blueprint.sections.forEach((section, idx) => {
        lines.push(`${idx + 3}. Add a **${section.type}** region named \`${section.regionName}\` for "${section.title}"`);
    });

    if (blueprint.childRegions.length > 0) {
        lines.push(`${blueprint.sections.length + 3}. Add Interactive Grid regions below the main form for detail data`);
    }

    if (blueprint.buttons.length > 0) {
        lines.push('');
        lines.push('**Buttons:**');
        blueprint.buttons.forEach(btn => {
            lines.push(`- \`${btn.apexName}\`: "${btn.label}" (${btn.position}, Action: ${btn.action})`);
        });
    }

    return lines.join('\n');
}

/**
 * Build hierarchical mapping structure for tree view display.
 */
export function buildHierarchicalMapping(formModule: FormModule): HierarchicalMapping {
    const blueprints = generatePageBlueprints(formModule);
    const pageMappings: PageMapping[] = [];

    blueprints.forEach(blueprint => {
        const regions: RegionMapping[] = [];

        // Add sections as regions
        blueprint.sections.forEach(section => {
            regions.push({
                regionName: section.regionName,
                sourceFormsBlocks: section.sourceBlocks,
                type: section.type,
                section: section.title,
                items: section.items.map(item => ({
                    formsName: item.formsName,
                    formsBlock: item.formsName.split('.')[0],
                    formsType: item.redwoodType,
                    apexItem: item.apexName,
                    apexType: item.redwoodType,
                    section: section.title,
                    column: item.gridColumn,
                    row: item.gridRow,
                    status: 'full' as const
                }))
            });
        });

        // Add child regions
        blueprint.childRegions.forEach(child => {
            regions.push({
                regionName: child.regionName,
                sourceFormsBlocks: [child.sourceBlock],
                type: child.type as RegionType,
                section: child.title,
                items: [] // Grid items handled differently
            });
        });

        pageMappings.push({
            pageIdSuggestion: blueprint.pageIdSuggestion,
            pageName: blueprint.pageName,
            regions
        });
    });

    const totalItems = pageMappings.reduce((sum, p) =>
        sum + p.regions.reduce((rSum, r) => rSum + r.items.length, 0), 0
    );

    return {
        formName: formModule.name,
        totalMappings: totalItems,
        pageMappings
    };
}


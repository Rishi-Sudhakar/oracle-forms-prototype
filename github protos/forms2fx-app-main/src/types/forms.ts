// =====================================================
// Oracle Forms Data Types with Full UI Layout Support
// =====================================================

export interface FormModule {
    name: string;
    title: string;
    consoleWindow: string;
    firstNavigationBlockName: string;
    menuModule: string;
    blocks: Block[];
    triggers: Trigger[];
    lovs: LOV[];
    canvases: Canvas[];
    windows: Window[];
    tabPages: TabPage[];
    alerts: Alert[];
    programUnits: ProgramUnit[];
    recordGroups: RecordGroup[];
    // UI Layout Intelligence
    uiStructure: UIStructure;
    // Program Unit Intelligence
    programUnitsEnriched?: ProgramUnitEnriched[];
    triggersAnalyzed?: TriggerAnalysis[];
    formLogicHierarchy?: FormLogicHierarchy;
    migrationReadiness?: MigrationReadiness;
}

// =====================================================
// Window & Canvas Hierarchy
// =====================================================

export interface Window {
    name: string;
    title: string;
    width: number;
    height: number;
    xPosition: number;
    yPosition: number;
    modal: boolean;
    primaryCanvas: string;
    canvases: string[];
}

export interface Canvas {
    name: string;
    canvasType: CanvasType;
    width: number;
    height: number;
    windowName: string;
    viewportXPosition: number;
    viewportYPosition: number;
    viewportWidth: number;
    viewportHeight: number;
    tabPageName?: string;
    tabPageLabel?: string;
    raiseOnEntry: boolean;
    graphics: Graphic[];
    frames: Frame[];
    // APEX Layout Mapping
    apexLayout: CanvasApexLayout;
}

export type CanvasType = 'Content' | 'Stacked' | 'Tab' | 'Toolbar' | 'Horizontal Toolbar' | 'Vertical Toolbar';

export interface CanvasApexLayout {
    suggestedRegionPosition: 'Body' | 'Dialog' | 'Modal' | 'Drawer' | 'Right Side Column' | 'Inline Popup';
    suggestedPageType: 'Normal' | 'Modal Dialog' | 'Drawer' | 'Wizard';
    isTabPage: boolean;
    isModal: boolean;
    isPopup: boolean;
    displayOrder: number;
    parentCanvas?: string;
}

export interface TabPage {
    name: string;
    label: string;
    canvasName: string;
    displayOrder: number;
}

export interface Frame {
    name: string;
    title: string;
    xPosition: number;
    yPosition: number;
    width: number;
    height: number;
    layoutStyle: string;
    // Items contained within this frame
    containedItems: string[];
    // APEX Region mapping
    suggestedRegionName: string;
}

export interface Graphic {
    name: string;
    graphicsType: string;
    frameTitle?: string;
    xPosition: number;
    yPosition: number;
    width: number;
    height: number;
}

// =====================================================
// Complete UI Structure (The Brain)
// =====================================================

export interface UIStructure {
    suggestedPages: SuggestedPage[];
    regionGroups: RegionGroup[];
    tabStructure: TabStructure;
    dialogs: DialogMapping[];
    theme: ThemeRecommendation;
    layoutStrategy: LayoutStrategy;
}

export interface SuggestedPage {
    pageNumber: number;
    pageName: string;
    pageTitle: string;
    pageType: 'Normal' | 'Modal Dialog' | 'Drawer' | 'Wizard';
    pageTemplate: string;
    sourceCanvases: string[];
    sourceBlocks: string[];
    regions: SuggestedRegion[];
}

export interface SuggestedRegion {
    name: string;
    title: string;
    type: RegionType;
    position: RegionPosition;
    sourceBlock: string;
    sourceCanvas: string;
    sourceFrame?: string;
    layout: LayoutType;
    columns: number;
    items: SuggestedItem[];
    displaySequence: number;
    parentRegion?: string;
    isCollapsible: boolean;
}

export interface SuggestedItem {
    formsName: string;
    apexName: string;
    label: string;
    redwoodType: RedwoodItemType;
    gridColumn: number;
    gridRow: number;
    colSpan: number;
    displaySequence: number;
    group: string;
    required: boolean;
    readOnly: boolean;
    lovSource?: string;
    helpText?: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface RegionGroup {
    name: string;
    title: string;
    blocks: string[];
    canvas: string;
    frame?: string;
    suggestedTab: string;
    suggestedRegionType: RegionType;
    itemCount: number;
}

export interface TabStructure {
    hasTabs: boolean;
    tabs: TabDefinition[];
}

export interface TabDefinition {
    id: string;
    label: string;
    displayOrder: number;
    sourceCanvas: string;
    sourceTabPage?: string;
    regions: string[];
}

export interface DialogMapping {
    formsCanvas: string;
    formsWindow: string;
    apexPageType: 'Modal Dialog' | 'Drawer' | 'Inline Popup';
    apexPageNumber: number;
    triggeringElement?: string;
}

export interface ThemeRecommendation {
    themeName: string;
    themeStyle: string;
    pageTemplate: string;
    regionTemplate: string;
    itemTemplate: string;
    buttonTemplate: string;
    templateOptions: TemplateOptions;
}

export interface TemplateOptions {
    padding: 'None' | 'Small' | 'Medium' | 'Large';
    spacing: 'None' | 'Small' | 'Medium' | 'Large';
    iconDisplay: boolean;
    headingStyle: 'Normal' | 'Bold' | 'Hidden';
    bodyHeight: 'Auto' | 'Fixed' | 'Scroll';
}

export interface LayoutStrategy {
    primaryLayout: 'Single Column' | 'Two Column' | 'Three Column' | 'Grid';
    usesTabsOrAccordion: boolean;
    hasModalDialogs: boolean;
    hasDrawers: boolean;
    navigationStyle: 'Tree' | 'Tabs' | 'Wizard' | 'Cards';
}

export type RegionType =
    | 'Form'
    | 'Interactive Grid'
    | 'Interactive Report'
    | 'Classic Report'
    | 'Cards'
    | 'Tree'
    | 'Chart'
    | 'Accordion'
    | 'Wizard'
    | 'Display Only'
    | 'Static Content'
    | 'Faceted Search';

export type RegionPosition =
    | 'Body'
    | 'Right Side Column'
    | 'Dialog Header'
    | 'Dialog Body'
    | 'Dialog Footer'
    | 'Breadcrumb Bar'
    | 'Footer';

export type LayoutType = 'Grid-1' | 'Grid-2' | 'Grid-3' | 'Grid-4' | 'Stacked' | 'Floating' | 'Table';

export type RedwoodItemType =
    | 'Text Field'
    | 'Number Field'
    | 'Date Picker'
    | 'Select List'
    | 'Popup LOV'
    | 'Radio Group'
    | 'Checkbox'
    | 'Switch'
    | 'Textarea'
    | 'Rich Text Editor'
    | 'Display Only'
    | 'Hidden'
    | 'File Upload'
    | 'Password'
    | 'Color Picker'
    | 'Shuttle'
    | 'Image';

// =====================================================
// Block with UI Context
// =====================================================

export interface Block {
    name: string;
    databaseBlock: boolean;
    queryDataSourceName: string;
    whereClause: string;
    orderByClause: string;
    insertAllowed: boolean;
    updateAllowed: boolean;
    deleteAllowed: boolean;
    recordsDisplayCount: number;
    scrollbarCanvasName: string;
    items: Item[];
    triggers: Trigger[];
    relations: Relation[];
    // Full UI Context
    uiContext: BlockUIContext;
}

export interface BlockUIContext {
    canvas: string;
    window: string;
    formSection: string;
    preferredRegionType: RegionType;
    preferredLayout: LayoutType;
    apexSuggestedPage: number;
    visualRole: 'primary' | 'secondary' | 'detail' | 'lookup' | 'navigation' | 'header' | 'footer';
    suggestedTab: string;
    isModal: boolean;
    isPopup: boolean;
    gridColumns: number;
    displaySequence: number;
}

// =====================================================
// Item with Full Visual Layout
// =====================================================

export interface Item {
    name: string;
    itemType: string;
    dataType: string;
    columnName: string;
    required: boolean;
    enabled: boolean;
    visible: boolean;
    maxLength: number;
    width: number;
    height: number;
    xPosition: number;
    yPosition: number;
    prompt: string;
    hint: string;
    canvasName: string;
    lovName: string;
    validateFromList: boolean;
    insertAllowed: boolean;
    updateAllowed: boolean;
    formatMask: string;
    initialValue: string;
    listElements?: ListElement[];
    triggers: Trigger[];
    // Full UI Layout
    uiLayout: ItemUILayout;
}

export interface ItemUILayout {
    x: number;
    y: number;
    width: number;
    height: number;
    preferredItemType: RedwoodItemType;
    group: string;
    tab: string;
    frame?: string;
    gridColumn: number;
    gridRow: number;
    colSpan: number;
    displaySequence: number;
    labelPosition: 'Above' | 'Left' | 'Floating' | 'Hidden';
}

export interface ListElement {
    index: number;
    name: string;
    value: string;
}

// =====================================================
// Triggers, LOVs, and Other Components
// =====================================================

export interface Trigger {
    name: string;
    triggerText: string;
    decodedText: string;
    blockName?: string;
    itemName?: string;
    fireInQuery?: boolean;
    classification: TriggerClassification;
    apexTarget: ApexTarget;
}

export type TriggerClassification =
    | 'pre-render'
    | 'post-query'
    | 'validation'
    | 'user-action'
    | 'pre-dml'
    | 'post-dml'
    | 'navigation'
    | 'error'
    | 'commit'
    | 'unknown';

export interface ApexTarget {
    type: 'Process' | 'Validation' | 'Dynamic Action' | 'Computation' | 'Manual';
    point: string;
    condition?: string;
    code: string;
    instructions: string[];
    supportLevel: 'full' | 'partial' | 'manual';
}

export interface LOV {
    name: string;
    recordGroupName: string;
    columnMappings: ColumnMapping[];
    title: string;
    width: number;
    height: number;
    // APEX mapping
    apexLovType: 'Popup LOV' | 'Select List' | 'Shuttle';
}

export interface ColumnMapping {
    name: string;
    returnItem: string;
    displayWidth: number;
    title: string;
}

export interface RecordGroup {
    name: string;
    queryDataSourceType: string;
    queryText: string;
    columns: RecordGroupColumn[];
}

export interface RecordGroupColumn {
    name: string;
    dataType: string;
    maxLength: number;
}

export interface Alert {
    name: string;
    title: string;
    message: string;
    alertStyle: string;
    button1Label: string;
    button2Label?: string;
    button3Label?: string;
    defaultButton: string;
}

export interface ProgramUnit {
    name: string;
    programUnitType: string;
    programUnitText: string;
    decodedText: string;
}

// =====================================================
// Program Unit Intelligence
// =====================================================

export interface Parameter {
    name: string;
    mode: 'IN' | 'OUT' | 'IN OUT';
    dataType: string;
    defaultValue?: string;
}

export interface ProgramUnitEnriched extends ProgramUnit {
    parameters: Parameter[];
    returnType?: string;
    lineCount: number;
    dependencies: string[]; // Program units/functions this calls
    calledBy: string[]; // Triggers/program units that call this
    isMainFunction: boolean;
    mainFunctionReason?: string;
    businessResponsibility?: string;
    callTreeDepth: number; // How deep in the call tree (0 = entry point)
    classification: LogicCategory;
    impactScore: 'high' | 'medium' | 'low';
    complexity: number; // 1-10 scale
    riskFlags: string[];
}

export type LogicCategory =
    | 'UI Logic'
    | 'Validation Logic'
    | 'Business Logic'
    | 'Transaction Logic'
    | 'Integration Logic'
    | 'Security/Access Control'
    | 'Utility/Helper'
    | 'Unknown';

export interface TriggerAnalysis extends Trigger {
    calledProgramUnits: string[];
    directDML: boolean;
    logicDepth: 'simple' | 'moderate' | 'complex';
    responsibility: string; // Plain English description
    impactScore: 'high' | 'medium' | 'low';
}

export interface FormLogicHierarchy {
    entryPoints: HierarchyNode[];
    coreBusinessControllers: HierarchyNode[];
    supportingUtilities: HierarchyNode[];
    uiGlueLogic: HierarchyNode[];
}

export interface HierarchyNode {
    type: 'trigger' | 'program-unit';
    name: string;
    description: string;
    classification: LogicCategory;
    impactScore: 'high' | 'medium' | 'low';
    children: HierarchyNode[];
    callDepth: number;
}

export interface MigrationReadiness {
    overallComplexity: number; // 1-10 scale
    totalProgramUnits: number;
    highComplexityUnits: number;
    mediumComplexityUnits: number;
    lowComplexityUnits: number;
    criticalRisks: RiskItem[];
    priorityList: PriorityItem[];
    estimatedEffort: string; // e.g., "80-120 hours"
}

export interface RiskItem {
    unitName: string;
    riskType: 'tight-ui-coupling' | 'heavy-trigger-logic' | 'forms-builtins' | 'direct-dml-in-trigger' | 'complex-logic';
    description: string;
    severity: 'high' | 'medium' | 'low';
}

export interface PriorityItem {
    unitName: string;
    priority: number; // 1 = highest
    reason: string;
    estimatedHours: number;
}

export interface Relation {
    name: string;
    detailBlock: string;
    joinCondition: string;
    deleteRecord: string;
    autoQuery: boolean;
}

// =====================================================
// Analysis State
// =====================================================

export interface AnalysisState {
    files: UploadedFile[];
    currentAnalysis: FormModule | null;
    selectedBlock: string | null;
    selectedTrigger: string | null;
    selectedCanvas: string | null;
    isLoading: boolean;
    error: string | null;
}

export interface UploadedFile {
    id: string;
    name: string;
    size: number;
    uploadedAt: Date;
    status: 'pending' | 'parsing' | 'parsed' | 'error';
    formModule?: FormModule;
}

// =====================================================
// Page-Level Blueprint Types for Forms → APEX Migration
// =====================================================

import type { RegionType, RedwoodItemType, LayoutType } from './forms';

// =====================================================
// Main Page Blueprint Structure
// =====================================================

export interface PageBlueprint {
    pageIdSuggestion: number;
    pageName: string;
    sourceFormsModule: string;
    sourceCanvases: string[];
    sourceBlocks: string[];
    purpose: string;
    priority: 'main' | 'auxiliary' | 'dialog';
    theme: string;
    template: string;
    layout: LayoutDefinition;
    sections: LayoutSection[];
    childRegions: ChildRegion[];
    buttons: ButtonMapping[];
    wireframe: string;
    developerExplanation: string;
}

export interface LayoutDefinition {
    type: 'grid' | 'stacked' | 'wizard' | 'tabs';
    columns: number;
    usesSubTabs: boolean;
    usesAccordion: boolean;
}

// =====================================================
// Section & Region Definitions
// =====================================================

export interface LayoutSection {
    title: string;
    description: string;
    regionName: string;
    sourceBlocks: string[];
    items: SectionItem[];
    gridColumn: number;
    gridRow: number;
    colSpan: number;
    displaySequence: number;
    type: RegionType;
    layout: LayoutType;
}

export interface SectionItem {
    formsName: string;
    apexName: string;
    label: string;
    redwoodType: RedwoodItemType;
    gridColumn: number;
    gridRow: number;
    colSpan: number;
    required: boolean;
    readOnly: boolean;
}

export interface ChildRegion {
    title: string;
    canvas: string;
    regionName: string;
    sourceBlock: string;
    type: 'Interactive Grid' | 'Form' | 'Classic Report' | 'Cards';
    relationship: string;
    location: 'Below main form' | 'Side panel' | 'Tab' | 'Accordion';
    collapsible: boolean;
    displaySequence: number;
}

// =====================================================
// Button & Action Mappings
// =====================================================

export interface ButtonMapping {
    formsItem: string;
    apexName: string;
    label: string;
    position: 'Header Right' | 'Header Left' | 'Region Footer' | 'Dialog Footer';
    action: 'Submit' | 'Navigate' | 'Custom' | 'Process';
    iconClass?: string;
    hotkey?: string;
}

// =====================================================
// Hierarchical Mapping Structure
// =====================================================

export interface HierarchicalMapping {
    formName: string;
    totalMappings: number;
    pageMappings: PageMapping[];
}

export interface PageMapping {
    pageIdSuggestion: number;
    pageName: string;
    regions: RegionMapping[];
}

export interface RegionMapping {
    regionName: string;
    sourceFormsBlocks: string[];
    type: RegionType;
    section: string;
    items: ItemMapping[];
}

export interface ItemMapping {
    formsName: string;
    formsBlock: string;
    formsType: string;
    apexItem: string;
    apexType: RedwoodItemType;
    section: string;
    column: number;
    row: number;
    status: 'full' | 'partial' | 'manual';
}

// =====================================================
// APEX Reference Patterns (from f208.sql analysis)
// =====================================================

export interface ApexReferencePattern {
    patternName: string;
    description: string;
    pageTemplate: string;
    regionTemplate: string;
    gridColumns: number;
    useCases: string[];
}

export const APEX_PATTERNS: ApexReferencePattern[] = [
    {
        patternName: 'Master-Detail Form',
        description: 'Single-record form at top with Interactive Grid details below',
        pageTemplate: 'Standard',
        regionTemplate: 'Standard',
        gridColumns: 2,
        useCases: ['TRAB + child tables', 'Header/Lines pattern']
    },
    {
        patternName: 'Interactive Report',
        description: 'Full-page searchable report with row actions',
        pageTemplate: 'Standard',
        regionTemplate: 'Interactive Report',
        gridColumns: 1,
        useCases: ['List pages', 'Search results']
    },
    {
        patternName: 'Tabbed Form',
        description: 'Form with multiple sections organized in tabs',
        pageTemplate: 'Standard',
        regionTemplate: 'Tabs Container',
        gridColumns: 2,
        useCases: ['Large entities with many fields', 'Related data sections']
    },
    {
        patternName: 'Modal Dialog',
        description: 'Popup form for quick edits or lookups',
        pageTemplate: 'Modal Dialog',
        regionTemplate: 'Inline Dialog',
        gridColumns: 1,
        useCases: ['Edit forms', 'Confirmation dialogs', 'LOV details']
    },
    {
        patternName: 'Wizard',
        description: 'Multi-step form with navigation',
        pageTemplate: 'Wizard Modal',
        regionTemplate: 'Wizard Container',
        gridColumns: 1,
        useCases: ['Complex data entry', 'Onboarding flows']
    }
];

// =====================================================
// Section Grouping Rules (inferred from block names)
// =====================================================

export interface SectionGroupingRule {
    pattern: RegExp;
    sectionTitle: string;
    sectionType: RegionType;
    priority: number;
}

export const SECTION_GROUPING_RULES: SectionGroupingRule[] = [
    { pattern: /^TRAB(?!ALHADOR)/i, sectionTitle: 'Worker Header', sectionType: 'Form', priority: 1 },
    { pattern: /^TRABALHADOR_DADOS/i, sectionTitle: 'Personal Details', sectionType: 'Form', priority: 2 },
    { pattern: /^TRABALHADOR_ESTCIV/i, sectionTitle: 'Civil Status', sectionType: 'Form', priority: 3 },
    { pattern: /^TRABALHADOR_FERIAS/i, sectionTitle: 'Holidays', sectionType: 'Form', priority: 4 },
    { pattern: /^MORADAS|^RH_MORADAS/i, sectionTitle: 'Addresses', sectionType: 'Interactive Grid', priority: 10 },
    { pattern: /^CONTACTOS|^RH_CONTACTOS/i, sectionTitle: 'Contacts', sectionType: 'Interactive Grid', priority: 11 },
    { pattern: /^FERIAS|^RH_FERIAS/i, sectionTitle: 'Holidays', sectionType: 'Interactive Grid', priority: 12 },
    { pattern: /^FALTAS|^RH_FALTAS/i, sectionTitle: 'Absences', sectionType: 'Interactive Grid', priority: 13 },
    { pattern: /^HAB_LITER|^HABILITACOES/i, sectionTitle: 'Education', sectionType: 'Interactive Grid', priority: 14 },
    { pattern: /^DECLARACOES/i, sectionTitle: 'Declarations', sectionType: 'Interactive Grid', priority: 15 },
    { pattern: /CRIACAO|ALTERACAO|AUDIT/i, sectionTitle: 'Audit Info', sectionType: 'Display Only', priority: 99 },
    { pattern: /^CTRL_|^CONTROL/i, sectionTitle: 'Controls', sectionType: 'Static Content', priority: 0 },
    { pattern: /^WEBUTIL/i, sectionTitle: 'Technical', sectionType: 'Static Content', priority: 100 },
];

// =====================================================
// Redwood Theme Constants
// =====================================================

export const REDWOOD_THEME = {
    themeId: 42,
    themeName: 'Redwood Light',
    themeStyle: 'Vita',
    pageTemplates: {
        standard: 'Standard',
        leftSideColumn: 'Left Side Column',
        rightSideColumn: 'Right Side Column',
        modalDialog: 'Modal Dialog',
        drawer: 'Drawer',
        wizard: 'Wizard Modal'
    },
    regionTemplates: {
        standard: 'Standard',
        cardsContainer: 'Cards Container',
        collapsible: 'Collapsible',
        tabsContainer: 'Tabs Container',
        interactiveReport: 'Interactive Report',
        form: 'Blank with Attributes'
    },
    itemTemplates: {
        standard: 'Optional - Above',
        required: 'Required - Above',
        hidden: 'Hidden',
        floatingLabel: 'Optional - Floating'
    }
};

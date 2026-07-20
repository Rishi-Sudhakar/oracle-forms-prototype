import type {
    FormLogicHierarchy,
    HierarchyNode,
    TriggerAnalysis,
    ProgramUnitEnriched,
} from '../types/forms';

// =====================================================
// Hierarchy Builder - Creates form logic hierarchy
// =====================================================

/**
 * Builds a hierarchical view of form logic
 */
export function buildFormLogicHierarchy(
    triggers: TriggerAnalysis[],
    programUnits: ProgramUnitEnriched[]
): FormLogicHierarchy {
    // Identify entry point triggers
    const entryPointTriggers = triggers.filter(isEntryPointTrigger);

    // Build hierarchy
    const entryPoints = entryPointTriggers.map((trigger) =>
        buildTriggerNode(trigger, programUnits, new Set(), 0)
    );

    // Identify main functions (core business controllers)
    const mainFunctionNodes = programUnits
        .filter((unit) => unit.isMainFunction)
        .map((unit) => buildProgramUnitNode(unit, programUnits, new Set(), 0));

    // Supporting utilities (helpers)
    const supportingUtilities = programUnits
        .filter((unit) => !unit.isMainFunction && unit.classification === 'Utility/Helper')
        .map((unit) => buildProgramUnitNode(unit, programUnits, new Set(), 0));

    // UI glue logic (low-impact triggers)
    const uiGlueTriggers = triggers.filter(
        (t) => !isEntryPointTrigger(t) && t.impactScore === 'low'
    );
    const uiGlueNodes = uiGlueTriggers.map((trigger) =>
        buildTriggerNode(trigger, programUnits, new Set(), 0)
    );

    return {
        entryPoints,
        coreBusinessControllers: mainFunctionNodes,
        supportingUtilities,
        uiGlueLogic: uiGlueNodes,
    };
}

/**
 * Check if trigger is an entry point
 */
function isEntryPointTrigger(trigger: TriggerAnalysis): boolean {
    const name = trigger.name.toUpperCase();

    return (
        name.includes('WHEN-NEW-FORM-INSTANCE') ||
        name.includes('PRE-FORM') ||
        name.includes('PRE-QUERY') ||
        name.includes('WHEN-BUTTON-PRESSED') ||
        name.includes('ON-COMMIT') ||
        name.includes('KEY-COMMIT')
    );
}

/**
 * Build hierarchy node for trigger
 */
function buildTriggerNode(
    trigger: TriggerAnalysis,
    programUnits: ProgramUnitEnriched[],
    visited: Set<string>,
    depth: number
): HierarchyNode {
    const nodeId = `trigger_${trigger.name}_${trigger.blockName || 'form'}_${trigger.itemName || ''}`;

    if (visited.has(nodeId) || depth > 3) {
        return {
            type: 'trigger',
            name: trigger.name,
            description: trigger.responsibility,
            classification: mapTriggerClassificationToLogicCategory(trigger.classification),
            impactScore: trigger.impactScore,
            children: [],
            callDepth: depth,
        };
    }

    visited.add(nodeId);

    // Find called program units and build children
    const children: HierarchyNode[] = [];
    trigger.calledProgramUnits.forEach((unitName) => {
        const unit = programUnits.find((u) => u.name === unitName);
        if (unit) {
            children.push(buildProgramUnitNode(unit, programUnits, visited, depth + 1));
        }
    });

    return {
        type: 'trigger',
        name: formatTriggerName(trigger),
        description: trigger.responsibility,
        classification: mapTriggerClassificationToLogicCategory(trigger.classification),
        impactScore: trigger.impactScore,
        children,
        callDepth: depth,
    };
}

/**
 * Build hierarchy node for program unit
 */
function buildProgramUnitNode(
    unit: ProgramUnitEnriched,
    allUnits: ProgramUnitEnriched[],
    visited: Set<string>,
    depth: number
): HierarchyNode {
    if (visited.has(unit.name) || depth > 3) {
        return {
            type: 'program-unit',
            name: unit.name,
            description: unit.businessResponsibility || formatProgramUnitName(unit.name),
            classification: unit.classification,
            impactScore: unit.impactScore,
            children: [],
            callDepth: depth,
        };
    }

    visited.add(unit.name);

    // Build children from dependencies
    const children: HierarchyNode[] = [];
    unit.dependencies.forEach((depName) => {
        const depUnit = allUnits.find((u) => u.name === depName);
        if (depUnit) {
            children.push(buildProgramUnitNode(depUnit, allUnits, visited, depth + 1));
        }
    });

    return {
        type: 'program-unit',
        name: unit.name,
        description: unit.businessResponsibility || formatProgramUnitName(unit.name),
        classification: unit.classification,
        impactScore: unit.impactScore,
        children,
        callDepth: depth,
    };
}

/**
 * Map trigger classification to LogicCategory
 */
function mapTriggerClassificationToLogicCategory(
    classification: string
): 'UI Logic' | 'Validation Logic' | 'Business Logic' | 'Transaction Logic' | 'Unknown' {
    switch (classification) {
        case 'validation':
            return 'Validation Logic';
        case 'pre-dml':
        case 'post-dml':
        case 'commit':
            return 'Transaction Logic';
        case 'user-action':
        case 'navigation':
            return 'UI Logic';
        case 'pre-render':
        case 'post-query':
            return 'Business Logic';
        default:
            return 'Unknown';
    }
}

/**
 * Format trigger name for display
 */
function formatTriggerName(trigger: TriggerAnalysis): string {
    let name = trigger.name;

    if (trigger.blockName) {
        name += ` (${trigger.blockName}`;
        if (trigger.itemName) {
            name += `.${trigger.itemName}`;
        }
        name += ')';
    }

    return name;
}

/**
 * Format program unit name for display
 */
function formatProgramUnitName(name: string): string {
    return name.replace(/_/g, ' ').toLowerCase();
}

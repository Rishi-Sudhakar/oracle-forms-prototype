import type { Trigger, TriggerAnalysis, ProgramUnitEnriched } from '../types/forms';

// =====================================================
// Trigger Analyzer - Analyzes triggers and their relationships
// =====================================================

/**
 * Analyzes a trigger and enriches it with call information
 */
export function analyzeTrigger(
    trigger: Trigger,
    allProgramUnits: ProgramUnitEnriched[]
): TriggerAnalysis {
    const code = trigger.decodedText;

    return {
        ...trigger,
        calledProgramUnits: extractProgramUnitCalls(code, allProgramUnits),
        directDML: detectDirectDML(code),
        logicDepth: calculateLogicDepth(code),
        responsibility: generateResponsibility(trigger, code),
        impactScore: calculateTriggerImpactScore(trigger, code),
    };
}

/**
 * Extract program unit calls from trigger code
 */
function extractProgramUnitCalls(code: string, allProgramUnits: ProgramUnitEnriched[]): string[] {
    const calls = new Set<string>();

    allProgramUnits.forEach((unit) => {
        // Look for calls to this program unit
        const callRegex = new RegExp(`\\b${unit.name}\\s*\\(`, 'gi');
        if (callRegex.test(code)) {
            calls.add(unit.name);
        }
    });

    return Array.from(calls);
}

/**
 * Detect if trigger contains direct DML operations
 */
function detectDirectDML(code: string): boolean {
    const upperCode = code.toUpperCase();

    return (
        upperCode.includes('INSERT INTO') ||
        upperCode.includes('UPDATE') && upperCode.includes('SET') ||
        upperCode.includes('DELETE FROM')
    );
}

/**
 * Calculate logic depth (simple/moderate/complex)
 */
function calculateLogicDepth(code: string): 'simple' | 'moderate' | 'complex' {
    const lines = code.split('\n').filter((line) => line.trim() && !line.trim().startsWith('--')).length;

    const ifCount = (code.match(/\bIF\b/gi) || []).length;
    const loopCount = (code.match(/\b(FOR|WHILE|LOOP)\b/gi) || []).length;

    const complexity = lines + ifCount * 2 + loopCount * 3;

    if (complexity > 50) return 'complex';
    if (complexity > 15) return 'moderate';
    return 'simple';
}

/**
 * Generate plain-English responsibility description
 */
function generateResponsibility(trigger: Trigger, code: string): string {
    const triggerName = trigger.name.toUpperCase();
    const upperCode = code.toUpperCase();

    // Pre-render triggers
    if (triggerName.includes('PRE-FORM') || triggerName.includes('WHEN-NEW-FORM')) {
        return 'Initializes form state and prepares the UI when the form loads';
    }

    if (triggerName.includes('PRE-BLOCK') || triggerName.includes('WHEN-NEW-BLOCK')) {
        return 'Sets up block-level defaults and configurations when entering the block';
    }

    // Query triggers
    if (triggerName.includes('PRE-QUERY')) {
        return 'Modifies query criteria before data is retrieved from the database';
    }

    if (triggerName.includes('POST-QUERY')) {
        return 'Enriches or transforms data after it has been queried from the database';
    }

    // Validation triggers
    if (triggerName.includes('WHEN-VALIDATE-ITEM') || triggerName.includes('WHEN-VALIDATE-RECORD')) {
        return 'Validates user input and enforces business rules';
    }

    // Button/action triggers
    if (triggerName.includes('WHEN-BUTTON-PRESSED')) {
        const itemName = trigger.itemName || 'button';
        if (upperCode.includes('COMMIT') || upperCode.includes('POST')) {
            return `Saves data to the database when ${itemName} is clicked`;
        }
        if (upperCode.includes('DELETE')) {
            return `Deletes the current record when ${itemName} is clicked`;
        }
        if (upperCode.includes('QUERY') || upperCode.includes('EXECUTE_QUERY')) {
            return `Retrieves data from the database when ${itemName} is clicked`;
        }
        return `Executes custom logic when ${itemName} is clicked`;
    }

    // DML triggers
    if (triggerName.includes('PRE-INSERT')) {
        return 'Prepares and validates data before inserting a new record';
    }

    if (triggerName.includes('POST-INSERT')) {
        return 'Performs follow-up actions after a record has been inserted';
    }

    if (triggerName.includes('PRE-UPDATE')) {
        return 'Validates and prepares changes before updating a record';
    }

    if (triggerName.includes('POST-UPDATE')) {
        return 'Performs follow-up actions after a record has been updated';
    }

    if (triggerName.includes('PRE-DELETE')) {
        return 'Validates and confirms deletion before removing a record';
    }

    if (triggerName.includes('POST-DELETE')) {
        return 'Performs cleanup actions after a record has been deleted';
    }

    // Commit triggers
    if (triggerName.includes('ON-COMMIT') || triggerName.includes('KEY-COMMIT')) {
        return 'Validates all changes and commits the transaction to the database';
    }

    // Navigation triggers
    if (triggerName.includes('WHEN-NEW-RECORD-INSTANCE')) {
        return 'Initializes default values when creating a new record';
    }

    if (triggerName.includes('WHEN-NEW-ITEM-INSTANCE')) {
        return 'Performs actions when focus moves to a new item';
    }

    // Item change triggers
    if (triggerName.includes('WHEN-LIST-CHANGED') || triggerName.includes('WHEN-CHECKBOX-CHANGED')) {
        return 'Responds to user selection changes and updates dependent fields';
    }

    // Generic fallback
    if (upperCode.includes('SET_ITEM_PROPERTY') || upperCode.includes('GO_ITEM')) {
        return 'Controls UI behavior and navigation';
    }

    if (upperCode.includes('MESSAGE') || upperCode.includes('SHOW_ALERT')) {
        return 'Displays messages or alerts to the user';
    }

    return 'Executes custom business logic';
}

/**
 * Calculate impact score for triggers
 */
function calculateTriggerImpactScore(trigger: Trigger, code: string): 'high' | 'medium' | 'low' {
    const upperCode = code.toUpperCase();
    let score = 0;

    // High impact patterns
    if (upperCode.includes('COMMIT')) score += 3;
    if (upperCode.includes('ROLLBACK')) score += 2;
    if (upperCode.includes('INSERT INTO')) score += 2;
    if (upperCode.includes('UPDATE') && upperCode.includes('SET')) score += 2;
    if (upperCode.includes('DELETE FROM')) score += 2;

    // Entry point triggers are high impact
    const triggerName = trigger.name.toUpperCase();
    if (
        triggerName.includes('WHEN-NEW-FORM') ||
        triggerName.includes('PRE-FORM') ||
        triggerName.includes('WHEN-BUTTON-PRESSED') ||
        triggerName.includes('ON-COMMIT')
    ) {
        score += 2;
    }

    // Medium impact patterns
    if (upperCode.includes('EXECUTE_QUERY')) score += 1;
    if (upperCode.includes('CLEAR_BLOCK')) score += 1;

    // Line count impact
    const lines = code.split('\n').filter((line) => line.trim()).length;
    if (lines > 30) score += 1;

    if (score >= 5) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
}

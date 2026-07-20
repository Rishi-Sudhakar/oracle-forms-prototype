import type { MigrationReadiness, ProgramUnitEnriched, RiskItem, PriorityItem } from '../types/forms';

// =====================================================
// Migration Readiness - Calculates migration complexity and priorities
// =====================================================

/**
 * Analyzes migration readiness
 */
export function analyzeMigrationReadiness(programUnits: ProgramUnitEnriched[]): MigrationReadiness {
    const highComplexityUnits = programUnits.filter((u) => u.complexity >= 7);
    const mediumComplexityUnits = programUnits.filter((u) => u.complexity >= 4 && u.complexity < 7);
    const lowComplexityUnits = programUnits.filter((u) => u.complexity < 4);

    const overallComplexity = calculateOverallComplexity(programUnits);
    const criticalRisks = identifyCriticalRisks(programUnits);
    const priorityList = generatePriorityList(programUnits);
    const estimatedEffort = estimateEffort(programUnits);

    return {
        overallComplexity,
        totalProgramUnits: programUnits.length,
        highComplexityUnits: highComplexityUnits.length,
        mediumComplexityUnits: mediumComplexityUnits.length,
        lowComplexityUnits: lowComplexityUnits.length,
        criticalRisks,
        priorityList,
        estimatedEffort,
    };
}

/**
 * Calculate overall complexity score
 */
function calculateOverallComplexity(programUnits: ProgramUnitEnriched[]): number {
    if (programUnits.length === 0) return 1;

    const totalComplexity = programUnits.reduce((sum, unit) => sum + unit.complexity, 0);
    const avgComplexity = totalComplexity / programUnits.length;

    // Weight by impact
    const highImpactCount = programUnits.filter((u) => u.impactScore === 'high').length;
    const impactWeight = highImpactCount > 5 ? 1.5 : 1.2;

    return Math.min(Math.round(avgComplexity * impactWeight), 10);
}

/**
 * Identify critical risks
 */
function identifyCriticalRisks(programUnits: ProgramUnitEnriched[]): RiskItem[] {
    const risks: RiskItem[] = [];

    programUnits.forEach((unit) => {
        // Check for Forms builtins
        const formsBuiltins = unit.riskFlags.filter((flag) => flag.includes('Forms builtin'));
        if (formsBuiltins.length > 0) {
            risks.push({
                unitName: unit.name,
                riskType: 'forms-builtins',
                description: `Uses ${formsBuiltins.length} Forms-specific builtins that must be rewritten for APEX`,
                severity: formsBuiltins.length > 3 ? 'high' : 'medium',
            });
        }

        // Check for tight UI coupling (many UI-related calls)
        const uiCalls = (unit.decodedText.match(/SET_ITEM_PROPERTY|GET_ITEM_PROPERTY|GO_ITEM|GO_BLOCK/gi) || [])
            .length;
        if (uiCalls > 5) {
            risks.push({
                unitName: unit.name,
                riskType: 'tight-ui-coupling',
                description: `Contains ${uiCalls} UI-specific calls - requires significant refactoring for APEX`,
                severity: 'high',
            });
        }

        // Check for complex logic
        if (unit.complexity >= 8) {
            risks.push({
                unitName: unit.name,
                riskType: 'complex-logic',
                description: `High complexity (${unit.complexity}/10) - requires careful analysis and testing`,
                severity: unit.complexity >= 9 ? 'high' : 'medium',
            });
        }

        // Check for dynamic SQL
        if (unit.riskFlags.some((flag) => flag.includes('Dynamic SQL'))) {
            risks.push({
                unitName: unit.name,
                riskType: 'complex-logic',
                description: 'Uses dynamic SQL - requires validation and security review',
                severity: 'medium',
            });
        }
    });

    // Sort by severity
    return risks.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
    });
}

/**
 * Generate priority list for migration
 */
function generatePriorityList(programUnits: ProgramUnitEnriched[]): PriorityItem[] {
    const items: PriorityItem[] = [];

    programUnits.forEach((unit) => {
        // Calculate priority score (lower is higher priority)
        let priorityScore = 100;

        // Main functions get higher priority
        if (unit.isMainFunction) priorityScore -= 30;

        // High impact gets higher priority
        if (unit.impactScore === 'high') priorityScore -= 20;
        if (unit.impactScore === 'medium') priorityScore -= 10;

        // Transaction logic gets higher priority
        if (unit.classification === 'Transaction Logic') priorityScore -= 15;
        if (unit.classification === 'Business Logic') priorityScore -= 10;

        // Called by many triggers gets higher priority
        const triggerCallers = unit.calledBy.filter((c) => c.startsWith('Trigger:')).length;
        priorityScore -= triggerCallers * 5;

        // Lower complexity gets higher priority (easier wins first)
        priorityScore += unit.complexity * 2;

        items.push({
            unitName: unit.name,
            priority: 0, // Will be set after sorting
            reason: generatePriorityReason(unit, triggerCallers),
            estimatedHours: estimateUnitHours(unit),
        });

        // Store score temporarily
        (items[items.length - 1] as any).score = priorityScore;
    });

    // Sort by score and assign priorities
    items.sort((a, b) => (a as any).score - (b as any).score);
    items.forEach((item, index) => {
        item.priority = index + 1;
        delete (item as any).score;
    });

    return items.slice(0, 20); // Return top 20
}

/**
 * Generate priority reason
 */
function generatePriorityReason(unit: ProgramUnitEnriched, triggerCallers: number): string {
    const reasons: string[] = [];

    if (unit.isMainFunction) {
        reasons.push('Main function');
    }

    if (triggerCallers > 0) {
        reasons.push(`called by ${triggerCallers} trigger${triggerCallers > 1 ? 's' : ''}`);
    }

    if (unit.impactScore === 'high') {
        reasons.push('high impact on data');
    }

    if (unit.classification === 'Transaction Logic') {
        reasons.push('transaction controller');
    }

    if (unit.complexity < 5) {
        reasons.push('relatively simple to migrate');
    }

    return reasons.join('; ') || 'Standard migration';
}

/**
 * Estimate hours for a single unit
 */
function estimateUnitHours(unit: ProgramUnitEnriched): number {
    let hours = 2; // Base

    // Add for complexity
    hours += unit.complexity * 0.5;

    // Add for Forms builtins
    const formsBuiltins = unit.riskFlags.filter((f) => f.includes('Forms builtin')).length;
    hours += formsBuiltins * 0.5;

    // Add for line count
    if (unit.lineCount > 100) hours += 2;
    else if (unit.lineCount > 50) hours += 1;

    // Add for UI coupling
    const uiCalls = (unit.decodedText.match(/SET_ITEM_PROPERTY|GET_ITEM_PROPERTY|GO_ITEM|GO_BLOCK/gi) || [])
        .length;
    hours += Math.min(uiCalls * 0.3, 4);

    return Math.round(hours);
}

/**
 * Estimate total effort
 */
function estimateEffort(programUnits: ProgramUnitEnriched[]): string {
    const totalHours = programUnits.reduce((sum, unit) => sum + estimateUnitHours(unit), 0);

    // Add overhead for integration, testing, and documentation
    const withOverhead = Math.round(totalHours * 1.3);

    const low = Math.round(withOverhead * 0.8);
    const high = Math.round(withOverhead * 1.2);

    return `${low}-${high} hours`;
}

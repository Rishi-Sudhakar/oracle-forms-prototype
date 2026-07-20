import type { ProgramUnit, ProgramUnitEnriched, Parameter, LogicCategory } from '../types/forms';

// =====================================================
// Program Unit Analyzer - Extracts and enriches program units
// =====================================================

/**
 * Analyzes a program unit and enriches it with metadata
 */
export function analyzeProgramUnit(
    programUnit: ProgramUnit,
    allProgramUnits: ProgramUnit[],
    allTriggers: { name: string; decodedText: string }[]
): ProgramUnitEnriched {
    const code = programUnit.decodedText;
    const unitName = programUnit.name;

    return {
        ...programUnit,
        parameters: extractParameters(code, programUnit.programUnitType),
        returnType: extractReturnType(code, programUnit.programUnitType),
        lineCount: countLines(code),
        dependencies: extractDependencies(code, allProgramUnits),
        calledBy: findCallers(unitName, allProgramUnits, allTriggers),
        isMainFunction: false, // Will be set by main function detector
        businessResponsibility: undefined,
        mainFunctionReason: undefined,
        callTreeDepth: 0, // Will be calculated by hierarchy builder
        classification: classifyProgramUnit(code, programUnit.programUnitType),
        impactScore: calculateImpactScore(code, programUnit.programUnitType),
        complexity: calculateComplexity(code),
        riskFlags: detectRiskFlags(code),
    };
}

/**
 * Extract parameters from procedure/function signature
 */
function extractParameters(code: string, _unitType: string): Parameter[] {
    const parameters: Parameter[] = [];

    // Match procedure/function signature
    const signatureRegex = /(PROCEDURE|FUNCTION)\s+\w+\s*\(([\s\S]*?)\)/i;
    const match = code.match(signatureRegex);

    if (!match || !match[2]) return parameters;

    const paramsText = match[2];
    const paramParts = paramsText.split(',');

    paramParts.forEach((part) => {
        const trimmed = part.trim();
        if (!trimmed) return;

        // Parse: param_name [IN|OUT|IN OUT] data_type [DEFAULT value]
        const paramRegex = /(\w+)\s+(IN\s+OUT|IN|OUT)?\s*(\w+(?:\([^)]*\))?)\s*(DEFAULT\s+(.+))?/i;
        const paramMatch = trimmed.match(paramRegex);

        if (paramMatch) {
            parameters.push({
                name: paramMatch[1],
                mode: (paramMatch[2]?.trim().toUpperCase() as Parameter['mode']) || 'IN',
                dataType: paramMatch[3],
                defaultValue: paramMatch[5]?.trim(),
            });
        }
    });

    return parameters;
}

/**
 * Extract return type for functions
 */
function extractReturnType(code: string, unitType: string): string | undefined {
    if (unitType.toUpperCase() !== 'FUNCTION') return undefined;

    const returnRegex = /RETURN\s+(\w+(?:\([^)]*\))?)/i;
    const match = code.match(returnRegex);

    return match ? match[1] : undefined;
}

/**
 * Count lines of code
 */
function countLines(code: string): number {
    return code.split('\n').filter((line) => line.trim() && !line.trim().startsWith('--')).length;
}

/**
 * Extract dependencies (other program units called by this one)
 */
function extractDependencies(code: string, allProgramUnits: ProgramUnit[]): string[] {
    const dependencies = new Set<string>();

    allProgramUnits.forEach((unit) => {
        // Look for calls to this unit (function calls or procedure calls)
        const callRegex = new RegExp(`\\b${unit.name}\\s*\\(`, 'gi');
        if (callRegex.test(code)) {
            dependencies.add(unit.name);
        }
    });

    return Array.from(dependencies);
}

/**
 * Find what triggers/program units call this program unit
 */
function findCallers(
    unitName: string,
    allProgramUnits: ProgramUnit[],
    allTriggers: { name: string; decodedText: string }[]
): string[] {
    const callers = new Set<string>();

    // Check triggers
    allTriggers.forEach((trigger) => {
        const callRegex = new RegExp(`\\b${unitName}\\s*\\(`, 'gi');
        if (callRegex.test(trigger.decodedText)) {
            callers.add(`Trigger: ${trigger.name}`);
        }
    });

    // Check other program units
    allProgramUnits.forEach((unit) => {
        if (unit.name === unitName) return; // Skip self
        const callRegex = new RegExp(`\\b${unitName}\\s*\\(`, 'gi');
        if (callRegex.test(unit.decodedText)) {
            callers.add(unit.name);
        }
    });

    return Array.from(callers);
}

/**
 * Classify program unit by logic category
 */
function classifyProgramUnit(code: string, unitType: string): LogicCategory {
    const upperCode = code.toUpperCase();

    // UI Logic patterns
    if (
        upperCode.includes('SET_ITEM_PROPERTY') ||
        upperCode.includes('GO_ITEM') ||
        upperCode.includes('GO_BLOCK') ||
        upperCode.includes('SHOW_VIEW') ||
        upperCode.includes('HIDE_VIEW') ||
        upperCode.includes('SET_WINDOW_PROPERTY')
    ) {
        return 'UI Logic';
    }

    // Transaction Logic patterns
    if (
        upperCode.includes('COMMIT') ||
        upperCode.includes('ROLLBACK') ||
        (upperCode.includes('INSERT INTO') && upperCode.includes('VALUES')) ||
        (upperCode.includes('UPDATE') && upperCode.includes('SET')) ||
        upperCode.includes('DELETE FROM')
    ) {
        return 'Transaction Logic';
    }

    // Validation Logic patterns
    if (
        upperCode.includes('VALIDATE') ||
        upperCode.includes('CHECK_') ||
        upperCode.includes('IS_VALID') ||
        upperCode.includes('RAISE_APPLICATION_ERROR') ||
        (upperCode.includes('IF') && upperCode.includes('THEN') && upperCode.includes('ERROR'))
    ) {
        return 'Validation Logic';
    }

    // Integration Logic patterns
    if (
        upperCode.includes('UTL_HTTP') ||
        upperCode.includes('UTL_FILE') ||
        upperCode.includes('DBMS_') ||
        upperCode.includes('EXTERNAL') ||
        upperCode.includes('WEB_SERVICE')
    ) {
        return 'Integration Logic';
    }

    // Security/Access Control patterns
    if (
        upperCode.includes('CHECK_ACCESS') ||
        upperCode.includes('AUTHORIZE') ||
        upperCode.includes('USER_ROLE') ||
        upperCode.includes('PERMISSION') ||
        upperCode.includes('AUTHENTICATE')
    ) {
        return 'Security/Access Control';
    }

    // Business Logic (broad category)
    if (
        upperCode.includes('CALCULATE') ||
        upperCode.includes('PROCESS') ||
        upperCode.includes('APPROVE') ||
        upperCode.includes('SUBMIT') ||
        upperCode.includes('STATUS')
    ) {
        return 'Business Logic';
    }

    // Utility/Helper (small, reusable functions)
    if (
        unitType.toUpperCase() === 'FUNCTION' &&
        (upperCode.includes('TO_') ||
            upperCode.includes('GET_') ||
            upperCode.includes('FORMAT_') ||
            upperCode.includes('CONVERT_'))
    ) {
        return 'Utility/Helper';
    }

    return 'Unknown';
}

/**
 * Calculate impact score based on code patterns
 */
function calculateImpactScore(code: string, _unitType: string): 'high' | 'medium' | 'low' {
    const upperCode = code.toUpperCase();
    let score = 0;

    // High impact indicators
    if (upperCode.includes('COMMIT')) score += 3;
    if (upperCode.includes('ROLLBACK')) score += 2;
    if (upperCode.includes('INSERT INTO')) score += 2;
    if (upperCode.includes('UPDATE') && upperCode.includes('SET')) score += 2;
    if (upperCode.includes('DELETE FROM')) score += 2;

    // Medium impact indicators
    if (upperCode.includes('EXECUTE_QUERY')) score += 1;
    if (upperCode.includes('CLEAR_BLOCK')) score += 1;
    if (upperCode.includes('SHOW_LOV')) score += 1;

    // Line count impact
    const lines = countLines(code);
    if (lines > 100) score += 2;
    else if (lines > 50) score += 1;

    if (score >= 5) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
}

/**
 * Calculate complexity score (1-10)
 */
function calculateComplexity(code: string): number {
    let complexity = 1;

    // Cyclomatic complexity indicators
    const ifCount = (code.match(/\bIF\b/gi) || []).length;
    const loopCount = (code.match(/\b(FOR|WHILE|LOOP)\b/gi) || []).length;
    const caseCount = (code.match(/\bCASE\b/gi) || []).length;

    complexity += ifCount * 0.5;
    complexity += loopCount * 1;
    complexity += caseCount * 0.5;

    // Line count
    const lines = countLines(code);
    if (lines > 200) complexity += 3;
    else if (lines > 100) complexity += 2;
    else if (lines > 50) complexity += 1;

    // Nested structure
    const nestedIfCount = (code.match(/IF[\s\S]*?IF[\s\S]*?END IF[\s\S]*?END IF/gi) || []).length;
    complexity += nestedIfCount * 1.5;

    // DML operations
    const dmlCount =
        (code.match(/\bINSERT\b/gi) || []).length +
        (code.match(/\bUPDATE\b/gi) || []).length +
        (code.match(/\bDELETE\b/gi) || []).length;
    complexity += dmlCount * 0.5;

    return Math.min(Math.round(complexity), 10);
}

/**
 * Detect risk flags
 */
function detectRiskFlags(code: string): string[] {
    const flags: string[] = [];
    const upperCode = code.toUpperCase();

    // Forms-specific builtins
    const formsBuiltins = [
        'GO_BLOCK',
        'GO_ITEM',
        'EXECUTE_QUERY',
        'CLEAR_BLOCK',
        'SYNCHRONIZE',
        'FORMS_OLE',
        'HOST',
        'SHOW_LOV',
        'SET_ITEM_PROPERTY',
        'GET_ITEM_PROPERTY',
    ];

    formsBuiltins.forEach((builtin) => {
        if (upperCode.includes(builtin)) {
            flags.push(`Forms builtin: ${builtin}`);
        }
    });

    // Direct DML in non-transaction logic
    if (
        (upperCode.includes('INSERT INTO') || upperCode.includes('UPDATE') || upperCode.includes('DELETE FROM')) &&
        !upperCode.includes('COMMIT')
    ) {
        flags.push('Direct DML without explicit COMMIT');
    }

    // Dynamic SQL
    if (upperCode.includes('EXECUTE IMMEDIATE')) {
        flags.push('Dynamic SQL detected');
    }

    // External dependencies
    if (upperCode.includes('UTL_') || upperCode.includes('DBMS_')) {
        flags.push('External package dependencies');
    }

    return flags;
}

/**
 * Identify main functions using heuristics
 */
export function identifyMainFunctions(enrichedUnits: ProgramUnitEnriched[]): void {
    enrichedUnits.forEach((unit) => {
        const reasons: string[] = [];
        let isMain = false;

        // Heuristic 1: Called by multiple triggers
        const triggerCalls = unit.calledBy.filter((caller) => caller.startsWith('Trigger:')).length;
        if (triggerCalls >= 2) {
            isMain = true;
            reasons.push(`Called by ${triggerCalls} triggers`);
        }

        // Heuristic 2: Transaction controller
        if (
            unit.classification === 'Transaction Logic' &&
            (unit.decodedText.toUpperCase().includes('COMMIT') || unit.decodedText.toUpperCase().includes('ROLLBACK'))
        ) {
            isMain = true;
            reasons.push('Transaction controller');
        }

        // Heuristic 3: Orchestrates multiple dependencies
        if (unit.dependencies.length >= 3) {
            isMain = true;
            reasons.push(`Orchestrates ${unit.dependencies.length} program units`);
        }

        // Heuristic 4: High complexity + high impact
        if (unit.complexity >= 7 && unit.impactScore === 'high') {
            isMain = true;
            reasons.push('High complexity and high impact');
        }

        // Heuristic 5: Business logic with substantial code
        if (unit.classification === 'Business Logic' && unit.lineCount > 50) {
            isMain = true;
            reasons.push('Substantial business logic');
        }

        if (isMain) {
            unit.isMainFunction = true;
            unit.mainFunctionReason = reasons.join('; ');
            unit.businessResponsibility = generateBusinessResponsibility(unit);
        }
    });
}

/**
 * Generate business responsibility description
 */
function generateBusinessResponsibility(unit: ProgramUnitEnriched): string {
    const name = unit.name.toLowerCase().replace(/_/g, ' ');

    if (unit.classification === 'Transaction Logic') {
        return `Manages data persistence and transaction control for ${name}`;
    }

    if (unit.classification === 'Validation Logic') {
        return `Validates and enforces business rules for ${name}`;
    }

    if (unit.classification === 'Business Logic') {
        return `Implements core business logic for ${name}`;
    }

    return `Orchestrates ${unit.dependencies.length} related operations for ${name}`;
}

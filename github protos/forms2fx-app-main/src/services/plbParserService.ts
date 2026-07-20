// =====================================================
// PLB/SQL Parser Service - Robust Version v2
// Handles all PL/SQL block structures correctly
// =====================================================

import type { ExtractedUnit } from '../types/plbTypes';
import { commentOutBuiltins } from './formsBuiltinsService';
import { extractDependencies, calculateComplexity, generateChecklist, detectCalledProcedures } from './plbDependencyExtractor';
import { detectSemanticPatterns } from './semanticPatternDetector';

/**
 * Parse a PLB/SQL file and extract all program units
 */
export function parsePLBFile(content: string, _fileName: string): ExtractedUnit[] {
    // Normalize line endings
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Extract all units
    const units = extractAllUnits(normalizedContent);

    // Build registry of all unit names
    const registry = units.map(u => u.name);

    // Post-process: detect internal procedure/function calls
    for (const unit of units) {
        unit.dependencies.calledProcedures = detectCalledProcedures(
            unit.originalCode,
            registry,
            unit.name
        );
    }

    return units;
}

/**
 * Extract all procedures and functions from the content
 */
function extractAllUnits(content: string): ExtractedUnit[] {
    const units: ExtractedUnit[] = [];
    const lines = content.split('\n');

    // Find all unit start positions
    const unitStarts: Array<{ name: string; type: 'Procedure' | 'Function'; lineIndex: number }> = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip comment lines
        if (line.trim().startsWith('--')) continue;

        // Remove inline comments for matching
        const cleanLine = line.replace(/--.*$/, '').trim().toUpperCase();
        if (!cleanLine) continue;

        // Match PROCEDURE name (with optional CREATE OR REPLACE)
        const procMatch = cleanLine.match(/^(?:CREATE\s+(?:OR\s+REPLACE\s+)?)?PROCEDURE\s+([A-Z_][A-Z0-9_$#]*)/i);
        if (procMatch) {
            unitStarts.push({
                name: procMatch[1],
                type: 'Procedure',
                lineIndex: i
            });
            continue;
        }

        // Match FUNCTION name RETURN (with optional CREATE OR REPLACE)
        const funcMatch = cleanLine.match(/^(?:CREATE\s+(?:OR\s+REPLACE\s+)?)?FUNCTION\s+([A-Z_][A-Z0-9_$#]*)/i);
        if (funcMatch) {
            unitStarts.push({
                name: funcMatch[1],
                type: 'Function',
                lineIndex: i
            });
            continue;
        }
    }

    // Now find the end of each unit
    for (let idx = 0; idx < unitStarts.length; idx++) {
        const start = unitStarts[idx];

        // The next unit starts where? (or end of file)
        const nextUnitLine = idx < unitStarts.length - 1
            ? unitStarts[idx + 1].lineIndex
            : lines.length;

        // Find the END of this procedure/function
        const endLineIndex = findUnitEnd(lines, start.lineIndex, nextUnitLine, start.name);

        // Extract the code
        const unitLines = lines.slice(start.lineIndex, endLineIndex + 1);
        const originalCode = unitLines.join('\n');

        // Create the unit
        const unit = createUnit(
            start.name,
            start.type,
            originalCode,
            content,
            getPositionFromLine(lines, start.lineIndex)
        );

        units.push(unit);
    }

    return units;
}

/**
 * Find the end line of a procedure/function
 * Tracks ALL PL/SQL block structures:
 * - BEGIN/END
 * - IF/END IF (or END for IF)
 * - LOOP/END LOOP
 * - CASE/END CASE (or END for CASE)
 * - FOR/WHILE (which end with END LOOP)
 */
function findUnitEnd(
    lines: string[],
    startLine: number,
    maxLine: number,
    unitName: string
): number {
    // Simple approach: find END <unitname>; or the last END; before next unit
    // A procedure/function ends with:
    //   END;
    //   END <procedure_name>;

    // Strategy: Find the line with "END procedure_name;" or last proper "END;"
    // that comes after a BEGIN

    let beginCount = 0;
    let endLine = startLine;
    let foundBegin = false;

    for (let i = startLine; i < maxLine; i++) {
        const line = lines[i];

        // Skip comments
        if (line.trim().startsWith('--')) continue;

        // Clean the line for keyword detection
        const cleanLine = removeStringsAndComments(line).toUpperCase();

        // Count BEGIN
        const beginMatches = (cleanLine.match(/\bBEGIN\b/g) || []).length;
        if (beginMatches > 0) {
            foundBegin = true;
            beginCount += beginMatches;
        }

        // Count END (but not END IF, END LOOP, END CASE which are block-specific)
        // We look for:
        //   - "END;" 
        //   - "END <name>;"
        // These close a BEGIN block

        // First check for "END <unitname>;" which definitely ends our procedure
        const endUnitPattern = new RegExp(`\\bEND\\s+${unitName}\\s*;`, 'i');
        if (endUnitPattern.test(cleanLine)) {
            return i;
        }

        // Check for simple "END;" that closes a BEGIN
        // But we need to distinguish from END IF;, END LOOP;, END CASE;

        // Count different END types (used for logic below)
        const _endIfCount = (cleanLine.match(/\bEND\s+IF\b/g) || []).length;
        const _endLoopCount = (cleanLine.match(/\bEND\s+LOOP\b/g) || []).length;
        const _endCaseCount = (cleanLine.match(/\bEND\s+CASE\b/g) || []).length;
        void _endIfCount; void _endLoopCount; void _endCaseCount; // Suppress unused warnings

        // Count "END;" or "END name;" (which closes BEGIN)
        // Pattern: END followed by optional identifier, then semicolon
        // But NOT followed by IF, LOOP, CASE
        const allEndMatches = cleanLine.match(/\bEND\b\s*([A-Z_][A-Z0-9_$#]*)?\s*;/gi) || [];

        let simpleEndCount = 0;
        for (const match of allEndMatches) {
            const upperMatch = match.toUpperCase();
            if (!upperMatch.includes('END IF') &&
                !upperMatch.includes('END LOOP') &&
                !upperMatch.includes('END CASE')) {
                simpleEndCount++;
            }
        }

        if (simpleEndCount > 0 && foundBegin) {
            beginCount -= simpleEndCount;

            if (beginCount <= 0) {
                // We've closed the main BEGIN of this procedure
                return i;
            }
        }

        endLine = i;
    }

    // If we didn't find a proper END, return the last line before next unit
    return Math.min(endLine, maxLine - 1);
}

/**
 * Remove string literals and comments from a line
 */
function removeStringsAndComments(line: string): string {
    // Remove single-line comments
    let result = line.replace(/--.*$/, '');

    // Remove string literals (simple version - doesn't handle escaped quotes)
    result = result.replace(/'[^']*'/g, "''");

    return result;
}

/**
 * Get character position from line number
 */
function getPositionFromLine(lines: string[], lineNum: number): number {
    let pos = 0;
    for (let i = 0; i < lineNum; i++) {
        pos += lines[i].length + 1;
    }
    return pos;
}

/**
 * Create an ExtractedUnit with all metadata
 */
function createUnit(
    name: string,
    type: ExtractedUnit['type'],
    originalCode: string,
    fullContent: string,
    startPos: number
): ExtractedUnit {
    const beforeCode = fullContent.substring(0, startPos);
    const startLine = beforeCode.split('\n').length;
    const endLine = startLine + originalCode.split('\n').length - 1;

    const { transformedCode, commentedBuiltins } = commentOutBuiltins(originalCode);
    const dependencies = extractDependencies(originalCode);
    const complexity = calculateComplexity(originalCode);
    const checklist = generateChecklist(dependencies, commentedBuiltins.length > 0);
    const semanticPatterns = detectSemanticPatterns(originalCode);

    return {
        name,
        type,
        startLine,
        endLine,
        originalCode,
        apexSafeCode: transformedCode,
        commentedBuiltins,
        dependencies,
        checklist,
        complexity,
        semanticPatterns
    };
}

/**
 * Parse package body (exported for direct use)
 */
export function parsePackageBody(packageCode: string): ExtractedUnit[] {
    return parsePLBFile(packageCode, 'package.sql');
}

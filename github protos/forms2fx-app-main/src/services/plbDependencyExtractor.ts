// =====================================================
// PLB Dependency Extractor
// Extracts page items, tables, cursors from PL/SQL code
// =====================================================

import type { UnitDependencies, CursorInfo, ChecklistItem, UnitComplexity } from '../types/plbTypes';
import { detectFormsBuiltins } from './formsBuiltinsService';

/**
 * Extract page items (P5_..., P6_..., etc.) from code
 */
export function extractPageItems(code: string): string[] {
    const pageItems: Set<string> = new Set();

    // Pattern for APEX page items: P followed by digits, underscore, then name
    // Examples: P5_T_TA_ORDRE_NPTF, P10_CUSTOMER_ID, :P5_ITEM
    const patterns = [
        // APEX_UTIL.GET_SESSION_STATE('P5_...')
        /APEX_UTIL\.GET_SESSION_STATE\s*\(\s*['"]([P]\d+_[A-Z0-9_]+)['"]\s*\)/gi,
        // APEX_UTIL.SET_SESSION_STATE(...)
        /APEX_UTIL\.SET_SESSION_STATE\s*\(\s*['"]([P]\d+_[A-Z0-9_]+)['"]/gi,
        // V('P5_...') function
        /V\s*\(\s*['"]([P]\d+_[A-Z0-9_]+)['"]\s*\)/gi,
        // :P5_... bind variable
        /:([P]\d+_[A-Z0-9_]+)/gi,
        // Direct reference in strings 'P5_...'
        /['"]([P]\d+_[A-Z0-9_]+)['"]/gi
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(code)) !== null) {
            pageItems.add(match[1].toUpperCase());
        }
    }

    return Array.from(pageItems).sort();
}

/**
 * Extract table names from SQL statements
 */
export function extractTables(code: string): string[] {
    const tables: Set<string> = new Set();

    // Remove comments and strings to avoid false positives
    const cleanCode = code
        .replace(/--.*$/gm, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .toUpperCase();

    // Pattern for table names after FROM, INTO, UPDATE, JOIN
    const patterns = [
        // SELECT ... FROM table
        /FROM\s+([A-Z][A-Z0-9_$#]*)/gi,
        // INSERT INTO table
        /INSERT\s+INTO\s+([A-Z][A-Z0-9_$#]*)/gi,
        // UPDATE table
        /UPDATE\s+([A-Z][A-Z0-9_$#]*)/gi,
        // DELETE FROM table
        /DELETE\s+FROM\s+([A-Z][A-Z0-9_$#]*)/gi,
        // JOIN table
        /JOIN\s+([A-Z][A-Z0-9_$#]*)/gi,
        // INTO table (for MERGE)
        /INTO\s+([A-Z][A-Z0-9_$#]*)/gi
    ];

    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(cleanCode)) !== null) {
            const tableName = match[1];
            // Filter out common keywords that might be matched
            const keywords = ['DUAL', 'SELECT', 'WHERE', 'AND', 'OR', 'SET', 'VALUES', 'NULL'];
            if (!keywords.includes(tableName)) {
                tables.add(tableName);
            }
        }
    }

    return Array.from(tables).sort();
}

/**
 * Extract cursor definitions
 */
export function extractCursors(code: string): CursorInfo[] {
    const cursors: CursorInfo[] = [];

    // Pattern: CURSOR cursor_name IS SELECT ...
    const cursorPattern = /CURSOR\s+([A-Z][A-Z0-9_]*)\s+(IS\s+)?/gi;
    let match;

    while ((match = cursorPattern.exec(code)) !== null) {
        const cursorName = match[1];

        // Find the cursor body (until the next semicolon or END)
        const startPos = match.index;
        let endPos = code.indexOf(';', startPos);
        if (endPos === -1) endPos = code.length;

        const cursorBody = code.substring(startPos, endPos);

        // Check if cursor uses page items
        const pageItemsInCursor = extractPageItems(cursorBody);

        // Extract tables from cursor
        const tablesInCursor = extractTables(cursorBody);

        cursors.push({
            name: cursorName,
            usesPageItems: pageItemsInCursor.length > 0,
            tables: tablesInCursor
        });
    }

    return cursors;
}

/**
 * Calculate code complexity metrics
 */
export function calculateComplexity(code: string): UnitComplexity {
    const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('--')).length;

    // Count loops
    const loopPatterns = /\b(FOR|WHILE|LOOP)\b/gi;
    const loops = (code.match(loopPatterns) || []).length;

    // Count cursors
    const cursorPattern = /\bCURSOR\s+[A-Z]/gi;
    const cursors = (code.match(cursorPattern) || []).length;

    // Count conditions
    const conditionPatterns = /\b(IF|ELSIF|CASE\s+WHEN|WHEN)\b/gi;
    const conditions = (code.match(conditionPatterns) || []).length;

    return { lines, loops, cursors, conditions };
}

/**
 * Extract all dependencies from code
 * Note: calledProcedures is empty here - it's filled by the parser after building the unit registry
 */
export function extractDependencies(code: string): UnitDependencies {
    return {
        pageItems: extractPageItems(code),
        tables: extractTables(code),
        cursors: extractCursors(code),
        calledProcedures: [], // Filled by parser after all units are extracted
        hasFormsBuiltins: detectFormsBuiltins(code).length > 0
    };
}

/**
 * Detect calls to other procedures/functions from a registry of names
 */
export function detectCalledProcedures(code: string, registry: string[], selfName: string): string[] {
    const called: Set<string> = new Set();
    const upperCode = code.toUpperCase();

    for (const name of registry) {
        // Skip self
        if (name.toUpperCase() === selfName.toUpperCase()) continue;

        // Look for procedure/function calls:
        // - name(  - function call with parenthesis
        // - name;  - procedure call as statement
        // - name   - followed by whitespace and ( 
        const patterns = [
            new RegExp(`\\b${name}\\s*\\(`, 'gi'),  // name(
            new RegExp(`\\b${name}\\s*;`, 'gi'),    // name;
        ];

        for (const pattern of patterns) {
            if (pattern.test(upperCode)) {
                called.add(name);
                break;
            }
        }
    }

    return Array.from(called).sort();
}

/**
 * Generate APEX verification checklist
 */
export function generateChecklist(dependencies: UnitDependencies, hasCommentedBuiltins: boolean): ChecklistItem[] {
    const checklist: ChecklistItem[] = [];

    // Page items to verify
    for (const pageItem of dependencies.pageItems) {
        checklist.push({
            type: 'page-item',
            item: pageItem,
            status: 'check',
            message: `Page item ${pageItem} exists in APEX`
        });
    }

    // Tables to verify
    for (const table of dependencies.tables) {
        checklist.push({
            type: 'table',
            item: table,
            status: 'check',
            message: `Table ${table} is accessible`
        });
    }

    // Forms navigation warning
    if (hasCommentedBuiltins) {
        checklist.push({
            type: 'navigation',
            item: 'Forms Built-ins',
            status: 'warning',
            message: 'Forms navigation logic has been commented out'
        });
    }

    // Commit handling
    if (dependencies.hasFormsBuiltins) {
        checklist.push({
            type: 'commit',
            item: 'Commit Handling',
            status: 'warning',
            message: 'Commit handling must be reviewed for APEX'
        });
    }

    return checklist;
}

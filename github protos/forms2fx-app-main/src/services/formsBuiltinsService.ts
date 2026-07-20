// =====================================================
// Forms Built-ins Service
// Detects and comments out Forms-only runtime code
// =====================================================

import type { CommentedBuiltin } from '../types/plbTypes';

// Complete list of Forms built-ins that are NOT applicable in APEX
const FORMS_BUILTINS = [
    // Navigation
    'GO_BLOCK',
    'GO_ITEM',
    'GO_RECORD',
    'FIRST_RECORD',
    'NEXT_RECORD',
    'PREVIOUS_RECORD',
    'LAST_RECORD',
    'UP',
    'DOWN',

    // Query
    'EXECUTE_QUERY',
    'ENTER_QUERY',
    'COUNT_QUERY',

    // Clear
    'CLEAR_BLOCK',
    'CLEAR_FORM',
    'CLEAR_ITEM',
    'CLEAR_RECORD',

    // Commit
    'COMMIT_FORM',
    'POST',
    'DO_KEY',

    // Display
    'SYNCHRONIZE',
    'REDISPLAY',
    'BELL',

    // Properties
    'SET_ITEM_PROPERTY',
    'GET_ITEM_PROPERTY',
    'SET_BLOCK_PROPERTY',
    'GET_BLOCK_PROPERTY',
    'SET_RECORD_PROPERTY',
    'GET_RECORD_PROPERTY',
    'SET_FORM_PROPERTY',
    'GET_FORM_PROPERTY',
    'SET_WINDOW_PROPERTY',
    'GET_WINDOW_PROPERTY',
    'SET_CANVAS_PROPERTY',
    'GET_CANVAS_PROPERTY',
    'SET_LOV_PROPERTY',
    'GET_LOV_PROPERTY',
    'SET_MENU_ITEM_PROPERTY',
    'GET_MENU_ITEM_PROPERTY',
    'SET_ALERT_PROPERTY',
    'GET_ALERT_PROPERTY',

    // Records
    'CREATE_RECORD',
    'DELETE_RECORD',
    'DUPLICATE_RECORD',
    'LOCK_RECORD',

    // LOV
    'SHOW_LOV',
    'LIST_VALUES',
    'POPULATE_LIST',
    'ADD_LIST_ELEMENT',
    'DELETE_LIST_ELEMENT',
    'CLEAR_LIST',
    'GET_LIST_ELEMENT_COUNT',
    'GET_LIST_ELEMENT_VALUE',
    'GET_LIST_ELEMENT_LABEL',

    // Alerts
    'SHOW_ALERT',
    'SET_ALERT_BUTTON_PROPERTY',

    // Messages
    'MESSAGE',
    'ERASE',

    // Timers
    'CREATE_TIMER',
    'DELETE_TIMER',
    'FIND_TIMER',

    // Transactions
    'ENTER',
    'EXIT_FORM',
    'NEW_FORM',
    'CALL_FORM',
    'OPEN_FORM',
    'CLOSE_FORM',

    // Windows/Canvas
    'SHOW_VIEW',
    'HIDE_VIEW',
    'SET_VIEW_PROPERTY',
    'GO_CANVAS',
    'SHOW_WINDOW',
    'HIDE_WINDOW',

    // Misc
    'DEFAULT_VALUE',
    'COPY',
    'NAME_IN',
    'COPY_REGION',
    'CUT_REGION',
    'PASTE_REGION',
    'HOST',
    'USER_EXIT',
    'CALL_OLE',
    'PAUSE',
    'PRINT',
    'RUN_PRODUCT',
    'BLOCK_MENU',
    'CHECK_RECORD_UNIQUENESS',
    'DISPLAY_ERROR',
    'ISSUE_ROLLBACK',
    'ISSUE_SAVEPOINT',
    'LOGON',
    'LOGON_SCREEN',
    'LOGOUT'
];

// Reasons for each category
const BUILTIN_REASONS: Record<string, string> = {
    // Navigation
    'GO_BLOCK': 'Forms navigation logic – not applicable in APEX',
    'GO_ITEM': 'Forms navigation logic – not applicable in APEX',
    'GO_RECORD': 'Forms navigation logic – not applicable in APEX',
    'FIRST_RECORD': 'Forms record navigation – APEX uses Interactive Grid/Report',
    'NEXT_RECORD': 'Forms record navigation – APEX uses Interactive Grid/Report',
    'PREVIOUS_RECORD': 'Forms record navigation – APEX uses Interactive Grid/Report',
    'LAST_RECORD': 'Forms record navigation – APEX uses Interactive Grid/Report',

    // Query
    'EXECUTE_QUERY': 'Forms query execution – APEX uses page refresh or DA',
    'ENTER_QUERY': 'Forms query mode – not applicable in APEX',

    // Clear
    'CLEAR_BLOCK': 'Forms block clear – use APEX clear process or JS',
    'CLEAR_FORM': 'Forms form clear – use APEX page redirect',

    // Commit
    'COMMIT_FORM': 'Forms commit – APEX handles via DML processes',
    'POST': 'Forms post – APEX handles via DML processes',

    // Display
    'SYNCHRONIZE': 'Forms display sync – not needed in APEX',

    // Properties
    'SET_ITEM_PROPERTY': 'Forms item property – use APEX Dynamic Actions',
    'GET_ITEM_PROPERTY': 'Forms item property – use APEX_UTIL functions',
    'SET_BLOCK_PROPERTY': 'Forms block property – use APEX region settings',
    'GET_BLOCK_PROPERTY': 'Forms block property – use APEX region settings',

    // Messages
    'MESSAGE': 'Forms message – use APEX_APPLICATION.ADD_MESSAGE or JS',

    // Default
    'DEFAULT': 'Forms runtime built-in – not applicable in APEX'
};

function getBuiltinReason(builtin: string): string {
    return BUILTIN_REASONS[builtin] || BUILTIN_REASONS['DEFAULT'];
}

/**
 * Comment out Forms built-ins in PL/SQL code
 * DOES NOT modify any logic, only comments out Forms-specific calls
 */
export function commentOutBuiltins(code: string): {
    transformedCode: string;
    commentedBuiltins: CommentedBuiltin[]
} {
    const lines = code.split('\n');
    const commentedBuiltins: CommentedBuiltin[] = [];
    const transformedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        const lineNumber = i + 1;

        // Check each Forms built-in
        for (const builtin of FORMS_BUILTINS) {
            // Match builtin call (case insensitive)
            // Pattern: optional whitespace, then builtin name, then ( or ;
            const regex = new RegExp(`^(\\s*)(${builtin})\\s*\\(`, 'i');
            const simpleRegex = new RegExp(`^(\\s*)(${builtin})\\s*;`, 'i');

            if (regex.test(line) || simpleRegex.test(line)) {
                // Check if already commented
                if (!line.trim().startsWith('--')) {
                    const originalLine = line;
                    // Comment out the line, preserving indentation
                    const match = line.match(/^(\s*)/);
                    const indent = match ? match[1] : '';

                    line = `${indent}-- ${line.trim()}`;
                    line += `\n${indent}-- (${getBuiltinReason(builtin)})`;

                    commentedBuiltins.push({
                        builtin,
                        line: lineNumber,
                        originalLine: originalLine.trim(),
                        reason: getBuiltinReason(builtin)
                    });
                    break;
                }
            }
        }

        transformedLines.push(line);
    }

    return {
        transformedCode: transformedLines.join('\n'),
        commentedBuiltins
    };
}

/**
 * Detect Forms built-ins in code without modifying
 */
export function detectFormsBuiltins(code: string): string[] {
    const found: Set<string> = new Set();
    const lines = code.split('\n');

    for (const line of lines) {
        // Skip already commented lines
        if (line.trim().startsWith('--')) continue;

        for (const builtin of FORMS_BUILTINS) {
            const regex = new RegExp(`\\b${builtin}\\s*[\\(;]`, 'i');
            if (regex.test(line)) {
                found.add(builtin);
            }
        }
    }

    return Array.from(found);
}

export { FORMS_BUILTINS };

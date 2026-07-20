// =====================================================
// Semantic Pattern Detector Service v2
// BEHAVIOR-AWARE detection of Forms-specific patterns
// Detection ONLY - No commenting, no conversion, no AI
// =====================================================

export interface SemanticPattern {
    id: string;
    label: string;
    severity: 'CRITICAL' | 'IMPORTANT' | 'INFO';
    description: string;
    lineNumbers: number[];
    matchedCode: string[];
    apexConsideration: string;
}

export interface PatternDetectionResult {
    patterns: SemanticPattern[];
    summary: {
        critical: number;
        important: number;
        info: number;
    };
}

/**
 * Detect all semantic patterns in code
 */
export function detectSemanticPatterns(code: string): PatternDetectionResult {
    const patterns: SemanticPattern[] = [];
    const lines = code.split('\n');

    // Run all 10 behavior-aware detectors
    const p1 = detectMultiRecordProcessing(lines);
    const p2 = detectSelectionDrivenExecution(lines);
    const p3 = detectMultipleExecutionModes(lines);
    const p4 = detectUserDecisionGatedLogic(lines);
    const p5 = detectImplicitAbortFlow(lines);
    const p6 = detectCrossEntitySideEffects(lines);
    const p7 = detectStateAccumulation(lines);
    const p8 = detectOutcomeDependentChaining(lines);
    const p9 = detectMixedResponsibilities(lines);
    const p10 = detectBusinessOutcomeUIFeedback(lines);

    if (p1) patterns.push(p1);
    if (p2) patterns.push(p2);
    if (p3) patterns.push(p3);
    if (p4) patterns.push(p4);
    if (p5) patterns.push(p5);
    if (p6) patterns.push(p6);
    if (p7) patterns.push(p7);
    if (p8) patterns.push(p8);
    if (p9) patterns.push(p9);
    if (p10) patterns.push(p10);

    // Calculate summary
    const summary = {
        critical: patterns.filter(p => p.severity === 'CRITICAL').length,
        important: patterns.filter(p => p.severity === 'IMPORTANT').length,
        info: patterns.filter(p => p.severity === 'INFO').length
    };

    return { patterns, summary };
}

// =====================================================
// 1. Multi-record processing pattern
// Signal: LOOP + record iteration + exit on last record
// =====================================================
function detectMultiRecordProcessing(lines: string[]): SemanticPattern | null {
    const matchedLines: number[] = [];
    const matchedCode: string[] = [];

    let hasLoop = false;
    let hasExitCondition = false;
    let hasRecordNavigation = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const upper = line.toUpperCase();

        // Detect LOOP
        if (/\bLOOP\b/.test(upper) && !/\bEND\s+LOOP\b/.test(upper)) {
            hasLoop = true;
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }

        // Detect exit conditions
        if (/\bEXIT\b|\bLAST_RECORD\b|\bNO_DATA_FOUND\b|%NOTFOUND/.test(upper)) {
            hasExitCondition = true;
            if (!matchedLines.includes(i + 1)) {
                matchedLines.push(i + 1);
                matchedCode.push(line.trim());
            }
        }

        // Detect record navigation
        if (/\bFIRST_RECORD\b|\bNEXT_RECORD\b|\bFETCH\b/.test(upper)) {
            hasRecordNavigation = true;
            if (!matchedLines.includes(i + 1)) {
                matchedLines.push(i + 1);
                matchedCode.push(line.trim());
            }
        }
    }

    if (hasLoop && (hasExitCondition || hasRecordNavigation)) {
        return {
            id: 'multi-record-processing',
            label: 'Multi-Record Processing',
            severity: 'CRITICAL',
            description: 'Procedure processes multiple records in a single invocation. Logic runs per record, not once.',
            lineNumbers: matchedLines.slice(0, 5),
            matchedCode: matchedCode.slice(0, 5),
            apexConsideration: 'In APEX, use FOR loops with cursors, or APEX_COLLECTION for multi-record operations.'
        };
    }
    return null;
}

// =====================================================
// 2. Selection-driven execution
// Signal: IF flag = 'Y' or checkbox-based gating
// =====================================================
function detectSelectionDrivenExecution(lines: string[]): SemanticPattern | null {
    const matchedLines: number[] = [];
    const matchedCode: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const upper = line.toUpperCase();

        // Detect selection flag patterns
        // IF SEL = 'Y', IF :SEL = 'Y', NVL(SEL, 'N') = 'Y', etc.
        if (/\bIF\b.*\b(SEL|SELECT|SELECTED|CHK|CHECK|FLAG)\b.*[=].*['"](Y|1|TRUE)['"]/i.test(upper) ||
            /NVL\s*\(.*\b(SEL|SELECT|CHK|FLAG)\b.*['"](Y|1)['"]/i.test(upper) ||
            /\b(SEL|SELECT|SELECTED)\b\s*[=]\s*['"](Y|1)['"]/i.test(upper)) {
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }
    }

    if (matchedLines.length > 0) {
        return {
            id: 'selection-driven-execution',
            label: 'Selection-Driven Execution',
            severity: 'CRITICAL',
            description: 'Execution depends on user selection of records. Processing is gated by a record-level selection indicator.',
            lineNumbers: matchedLines.slice(0, 5),
            matchedCode: matchedCode.slice(0, 5),
            apexConsideration: 'Use Interactive Grid row selection or APEX_COLLECTION to track selected records.'
        };
    }
    return null;
}

// =====================================================
// 3. Multiple execution modes
// Signal: IF mode = X THEN ... with different DML in branches
// =====================================================
function detectMultipleExecutionModes(lines: string[]): SemanticPattern | null {
    const matchedLines: number[] = [];
    const matchedCode: string[] = [];

    let hasModeCondition = false;
    let hasMultipleBranches = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const upper = line.toUpperCase();

        // Detect mode/access/type conditions
        if (/\bIF\b.*\b(MODE|ACCESS|TYPE|OPERATION|RIGHT|PERMISSION|LEVEL)\b.*[=<>]/i.test(upper) ||
            /\bIF\b.*[=]\s*['"]\d+['"]/.test(upper) ||
            /\bCASE\b.*\b(MODE|TYPE|OPERATION)\b/i.test(upper)) {
            hasModeCondition = true;
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }

        // Detect ELSE/ELSIF branches
        if (/^\s*(ELSIF|ELSE)\b/i.test(line)) {
            hasMultipleBranches = true;
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }
    }

    if (hasModeCondition && hasMultipleBranches) {
        return {
            id: 'multiple-execution-modes',
            label: 'Multiple Execution Modes',
            severity: 'IMPORTANT',
            description: 'Procedure contains multiple execution modes with different effects. Same procedure supports different behaviors based on runtime state.',
            lineNumbers: matchedLines.slice(0, 5),
            matchedCode: matchedCode.slice(0, 5),
            apexConsideration: 'Consider splitting into separate processes or use Dynamic Actions with conditional logic.'
        };
    }
    return null;
}

// =====================================================
// 4. User-decision-gated business logic
// Signal: Dialog/confirmation calls, branching on dialog result
// =====================================================
function detectUserDecisionGatedLogic(lines: string[]): SemanticPattern | null {
    const matchedLines: number[] = [];
    const matchedCode: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const upper = line.toUpperCase();

        // Detect dialog/confirmation patterns
        if (/\bSHOW_ALERT\b|\bALERT\b|\bCONFIRM\b|\bDIALOG\b|\bASK\b|\bMESSAGE\b.*\bQUESTION\b/i.test(upper) ||
            /\bGET_ALERT_PROPERTY\b|\bALERT_BUTTON\b/i.test(upper) ||
            /\bFDMSG\b|\bFD_DIALOG\b|\bFD_CONFIRM\b/i.test(upper)) {
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }

        // Detect branching on user response
        if (/\bIF\b.*\b(BUTTON|ANSWER|RESPONSE|RESULT)\b.*[=]/i.test(upper) ||
            /\bIF\b.*\bALERT\b/i.test(upper)) {
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }
    }

    if (matchedLines.length > 0) {
        return {
            id: 'user-decision-gated-logic',
            label: 'User-Decision-Gated Business Logic',
            severity: 'IMPORTANT',
            description: 'User confirmation directly controls business logic flow. User input decides whether logic continues or aborts.',
            lineNumbers: matchedLines.slice(0, 5),
            matchedCode: matchedCode.slice(0, 5),
            apexConsideration: 'Use apex.confirm() or apex.message.confirm() in Dynamic Actions before processing.'
        };
    }
    return null;
}

// =====================================================
// 5. Implicit abort / early-exit flow
// Signal: GOTO, RAISE, RETURN, labeled exits
// =====================================================
function detectImplicitAbortFlow(lines: string[]): SemanticPattern | null {
    const matchedLines: number[] = [];
    const matchedCode: string[] = [];

    let hasGoto = false;
    let hasRaise = false;
    let hasLabel = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const upper = line.toUpperCase();

        // Detect GOTO
        if (/\bGOTO\b/i.test(upper)) {
            hasGoto = true;
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }

        // Detect RAISE (abort)
        if (/\bRAISE\b|\bRAISE_APPLICATION_ERROR\b|\bFORM_TRIGGER_FAILURE\b/i.test(upper)) {
            hasRaise = true;
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }

        // Detect labels (<<label>>)
        if (/<<\s*\w+\s*>>/i.test(line)) {
            hasLabel = true;
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }

        // Detect RETURN
        if (/^\s*RETURN\s*;/i.test(line)) {
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }
    }

    if (hasGoto || hasRaise || (hasLabel && matchedLines.length > 1)) {
        return {
            id: 'implicit-abort-flow',
            label: 'Implicit Abort / Early-Exit Flow',
            severity: 'IMPORTANT',
            description: 'Procedure uses early-exit or abort control flow. Non-linear control flow is used to stop execution.',
            lineNumbers: matchedLines.slice(0, 5),
            matchedCode: matchedCode.slice(0, 5),
            apexConsideration: 'Replace GOTO with proper exception handling. Use APEX error handling for user feedback.'
        };
    }
    return null;
}

// =====================================================
// 6. Cross-entity side effects
// Signal: Multiple INSERT/UPDATE/DELETE on different tables
// =====================================================
function detectCrossEntitySideEffects(lines: string[]): SemanticPattern | null {
    const tablesModified = new Map<string, number[]>();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const upper = line.toUpperCase();

        // Detect DML statements
        const updateMatch = upper.match(/\bUPDATE\s+([A-Z_][A-Z0-9_$#]*)/i);
        const insertMatch = upper.match(/\bINSERT\s+INTO\s+([A-Z_][A-Z0-9_$#]*)/i);
        const deleteMatch = upper.match(/\bDELETE\s+FROM\s+([A-Z_][A-Z0-9_$#]*)/i);

        const table = updateMatch?.[1] || insertMatch?.[1] || deleteMatch?.[1];
        if (table && table !== 'DUAL') {
            if (!tablesModified.has(table)) {
                tablesModified.set(table, []);
            }
            tablesModified.get(table)!.push(i + 1);
        }
    }

    if (tablesModified.size > 1) {
        const allLines: number[] = [];
        const allTables: string[] = [];
        tablesModified.forEach((lineNums, table) => {
            allTables.push(table);
            allLines.push(...lineNums);
        });

        return {
            id: 'cross-entity-side-effects',
            label: 'Cross-Entity Side Effects',
            severity: 'CRITICAL',
            description: `Procedure performs coordinated updates across ${tablesModified.size} entities: ${allTables.join(', ')}`,
            lineNumbers: allLines.slice(0, 5),
            matchedCode: allTables,
            apexConsideration: 'Review transaction boundaries. Consider using a single API package for coordinated DML.'
        };
    }
    return null;
}

// =====================================================
// 7. State accumulation for later processing
// Signal: Arrays, collections, GLOBAL variables, index increments
// =====================================================
function detectStateAccumulation(lines: string[]): SemanticPattern | null {
    const matchedLines: number[] = [];
    const matchedCode: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const upper = line.toUpperCase();

        // Detect GLOBAL variable usage
        if (/\bGLOBAL\.\w+/i.test(upper)) {
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }

        // Detect array/collection operations
        if (/\.(DELETE|EXTEND|FIRST|LAST|COUNT|EXISTS)\b/i.test(upper) ||
            /\(\s*V_INDEX\s*\)|\(\s*I\s*\)|\(\s*J\s*\)/i.test(upper)) {
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }

        // Detect index increments
        if (/V_INDEX\s*:=\s*V_INDEX\s*\+\s*1|:=\s*\w+\s*\+\s*1/i.test(upper)) {
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }

        // Detect table type/array declarations
        if (/\bTABLE\s+OF\b|\bVARRAY\b|\bARRAY\b/i.test(upper)) {
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }
    }

    if (matchedLines.length > 0) {
        return {
            id: 'state-accumulation',
            label: 'State Accumulation for Deferred Processing',
            severity: 'CRITICAL',
            description: 'Procedure accumulates state for deferred processing. Data is collected for later use instead of immediately committed.',
            lineNumbers: matchedLines.slice(0, 5),
            matchedCode: matchedCode.slice(0, 5),
            apexConsideration: 'Use APEX_COLLECTION or application state items for accumulating data across requests.'
        };
    }
    return null;
}

// =====================================================
// 8. Outcome-dependent chaining
// Signal: SQL%ROWCOUNT, boolean flags, conditional follow-up
// =====================================================
function detectOutcomeDependentChaining(lines: string[]): SemanticPattern | null {
    const matchedLines: number[] = [];
    const matchedCode: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const upper = line.toUpperCase();

        // Detect SQL%ROWCOUNT checks
        if (/SQL%ROWCOUNT|SQL%FOUND|SQL%NOTFOUND/i.test(upper)) {
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }

        // Detect boolean/flag variables for tracking
        if (/V_\w*(FLG|FLAG|UPD|SUCCESS|DONE|FOUND)\w*\s*:=/i.test(upper) ||
            /\bIF\b.*V_\w*(FLG|FLAG|UPD|SUCCESS)\b/i.test(upper)) {
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }

        // Detect CRETOUR pattern (return code)
        if (/V_CRETOUR|C_RETOUR|CRETOUR|RETURN_CODE/i.test(upper)) {
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }
    }

    if (matchedLines.length >= 2) {
        return {
            id: 'outcome-dependent-chaining',
            label: 'Outcome-Dependent Chaining',
            severity: 'IMPORTANT',
            description: 'Subsequent logic depends on prior DML outcome. Later processing is conditional on whether earlier operations succeeded.',
            lineNumbers: matchedLines.slice(0, 5),
            matchedCode: matchedCode.slice(0, 5),
            apexConsideration: 'Use APEX error handling and page item state to track operation outcomes.'
        };
    }
    return null;
}

// =====================================================
// 9. Mixed responsibilities in a single unit
// Signal: Validation + DML + messaging in one block
// =====================================================
function detectMixedResponsibilities(lines: string[]): SemanticPattern | null {
    let hasValidation = false;
    let hasDML = false;
    let hasMessaging = false;
    let hasWorkflow = false;

    const matchedLines: number[] = [];
    const matchedCode: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const upper = line.toUpperCase();

        // Detect validation patterns
        if (/\bIF\b.*\bIS\s+NULL\b|\bIF\b.*\bNOT\s+NULL\b|\bIF\b.*[<>=].*\bTHEN\b/i.test(upper) ||
            /\bVALIDATE\b|\bCHECK\b.*\bVALID\b/i.test(upper)) {
            if (!hasValidation) {
                hasValidation = true;
                matchedLines.push(i + 1);
                matchedCode.push('Validation logic');
            }
        }

        // Detect DML
        if (/\b(INSERT|UPDATE|DELETE)\b/i.test(upper) && !/--/.test(line)) {
            if (!hasDML) {
                hasDML = true;
                matchedLines.push(i + 1);
                matchedCode.push('DML operations');
            }
        }

        // Detect messaging/feedback
        if (/\bMESSAGE\b|\bALERT\b|\bAFF_MSG\b|\bSET.*MESSAGE\b|\bAPEX_DEBUG\b/i.test(upper)) {
            if (!hasMessaging) {
                hasMessaging = true;
                matchedLines.push(i + 1);
                matchedCode.push('User messaging');
            }
        }

        // Detect workflow calls
        if (/\bXCALL\b|\bCALL\b.*\bPROC\b|\bPKG_\w+\.\w+/i.test(upper)) {
            if (!hasWorkflow) {
                hasWorkflow = true;
                matchedLines.push(i + 1);
                matchedCode.push('Workflow/procedure calls');
            }
        }
    }

    const responsibilities = [hasValidation, hasDML, hasMessaging, hasWorkflow].filter(Boolean).length;

    if (responsibilities >= 3) {
        return {
            id: 'mixed-responsibilities',
            label: 'Mixed Responsibilities',
            severity: 'INFO',
            description: 'Procedure combines validation, processing, and feedback responsibilities. Single unit handles multiple concerns.',
            lineNumbers: matchedLines,
            matchedCode: matchedCode,
            apexConsideration: 'Consider separating into validation process, DML process, and feedback Dynamic Actions.'
        };
    }
    return null;
}

// =====================================================
// 10. Business-outcome-driven UI feedback
// Signal: Message calls at end, success/failure messages
// =====================================================
function detectBusinessOutcomeUIFeedback(lines: string[]): SemanticPattern | null {
    const matchedLines: number[] = [];
    const matchedCode: string[] = [];

    // Look at the last 30% of the code for feedback patterns
    const endSection = Math.floor(lines.length * 0.7);

    for (let i = endSection; i < lines.length; i++) {
        const line = lines[i];
        const upper = line.toUpperCase();

        // Detect message patterns
        if (/\bMESSAGE\b|\bAFF_MSG\b|\bALERT_MSG\b|\bSET.*MESSAGE\b/i.test(upper) ||
            /\bAPEX_UTIL\.SET_SESSION_STATE\b.*\bMSG\b/i.test(upper)) {
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }

        // Detect success/error indication
        if (/\b(SUCCESS|ERROR|ERREUR|FAILED|COMPLETE|DONE)\b/i.test(upper)) {
            matchedLines.push(i + 1);
            matchedCode.push(line.trim());
        }
    }

    // Also check for conditional messaging anywhere
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const upper = line.toUpperCase();

        if (/\bIF\b.*\bTHEN\b.*\bMESSAGE\b|\bIF\b.*\bTHEN\b.*\bAFF_MSG\b/i.test(upper) ||
            /\bELSE\b.*\bMESSAGE\b|\bELSE\b.*\bAFF_MSG\b/i.test(upper)) {
            if (!matchedLines.includes(i + 1)) {
                matchedLines.push(i + 1);
                matchedCode.push(line.trim());
            }
        }
    }

    if (matchedLines.length > 0) {
        return {
            id: 'business-outcome-ui-feedback',
            label: 'Business-Outcome-Driven UI Feedback',
            severity: 'INFO',
            description: 'User feedback is driven by processing outcome. UI messages reflect the result of business logic processing.',
            lineNumbers: matchedLines.slice(0, 5),
            matchedCode: matchedCode.slice(0, 5),
            apexConsideration: 'Use APEX_APPLICATION.ADD_MESSAGE or apex.message API for success/error feedback.'
        };
    }
    return null;
}

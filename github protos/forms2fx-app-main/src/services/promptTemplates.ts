import type { FormKnowledgeContext, ChunkType } from '../types/generation';

// =====================================================
// Prompt Templates for APEX Code Generation
// =====================================================

/**
 * System prompt - Always included, sets strict rules
 */
export const SYSTEM_PROMPT = `You are an Oracle APEX code generator and documentation assistant. Your task is to convert Oracle Forms PL/SQL code to APEX-compatible PL/SQL AND explain what the code does.

STRICT OUTPUT FORMAT:
You MUST return a JSON object with exactly this structure:
{
  "explanation": {
    "summary": "Brief 1-2 sentence summary of what this code does",
    "purpose": "Why this code exists and its role in the application",
    "whatItDoes": ["Step 1: ...", "Step 2: ..."],
    "tablesAffected": ["TABLE_NAME: what operations (SELECT/INSERT/UPDATE/DELETE)"],
    "itemsUsed": ["ITEM_NAME: purpose"],
    "businessRules": ["Business rule 1", "Business rule 2"],
    "apexNotes": ["Important note about APEX implementation"]
  },
  "code": "-- Your APEX-compatible PL/SQL code here..."
}

STRICT RULES FOR CODE CONVERSION:

1. APEX COMPATIBILITY:
   - Replace Forms-specific builtins with APEX equivalents or comments
   - Use :Pxx_ITEM_NAME format for page item references
   - Use apex_util, apex_application, apex_page APIs
   - Use apex_error.add_error for error handling

2. FORMS BUILTIN CONVERSIONS:
   - GO_BLOCK, GO_ITEM → Comment: "-- APEX: Not needed, use region conditions"
   - SET_ITEM_PROPERTY → Comment: "-- APEX: Use Dynamic Action or apex_util.set_session_state"
   - SYNCHRONIZE → Remove (not applicable in APEX)
   - MESSAGE → apex_application.g_notification
   - CLEAR_BLOCK → Comment: "-- APEX: Use region refresh or DA"
   - EXECUTE_QUERY → Comment: "-- APEX: Automatic in APEX, use region source"
   - SHOW_LOV → Comment: "-- APEX: Use Popup LOV item type"
   - FORMS_OLE, HOST → Comment: "-- APEX: Not supported, requires alternative implementation"

3. VARIABLE REFERENCES:
   - :BLOCK.ITEM → :Pxx_ITEM (add comment with original reference)
   - :GLOBAL.xxx → apex_util.get_session_state('G_XXX')
   - :PARAMETER.xxx → apex_util.get_session_state('PXXX')
   - :SYSTEM.xxx → Use appropriate APEX alternative or comment

4. IF NO EQUIVALENT EXISTS:
   - Add a clear comment: "-- APEX: No direct equivalent for [X], requires custom implementation"
   - Do NOT invent fake APIs or functions
   - Do NOT assume tables or columns exist

5. EXPLANATION RULES:
   - Write explanations in simple, clear language for someone unfamiliar with the code
   - Explain the business purpose, not just technical details
   - List every table that is read from or written to
   - Highlight any validation or business rules being enforced
   - Mention any UI interactions or user feedback

6. CODE STYLE:
   - Keep original logic structure where possible
   - Add comments for significant transformations
   - Use consistent indentation (2 spaces)
   - Mark uncertain transformations with "-- TODO: Review"
`;

/**
 * Build context section from Form Knowledge Context
 */
export function buildContextPrompt(context: FormKnowledgeContext): string {
    const lines: string[] = [];

    lines.push('=== FORM CONTEXT ===');
    lines.push(`Form Name: ${context.formName}`);
    lines.push(`Screen Purpose: ${context.screenPurpose}`);

    if (context.mainTables.length > 0) {
        lines.push(`Main Tables: ${context.mainTables.join(', ')}`);
    }

    if (Object.keys(context.userActions).length > 0) {
        lines.push('User Actions:');
        Object.entries(context.userActions).forEach(([action, description]) => {
            lines.push(`  - ${action}: ${description}`);
        });
    }

    if (context.businessRules.length > 0) {
        lines.push('Business Rules:');
        context.businessRules.forEach((rule, i) => {
            lines.push(`  ${i + 1}. ${rule}`);
        });
    }

    if (Object.keys(context.apexPatterns).length > 0) {
        lines.push('Suggested APEX Patterns:');
        Object.entries(context.apexPatterns).forEach(([action, pattern]) => {
            lines.push(`  - ${action}: ${pattern}`);
        });
    }

    if (context.additionalContext) {
        lines.push(`Additional Context: ${context.additionalContext}`);
    }

    lines.push('===================');

    return lines.join('\n');
}

/**
 * Build prompt for trigger conversion
 */
export function buildTriggerPrompt(
    triggerName: string,
    triggerCode: string,
    context: FormKnowledgeContext,
    blockName?: string,
    itemName?: string
): string {
    const lines: string[] = [];

    lines.push(buildContextPrompt(context));
    lines.push('');
    lines.push('=== CONVERSION REQUEST ===');
    lines.push(`Type: Oracle Forms Trigger`);
    lines.push(`Trigger Name: ${triggerName}`);
    if (blockName) lines.push(`Block: ${blockName}`);
    if (itemName) lines.push(`Item: ${itemName}`);
    lines.push('');
    lines.push('Convert this trigger to an APEX-compatible PL/SQL block:');
    lines.push('- For WHEN-BUTTON-PRESSED: Convert to a Process or Dynamic Action PL/SQL');
    lines.push('- For WHEN-VALIDATE-*: Convert to a Validation PL/SQL');
    lines.push('- For PRE-*/POST-*: Convert to a Process at appropriate execution point');
    lines.push('');
    lines.push('=== ORIGINAL FORMS CODE ===');
    lines.push('```plsql');
    lines.push(triggerCode);
    lines.push('```');
    lines.push('');
    lines.push('Return a JSON object with "explanation" and "code" fields as specified in the system prompt.');

    return lines.join('\n');
}

/**
 * Build prompt for program unit conversion
 */
export function buildProgramUnitPrompt(
    unitName: string,
    unitType: string,
    unitCode: string,
    context: FormKnowledgeContext
): string {
    const lines: string[] = [];

    lines.push(buildContextPrompt(context));
    lines.push('');
    lines.push('=== CONVERSION REQUEST ===');
    lines.push(`Type: Oracle Forms ${unitType}`);
    lines.push(`Name: ${unitName}`);
    lines.push('');
    lines.push(`Convert this ${unitType.toLowerCase()} to an APEX-compatible format:`);
    lines.push('- Wrap in an APEX-friendly package procedure/function');
    lines.push('- Replace Forms builtins with APEX equivalents');
    lines.push('- Use apex_util for session state access');
    lines.push('');
    lines.push('=== ORIGINAL FORMS CODE ===');
    lines.push('```plsql');
    lines.push(unitCode);
    lines.push('```');
    lines.push('');
    lines.push('Return a JSON object with "explanation" and "code" fields as specified in the system prompt.');

    return lines.join('\n');
}

/**
 * Build prompt for a specific chunk type
 */
export function buildChunkPrompt(
    chunkCode: string,
    chunkType: ChunkType,
    unitName: string,
    context: FormKnowledgeContext,
    chunkNumber: number,
    totalChunks: number
): string {
    const lines: string[] = [];

    const typeDescription = {
        'declarations': 'Variable declarations and constants',
        'validation': 'Validation and error checking logic',
        'business-logic': 'Core business logic',
        'dml': 'Database operations (INSERT/UPDATE/DELETE)',
        'exception-handling': 'Exception handling',
        'full': 'Complete code block'
    }[chunkType];

    lines.push(buildContextPrompt(context));
    lines.push('');
    lines.push('=== CHUNK CONVERSION REQUEST ===');
    lines.push(`Unit Name: ${unitName}`);
    lines.push(`Chunk: ${chunkNumber} of ${totalChunks}`);
    lines.push(`Section Type: ${typeDescription}`);
    lines.push('');
    lines.push('Convert ONLY this section to APEX-compatible PL/SQL:');
    lines.push('- This is part of a larger procedure being converted in chunks');
    lines.push('- Maintain variable names and structure for assembly');
    lines.push('- Focus on converting Forms builtins and references');
    lines.push('');
    lines.push('=== ORIGINAL FORMS CODE (CHUNK) ===');
    lines.push('```plsql');
    lines.push(chunkCode);
    lines.push('```');
    lines.push('');
    lines.push('Return a JSON object with "explanation" and "code" fields. For the explanation, focus on what THIS chunk does.');

    return lines.join('\n');
}

/**
 * Build package wrapper template
 */
export function buildPackageWrapper(formName: string, procedures: string[]): string {
    const pkgName = `PKG_${formName.toUpperCase()}_APEX`;

    const lines: string[] = [];

    lines.push(`-- ============================================`);
    lines.push(`-- DRAFT - REVIEW REQUIRED`);
    lines.push(`-- APEX Package for: ${formName}`);
    lines.push(`-- Generated by Forms2APEX Intelligence Tool`);
    lines.push(`-- ============================================`);
    lines.push('');
    lines.push(`CREATE OR REPLACE PACKAGE BODY ${pkgName} IS`);
    lines.push('');

    procedures.forEach((proc, i) => {
        lines.push(proc);
        if (i < procedures.length - 1) {
            lines.push('');
            lines.push('  -- ----------------------------------------');
            lines.push('');
        }
    });

    lines.push('');
    lines.push(`END ${pkgName};`);
    lines.push('/');

    return lines.join('\n');
}

/**
 * Parse the LLM response to extract code and explanation
 */
export function parseGenerationResponse(response: string): { code: string; explanation?: CodeExplanation } {
    try {
        // Try to parse as JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                code: parsed.code || response,
                explanation: parsed.explanation
            };
        }
    } catch {
        // If JSON parsing fails, return raw response as code
    }

    // Fallback: return raw response as code
    return { code: response };
}

export interface CodeExplanation {
    summary: string;
    purpose: string;
    whatItDoes: string[];
    tablesAffected?: string[];
    itemsUsed?: string[];
    businessRules?: string[];
    apexNotes?: string[];
}

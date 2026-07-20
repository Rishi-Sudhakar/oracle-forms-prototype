import type { FormModule } from '../types/forms';
import type { FormKnowledgeContext } from '../types/generation';

// =====================================================
// Knowledge Builder - Auto-generates context from parsed XML
// =====================================================

/**
 * Build initial knowledge context from parsed form module
 */
export function buildKnowledgeContext(formModule: FormModule): FormKnowledgeContext {
    const formName = formModule.name || 'UNKNOWN';

    // Extract tables from blocks
    const mainTables = extractTables(formModule);

    // Infer screen purpose from form name and structure
    const screenPurpose = inferScreenPurpose(formModule);

    // Identify user actions from triggers
    const userActions = extractUserActions(formModule);

    // Infer business rules
    const businessRules = inferBusinessRules(formModule);

    // Suggest APEX patterns
    const apexPatterns = suggestApexPatterns(formModule, userActions);

    return {
        formName,
        screenPurpose,
        mainTables,
        userActions,
        businessRules,
        apexPatterns
    };
}

/**
 * Extract table names from data blocks
 */
function extractTables(formModule: FormModule): string[] {
    const tables = new Set<string>();

    formModule.blocks.forEach(block => {
        // Query data source name is often the table
        if (block.queryDataSourceName) {
            tables.add(block.queryDataSourceName.toUpperCase());
        }

        // Also check update target (dmlDataTargetName might not exist, use updateDataTarget)
        if ((block as any).dmlDataTargetName) {
            tables.add((block as any).dmlDataTargetName.toUpperCase());
        }

        // Infer from block name (e.g., "EMP_BLOCK" → "EMP")
        const blockName = block.name.toUpperCase();
        if (blockName.endsWith('_BLOCK') || blockName.endsWith('_BLK')) {
            const tableName = blockName.replace(/_BLOCK$|_BLK$/, '');
            if (tableName.length > 2) {
                tables.add(tableName);
            }
        }
    });

    return Array.from(tables).slice(0, 10); // Limit to 10 tables
}

/**
 * Infer screen purpose from form name and structure
 */
function inferScreenPurpose(formModule: FormModule): string {
    const formName = formModule.name.toUpperCase();

    // Common patterns in form names
    if (formName.includes('ORD') || formName.includes('ORDER')) {
        return 'Order management and processing';
    }
    if (formName.includes('INV') || formName.includes('INVOICE')) {
        return 'Invoice management';
    }
    if (formName.includes('CUST') || formName.includes('CLIENT')) {
        return 'Customer data management';
    }
    if (formName.includes('REPORT') || formName.includes('RPT')) {
        return 'Report parameters and generation';
    }
    if (formName.includes('SEARCH') || formName.includes('QRY')) {
        return 'Data search and inquiry';
    }
    if (formName.includes('MAINT') || formName.includes('ADMIN')) {
        return 'Data maintenance and administration';
    }
    if (formName.includes('ENTRY') || formName.includes('INPUT')) {
        return 'Data entry form';
    }

    // Default based on block count
    const blockCount = formModule.blocks.length;
    if (blockCount === 1) {
        return 'Single-record data entry/maintenance';
    }
    if (blockCount <= 3) {
        return 'Master-detail data management';
    }
    return 'Multi-block data processing form';
}

/**
 * Extract user actions from button triggers
 */
function extractUserActions(formModule: FormModule): Record<string, string> {
    const actions: Record<string, string> = {};

    // Look for button-related triggers
    formModule.triggers.forEach(trigger => {
        const triggerName = trigger.name.toUpperCase();

        if (triggerName.includes('WHEN-BUTTON-PRESSED')) {
            // Try to infer action from trigger text
            const text = trigger.decodedText.toUpperCase();

            if (text.includes('EXECUTE_QUERY') || text.includes('SEARCH')) {
                actions['search'] = 'Queries and filters data';
            }
            if (text.includes('COMMIT') || text.includes('SAVE')) {
                actions['save'] = 'Saves changes to database';
            }
            if (text.includes('CLEAR') || text.includes('NEW')) {
                actions['new'] = 'Creates new record';
            }
            if (text.includes('DELETE')) {
                actions['delete'] = 'Deletes selected record(s)';
            }
            if (text.includes('PRINT') || text.includes('REPORT')) {
                actions['print'] = 'Generates report or print output';
            }
            if (text.includes('EXIT') || text.includes('CLOSE')) {
                actions['close'] = 'Closes the form';
            }
        }
    });

    // Also look for LOVs (list of values = lookup functionality)
    if (formModule.lovs && formModule.lovs.length > 0) {
        actions['lookup'] = 'Uses LOV lookups for data selection';
    }

    return actions;
}

/**
 * Infer business rules from trigger code
 */
function inferBusinessRules(formModule: FormModule): string[] {
    const rules: string[] = [];

    formModule.triggers.forEach(trigger => {
        const text = trigger.decodedText.toUpperCase();

        // Validation patterns
        if (text.includes('RAISE_APPLICATION_ERROR') || text.includes('FND_MESSAGE')) {
            const validationMatch = text.match(/IF[^T]*THEN[^R]*RAISE/);
            if (validationMatch) {
                rules.push('Contains validation rules that must be enforced');
            }
        }

        // Required field checks
        if (text.includes('IS NULL') && (text.includes('ERROR') || text.includes('MESSAGE'))) {
            rules.push('Has required field validations');
        }

        // Date comparisons
        if (text.includes('DATE') && (text.includes('>') || text.includes('<'))) {
            rules.push('Includes date-based validation rules');
        }

        // Status-based logic
        if (text.includes('STATUS') && text.includes('IF')) {
            rules.push('Contains status-dependent business logic');
        }
    });

    // Deduplicate and limit
    return [...new Set(rules)].slice(0, 5);
}

/**
 * Suggest APEX patterns based on form structure
 */
function suggestApexPatterns(
    formModule: FormModule,
    userActions: Record<string, string>
): Record<string, string> {
    const patterns: Record<string, string> = {};

    // Based on user actions
    if (userActions['search']) {
        patterns['search'] = 'Interactive Grid with filter bar OR Classic Report with search region';
    }
    if (userActions['save']) {
        patterns['save'] = 'Submit button with Page Process (PL/SQL)';
    }
    if (userActions['new']) {
        patterns['new'] = 'Create Button + Form on separate page OR Modal dialog';
    }
    if (userActions['delete']) {
        patterns['delete'] = 'Delete action with confirmation modal';
    }
    // Based on block types
    const hasMultiRecordBlock = formModule.blocks.some(b =>
        (b as any).queryAllRecords === 'true' ||
        (b.recordsDisplayCount && Number(b.recordsDisplayCount) > 1)
    );

    if (hasMultiRecordBlock) {
        patterns['display'] = 'Interactive Grid for multi-record blocks';
    } else {
        patterns['display'] = 'Form Region for single-record blocks';
    }

    // Based on LOVs
    if (formModule.lovs && formModule.lovs.length > 0) {
        patterns['lookups'] = 'Popup LOV or Shared LOV components';
    }

    // Based on triggers
    const hasValidation = formModule.triggers.some(t =>
        t.name.toUpperCase().includes('VALIDATE') ||
        t.name.toUpperCase().includes('PRE-INSERT') ||
        t.name.toUpperCase().includes('PRE-UPDATE')
    );

    if (hasValidation) {
        patterns['validation'] = 'Page Validations (PL/SQL Function Returning Boolean/Error)';
    }

    return patterns;
}

/**
 * Create empty/default knowledge context
 */
export function createEmptyContext(formName: string = 'FORM'): FormKnowledgeContext {
    return {
        formName,
        screenPurpose: 'Data management form',
        mainTables: [],
        userActions: {},
        businessRules: [],
        apexPatterns: {}
    };
}

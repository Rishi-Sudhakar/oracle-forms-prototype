// =====================================================
// PLB/SQL Parser Types
// =====================================================

import type { PatternDetectionResult } from '../services/semanticPatternDetector';

export interface ExtractedUnit {
    name: string;
    type: 'Procedure' | 'Function' | 'Package Spec' | 'Package Body';
    startLine: number;
    endLine: number;
    originalCode: string;
    apexSafeCode: string;
    commentedBuiltins: CommentedBuiltin[];
    dependencies: UnitDependencies;
    checklist: ChecklistItem[];
    complexity: UnitComplexity;
    semanticPatterns?: PatternDetectionResult;
}

export interface CommentedBuiltin {
    builtin: string;
    line: number;
    originalLine: string;
    reason: string;
}

export interface UnitDependencies {
    pageItems: string[];
    tables: string[];
    cursors: CursorInfo[];
    calledProcedures: string[];
    hasFormsBuiltins: boolean;
}

export interface CursorInfo {
    name: string;
    usesPageItems: boolean;
    tables: string[];
}

export interface ChecklistItem {
    type: 'page-item' | 'navigation' | 'commit' | 'table';
    item: string;
    status: 'check' | 'warning';
    message: string;
}

export interface UnitComplexity {
    lines: number;
    loops: number;
    cursors: number;
    conditions: number;
}

export interface PLBAnalysis {
    id: string;
    formId: string;
    fileName: string;
    uploadedAt: Date;
    units: ExtractedUnit[];
    rawContent: string;
}

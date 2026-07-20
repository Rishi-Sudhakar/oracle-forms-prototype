// =====================================================
// Knowledge Context Types
// =====================================================

export interface FormKnowledgeContext {
    formName: string;
    screenPurpose: string;
    mainTables: string[];
    userActions: Record<string, string>;
    businessRules: string[];
    apexPatterns: Record<string, string>;
    additionalContext?: string;
}

export interface GenerationRequest {
    code: string;
    type: 'trigger' | 'program-unit' | 'validation' | 'process';
    name: string;
    context: FormKnowledgeContext;
    blockName?: string;
    itemName?: string;
}

export interface GenerationResult {
    success: boolean;
    generatedCode: string;
    explanation?: string; // Explanation of what the code does
    chunks?: GeneratedChunk[];
    error?: string;
    tokensUsed?: number;
    generationTime?: number;
}

export interface GeneratedChunk {
    originalCode: string;
    generatedCode: string;
    chunkType: ChunkType;
    order: number;
}

export type ChunkType =
    | 'declarations'
    | 'validation'
    | 'business-logic'
    | 'dml'
    | 'exception-handling'
    | 'full';

export interface CodeAnalysis {
    lineCount: number;
    estimatedTokens: number;
    strategy: GenerationStrategy;
    chunks?: CodeChunk[];
}

export type GenerationStrategy = 'single' | 'chunked' | 'multi-phase';

export interface CodeChunk {
    code: string;
    type: ChunkType;
    startLine: number;
    endLine: number;
    order: number;
}

export interface GenerationProgress {
    status: 'idle' | 'analyzing' | 'generating' | 'assembling' | 'complete' | 'error';
    currentChunk: number;
    totalChunks: number;
    message: string;
    partialResult?: string;
}

import type { CodeAnalysis, CodeChunk, ChunkType, GenerationStrategy } from '../types/generation';

// =====================================================
// Code Chunker - Semantic splitting for large code
// =====================================================

const SMALL_THRESHOLD = 150;  // lines
const MEDIUM_THRESHOLD = 400; // lines
const CHUNK_TARGET_SIZE = 100; // lines per chunk

/**
 * Analyze code and determine generation strategy
 */
export function analyzeCode(code: string): CodeAnalysis {
    const lines = code.split('\n');
    const lineCount = lines.length;
    const estimatedTokens = Math.ceil(code.length / 4);

    let strategy: GenerationStrategy;
    if (lineCount <= SMALL_THRESHOLD) {
        strategy = 'single';
    } else if (lineCount <= MEDIUM_THRESHOLD) {
        strategy = 'chunked';
    } else {
        strategy = 'multi-phase';
    }

    const chunks = strategy !== 'single' ? chunkCode(code) : undefined;

    return {
        lineCount,
        estimatedTokens,
        strategy,
        chunks
    };
}

interface ChunkState {
    lines: string[];
    type: ChunkType;
    startLine: number;
}

/**
 * Split code into semantic chunks
 */
export function chunkCode(code: string): CodeChunk[] {
    const lines = code.split('\n');
    const chunks: CodeChunk[] = [];

    // Use mutable object to avoid TypeScript type narrowing issues
    const state: ChunkState = {
        lines: [],
        type: 'business-logic',
        startLine: 1
    };
    let order = 0;

    // Flush current chunk to results
    const flush = () => {
        if (state.lines.length > 0) {
            chunks.push({
                code: state.lines.join('\n'),
                type: state.type,
                startLine: state.startLine,
                endLine: state.startLine + state.lines.length - 1,
                order: order++
            });
            state.lines = [];
        }
    };

    // Start a new chunk
    const startNew = (type: ChunkType, lineIndex: number) => {
        flush();
        state.type = type;
        state.startLine = lineIndex + 1;
    };

    // Add line to current chunk
    const addToChunk = (line: string, lineIndex: number, defaultType: ChunkType = 'business-logic') => {
        if (state.lines.length === 0) {
            state.type = defaultType;
            state.startLine = lineIndex + 1;
        }
        state.lines.push(line);

        // Flush if chunk gets too large
        if (state.lines.length >= CHUNK_TARGET_SIZE * 1.5) {
            flush();
        }
    };

    // Parse through code and identify sections
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const upperLine = line.toUpperCase().trim();

        // DECLARE section
        if (upperLine === 'DECLARE' || upperLine.startsWith('DECLARE')) {
            startNew('declarations', i);
            addToChunk(line, i);
            continue;
        }

        // Variable declarations (after DECLARE, before BEGIN)
        if (state.type === 'declarations' && state.lines.length > 0) {
            if (upperLine === 'BEGIN' || upperLine.startsWith('BEGIN')) {
                flush();
                startNew('business-logic', i);
            }
            addToChunk(line, i);
            continue;
        }

        // Exception handling
        if (upperLine === 'EXCEPTION' || upperLine.startsWith('EXCEPTION')) {
            startNew('exception-handling', i);
            addToChunk(line, i);
            continue;
        }

        // DML operations
        if (
            upperLine.includes('INSERT INTO') ||
            upperLine.includes('UPDATE ') ||
            upperLine.includes('DELETE FROM') ||
            upperLine.includes('COMMIT') ||
            upperLine.includes('ROLLBACK')
        ) {
            if (state.type !== 'dml' || state.lines.length === 0) {
                startNew('dml', i);
            }
            addToChunk(line, i);
            continue;
        }

        // Validation patterns
        if (
            upperLine.includes('RAISE_APPLICATION_ERROR') ||
            upperLine.includes('FND_MESSAGE') ||
            (upperLine.includes('IF') && (
                upperLine.includes('IS NULL') ||
                upperLine.includes('NOT VALID') ||
                upperLine.includes('CHECK_')
            ))
        ) {
            if (state.type !== 'validation' || state.lines.length === 0) {
                startNew('validation', i);
            }
            addToChunk(line, i);
            continue;
        }

        // Continue with current chunk type or default to business-logic
        addToChunk(line, i);
    }

    // Flush remaining
    flush();

    // If no chunks, return as single chunk
    if (chunks.length === 0) {
        return [{
            code,
            type: 'full',
            startLine: 1,
            endLine: lines.length,
            order: 0
        }];
    }

    return chunks;
}

/**
 * Assemble generated chunks into final output
 */
export function assembleChunks(
    chunks: { chunk: CodeChunk; generatedCode: string }[],
    procedureName: string
): string {
    // Sort by order
    const sorted = [...chunks].sort((a, b) => a.chunk.order - b.chunk.order);

    // Build package procedure
    const resultLines: string[] = [];

    resultLines.push(`-- ============================================`);
    resultLines.push(`-- DRAFT - REVIEW REQUIRED`);
    resultLines.push(`-- Generated APEX Code for: ${procedureName}`);
    resultLines.push(`-- ============================================`);
    resultLines.push('');
    resultLines.push(`PROCEDURE ${procedureName.toLowerCase().replace(/[^a-z0-9_]/gi, '_')}_apex IS`);

    // Find declarations
    const declarations = sorted.find(c => c.chunk.type === 'declarations');
    if (declarations) {
        resultLines.push('  -- Declarations');
        resultLines.push(indentCode(declarations.generatedCode, 2));
    }

    resultLines.push('BEGIN');

    // Validation first
    const validations = sorted.filter(c => c.chunk.type === 'validation');
    if (validations.length > 0) {
        resultLines.push('  -- Validations');
        validations.forEach(v => {
            resultLines.push(indentCode(v.generatedCode, 2));
        });
        resultLines.push('');
    }

    // Business logic
    const businessLogic = sorted.filter(c => c.chunk.type === 'business-logic' || c.chunk.type === 'full');
    if (businessLogic.length > 0) {
        resultLines.push('  -- Business Logic');
        businessLogic.forEach(b => {
            resultLines.push(indentCode(b.generatedCode, 2));
        });
        resultLines.push('');
    }

    // DML operations
    const dmlOps = sorted.filter(c => c.chunk.type === 'dml');
    if (dmlOps.length > 0) {
        resultLines.push('  -- Data Operations');
        dmlOps.forEach(d => {
            resultLines.push(indentCode(d.generatedCode, 2));
        });
        resultLines.push('');
    }

    // Exception handling
    const exceptions = sorted.filter(c => c.chunk.type === 'exception-handling');
    if (exceptions.length > 0) {
        resultLines.push('EXCEPTION');
        exceptions.forEach(e => {
            resultLines.push(indentCode(e.generatedCode, 2));
        });
    }

    resultLines.push(`END ${procedureName.toLowerCase().replace(/[^a-z0-9_]/gi, '_')}_apex;`);

    return resultLines.join('\n');
}

/**
 * Indent code by specified number of spaces
 */
function indentCode(code: string, spaces: number): string {
    const indent = ' '.repeat(spaces);
    return code.split('\n').map(line => indent + line).join('\n');
}

/**
 * Get strategy description for UI
 */
export function getStrategyDescription(strategy: GenerationStrategy, lineCount: number, chunkCount?: number): string {
    switch (strategy) {
        case 'single':
            return `Small code block (${lineCount} lines) - single request`;
        case 'chunked':
            return `Medium code block (${lineCount} lines) - will be split into ${chunkCount || 'multiple'} chunks`;
        case 'multi-phase':
            return `Large code block (${lineCount} lines) - multi-phase generation with ${chunkCount || 'multiple'} chunks`;
    }
}

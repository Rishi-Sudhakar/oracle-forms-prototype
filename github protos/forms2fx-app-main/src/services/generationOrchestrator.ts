import type {
    FormKnowledgeContext,
    GenerationProgress,
    GenerationResult,
    CodeChunk
} from '../types/generation';
import { useAnalysisStore } from '../store/analysisStore';
import { generateWithRetry } from './geminiService';
import { analyzeCode, assembleChunks } from './codeChunker';
import {
    SYSTEM_PROMPT,
    buildTriggerPrompt,
    buildProgramUnitPrompt,
    buildChunkPrompt,
    parseGenerationResponse,
    type CodeExplanation
} from './promptTemplates';

// =====================================================
// Generation Orchestrator - Manages the full generation flow
// =====================================================

export type ProgressCallback = (progress: GenerationProgress) => void;

/**
 * Format explanation for display
 */
function formatExplanation(explanation: CodeExplanation): string {
    const lines: string[] = [];

    lines.push('## What This Code Does');
    lines.push('');
    lines.push(`**Summary:** ${explanation.summary}`);
    lines.push('');

    if (explanation.purpose) {
        lines.push(`**Purpose:** ${explanation.purpose}`);
        lines.push('');
    }

    if (explanation.whatItDoes && explanation.whatItDoes.length > 0) {
        lines.push('### Step-by-Step:');
        explanation.whatItDoes.forEach((step, i) => {
            lines.push(`${i + 1}. ${step}`);
        });
        lines.push('');
    }

    if (explanation.tablesAffected && explanation.tablesAffected.length > 0) {
        lines.push('### Database Tables Affected:');
        explanation.tablesAffected.forEach(table => {
            lines.push(`- ${table}`);
        });
        lines.push('');
    }

    if (explanation.itemsUsed && explanation.itemsUsed.length > 0) {
        lines.push('### UI Items Used:');
        explanation.itemsUsed.forEach(item => {
            lines.push(`- ${item}`);
        });
        lines.push('');
    }

    if (explanation.businessRules && explanation.businessRules.length > 0) {
        lines.push('### Business Rules:');
        explanation.businessRules.forEach(rule => {
            lines.push(`- ${rule}`);
        });
        lines.push('');
    }

    if (explanation.apexNotes && explanation.apexNotes.length > 0) {
        lines.push('### APEX Implementation Notes:');
        explanation.apexNotes.forEach(note => {
            lines.push(`- ⚠️ ${note}`);
        });
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Generate APEX code for a trigger
 */
export async function generateForTrigger(
    triggerName: string,
    triggerCode: string,
    context: FormKnowledgeContext,
    blockName?: string,
    itemName?: string,
    onProgress?: ProgressCallback
): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
        onProgress?.({
            status: 'analyzing',
            currentChunk: 0,
            totalChunks: 0,
            message: 'Analyzing code structure...'
        });

        // Get API key from store
        const { apiKey } = useAnalysisStore.getState();
        if (!apiKey) {
            throw new Error('No API key configured. Please add one in AI settings.');
        }

        const analysis = analyzeCode(triggerCode);

        if (analysis.strategy === 'single') {
            // Single request for small code
            onProgress?.({
                status: 'generating',
                currentChunk: 1,
                totalChunks: 1,
                message: `Generating APEX code with explanation (${analysis.lineCount} lines)...`
            });

            const prompt = buildTriggerPrompt(triggerName, triggerCode, context, blockName, itemName);
            const result = await generateWithRetry(
                prompt,
                SYSTEM_PROMPT,
                apiKey,
                3,
                (msg) => onProgress?.({
                    status: 'generating',
                    currentChunk: 1,
                    totalChunks: 1,
                    message: msg
                })
            );

            if (!result.success) {
                return {
                    success: false,
                    generatedCode: '',
                    error: result.error,
                    generationTime: Date.now() - startTime
                };
            }

            // Parse the response to extract code and explanation
            const parsed = parseGenerationResponse(result.code);
            const explanationText = parsed.explanation ? formatExplanation(parsed.explanation) : undefined;

            onProgress?.({
                status: 'complete',
                currentChunk: 1,
                totalChunks: 1,
                message: 'Generation complete!'
            });

            return {
                success: true,
                generatedCode: wrapWithDraftBanner(parsed.code, triggerName),
                explanation: explanationText,
                generationTime: Date.now() - startTime
            };
        } else {
            // Chunked generation for larger code
            return await generateChunked(
                triggerName,
                analysis.chunks!,
                context,
                onProgress,
                startTime
            );
        }
    } catch (error) {
        return {
            success: false,
            generatedCode: '',
            error: error instanceof Error ? error.message : 'Unknown error',
            generationTime: Date.now() - startTime
        };
    }
}

/**
 * Generate APEX code for a program unit
 */
export async function generateForProgramUnit(
    unitName: string,
    unitType: string,
    unitCode: string,
    context: FormKnowledgeContext,
    onProgress?: ProgressCallback
): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
        onProgress?.({
            status: 'analyzing',
            currentChunk: 0,
            totalChunks: 0,
            message: 'Analyzing program unit structure...'
        });

        const { apiKey } = useAnalysisStore.getState();
        if (!apiKey) {
            throw new Error('No API key configured. Please add one in AI settings.');
        }

        const analysis = analyzeCode(unitCode);

        if (analysis.strategy === 'single') {
            onProgress?.({
                status: 'generating',
                currentChunk: 1,
                totalChunks: 1,
                message: `Generating APEX code with explanation (${analysis.lineCount} lines)...`
            });

            const prompt = buildProgramUnitPrompt(unitName, unitType, unitCode, context);
            const result = await generateWithRetry(
                prompt,
                SYSTEM_PROMPT,
                apiKey,
                3,
                (msg) => onProgress?.({
                    status: 'generating',
                    currentChunk: 1,
                    totalChunks: 1,
                    message: msg
                })
            );

            if (!result.success) {
                return {
                    success: false,
                    generatedCode: '',
                    error: result.error,
                    generationTime: Date.now() - startTime
                };
            }

            // Parse the response to extract code and explanation
            const parsed = parseGenerationResponse(result.code);
            const explanationText = parsed.explanation ? formatExplanation(parsed.explanation) : undefined;

            onProgress?.({
                status: 'complete',
                currentChunk: 1,
                totalChunks: 1,
                message: 'Generation complete!'
            });

            return {
                success: true,
                generatedCode: wrapWithDraftBanner(parsed.code, unitName),
                explanation: explanationText,
                generationTime: Date.now() - startTime
            };
        } else {
            return await generateChunked(
                unitName,
                analysis.chunks!,
                context,
                onProgress,
                startTime
            );
        }
    } catch (error) {
        return {
            success: false,
            generatedCode: '',
            error: error instanceof Error ? error.message : 'Unknown error',
            generationTime: Date.now() - startTime
        };
    }
}

/**
 * Generate code in chunks and assemble
 */
async function generateChunked(
    name: string,
    chunks: CodeChunk[],
    context: FormKnowledgeContext,
    onProgress?: ProgressCallback,
    startTime?: number
): Promise<GenerationResult> {
    const results: { chunk: CodeChunk; generatedCode: string }[] = [];
    const explanations: string[] = [];

    onProgress?.({
        status: 'generating',
        currentChunk: 0,
        totalChunks: chunks.length,
        message: `Large code block - generating in ${chunks.length} chunks...`
    });

    const { apiKey } = useAnalysisStore.getState();
    if (!apiKey) {
        throw new Error('No API key configured. Please add one in AI settings.');
    }

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        onProgress?.({
            status: 'generating',
            currentChunk: i + 1,
            totalChunks: chunks.length,
            message: `Generating chunk ${i + 1}/${chunks.length} (${chunk.type})...`
        });

        const prompt = buildChunkPrompt(
            chunk.code,
            chunk.type,
            name,
            context,
            i + 1,
            chunks.length
        );

        const result = await generateWithRetry(
            prompt,
            SYSTEM_PROMPT,
            apiKey,
            3,
            (msg) => onProgress?.({
                status: 'generating',
                currentChunk: i + 1,
                totalChunks: chunks.length,
                message: `Chunk ${i + 1}: ${msg}`
            })
        );

        if (!result.success) {
            onProgress?.({
                status: 'error',
                currentChunk: i + 1,
                totalChunks: chunks.length,
                message: `Failed at chunk ${i + 1}: ${result.error}`,
                partialResult: results.length > 0
                    ? assembleChunks(results, name)
                    : undefined
            });

            return {
                success: false,
                generatedCode: results.length > 0
                    ? assembleChunks(results, name)
                    : '',
                error: `Failed at chunk ${i + 1}/${chunks.length}: ${result.error}`,
                generationTime: startTime ? Date.now() - startTime : undefined
            };
        }

        // Parse response for this chunk
        const parsed = parseGenerationResponse(result.code);
        results.push({ chunk, generatedCode: parsed.code });

        if (parsed.explanation) {
            explanations.push(`### Chunk ${i + 1}: ${chunk.type}\n${formatExplanation(parsed.explanation)}`);
        }
    }

    // Assemble results
    onProgress?.({
        status: 'assembling',
        currentChunk: chunks.length,
        totalChunks: chunks.length,
        message: 'Assembling generated chunks...'
    });

    const assembled = assembleChunks(results, name);
    const combinedExplanation = explanations.length > 0
        ? explanations.join('\n\n---\n\n')
        : undefined;

    onProgress?.({
        status: 'complete',
        currentChunk: chunks.length,
        totalChunks: chunks.length,
        message: 'Generation complete!'
    });

    return {
        success: true,
        generatedCode: assembled,
        explanation: combinedExplanation,
        chunks: results.map(r => ({
            originalCode: r.chunk.code,
            generatedCode: r.generatedCode,
            chunkType: r.chunk.type,
            order: r.chunk.order
        })),
        generationTime: startTime ? Date.now() - startTime : undefined
    };
}

/**
 * Wrap generated code with draft banner
 */
function wrapWithDraftBanner(code: string, name: string): string {
    return `-- ============================================
-- DRAFT - REVIEW REQUIRED
-- Generated APEX Code for: ${name}
-- ============================================
-- This code was automatically generated and requires
-- developer review before production use.
-- ============================================

${code}`;
}

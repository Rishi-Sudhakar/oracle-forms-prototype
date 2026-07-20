import { useState, useCallback } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { hasApiKey } from '../services/geminiService';
import { analyzeCode, getStrategyDescription } from '../services/codeChunker';
import { useAnalysisStore } from '../store/analysisStore';
import type { GenerationProgress } from '../types/generation';

interface GenerateApexButtonProps {
    code: string;
    name: string;
    onGenerate: (onProgress: (progress: GenerationProgress) => void) => Promise<{ success: boolean; code: string; error?: string }>;
    disabled?: boolean;
    label?: string;
    variant?: 'default' | 'outline';
}

export default function GenerateApexButton({
    code,
    name,
    onGenerate,
    disabled = false,
    label = 'Generate APEX Code',
    variant = 'default'
}: GenerateApexButtonProps) {
    const { setShowApiKeyModal, setGeneratedCode, setGenerationProgress } = useAnalysisStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<GenerationProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Analyze code to show strategy
    const analysis = analyzeCode(code);
    const strategyText = getStrategyDescription(analysis.strategy, analysis.lineCount, analysis.chunks?.length);

    const handleClick = useCallback(async () => {
        // Check for API key first
        if (!hasApiKey()) {
            setShowApiKeyModal(true);
            return;
        }

        setIsGenerating(true);
        setError(null);
        setProgress({
            status: 'analyzing',
            currentChunk: 0,
            totalChunks: 0,
            message: 'Preparing generation...'
        });

        try {
            const result = await onGenerate((prog) => {
                setProgress(prog);
                setGenerationProgress(prog);
            });

            if (result.success) {
                setGeneratedCode(name, result.code);
                setProgress({
                    status: 'complete',
                    currentChunk: 1,
                    totalChunks: 1,
                    message: 'Generation complete!'
                });
            } else {
                setError(result.error || 'Generation failed');
                setProgress(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setProgress(null);
        } finally {
            setIsGenerating(false);
            setGenerationProgress(null);
        }
    }, [onGenerate, name, setShowApiKeyModal, setGeneratedCode, setGenerationProgress]);

    return (
        <div className="space-y-2">
            <button
                onClick={handleClick}
                disabled={disabled || isGenerating}
                className={`
                    inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                    transition-all duration-200
                    ${isGenerating
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : variant === 'outline'
                            ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                            : 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-md hover:shadow-lg'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                `}
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating...</span>
                    </>
                ) : (
                    <>
                        <Sparkles className={`w-4 h-4 ${variant === 'outline' ? 'text-violet-600' : 'text-white'}`} />
                        <span>{label}</span>
                    </>
                )}
            </button>

            {/* Strategy hint */}
            {!isGenerating && !error && (
                <p className="text-xs text-slate-500">
                    {strategyText}
                </p>
            )}

            {/* Progress indicator */}
            {isGenerating && progress && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                        <span className="text-sm text-slate-700">{progress.message}</span>
                    </div>

                    {progress.totalChunks > 1 && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Chunk {progress.currentChunk} of {progress.totalChunks}</span>
                                <span>{Math.round((progress.currentChunk / progress.totalChunks) * 100)}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-violet-600 transition-all duration-300"
                                    style={{ width: `${(progress.currentChunk / progress.totalChunks) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {analysis.strategy !== 'single' && (
                        <p className="text-xs text-slate-500">
                            Large code blocks may take several minutes.
                        </p>
                    )}
                </div>
            )}

            {/* Error display */}
            {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-rose-700">{error}</p>
                        <button
                            onClick={handleClick}
                            className="text-xs text-rose-600 hover:text-rose-800 underline mt-1"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

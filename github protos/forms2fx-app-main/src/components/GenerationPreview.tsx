import { motion } from 'framer-motion';
import { FileCode2, ArrowRight, AlertTriangle, Copy, Check, BookOpen, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useState } from 'react';
import CodeBlock from './CodeBlock';

interface GenerationPreviewProps {
    originalCode: string;
    generatedCode: string;
    originalTitle: string;
    generatedTitle?: string;
    explanation?: string;
}

export default function GenerationPreview({
    originalCode,
    generatedCode,
    originalTitle,
    generatedTitle = 'Generated APEX Code',
    explanation
}: GenerationPreviewProps) {
    const [copiedGenerated, setCopiedGenerated] = useState(false);
    const [showExplanation, setShowExplanation] = useState(true);

    const handleCopyGenerated = async () => {
        await navigator.clipboard.writeText(generatedCode);
        setCopiedGenerated(true);
        setTimeout(() => setCopiedGenerated(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 mt-6"
        >
            {/* AI Generated Header */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-t-lg px-6 py-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        AI Generated APEX Code
                    </h3>
                    <p className="text-violet-200 text-sm">Original PL/SQL converted to APEX</p>
                </div>
            </div>

            {/* Draft Warning Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 -mt-4 rounded-t-none">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-amber-800">Draft - Review Required</h4>
                    <p className="text-sm text-amber-700 mt-1">
                        This code was automatically generated and requires developer review before production use.
                        Verify all logic transformations and test thoroughly.
                    </p>
                </div>
            </div>

            {/* Code Explanation Section */}
            {explanation && (
                <div className="bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setShowExplanation(!showExplanation)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-violet-100/50 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-violet-800">
                            <BookOpen className="w-5 h-5" />
                            <span className="font-semibold">Understanding This Code</span>
                        </div>
                        {showExplanation ? (
                            <ChevronUp className="w-5 h-5 text-violet-600" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-violet-600" />
                        )}
                    </button>

                    {showExplanation && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4"
                        >
                            <div className="prose prose-sm prose-violet max-w-none">
                                <div className="text-slate-700 space-y-3">
                                    {explanation.split('\n').map((line, i) => {
                                        // Parse markdown-like formatting
                                        if (line.startsWith('## ')) {
                                            return (
                                                <h3 key={i} className="text-lg font-bold text-violet-900 mt-4 mb-2">
                                                    {line.replace('## ', '')}
                                                </h3>
                                            );
                                        }
                                        if (line.startsWith('### ')) {
                                            return (
                                                <h4 key={i} className="text-base font-semibold text-slate-800 mt-3 mb-1">
                                                    {line.replace('### ', '')}
                                                </h4>
                                            );
                                        }
                                        if (line.startsWith('**') && line.includes(':**')) {
                                            const [label, ...rest] = line.split(':**');
                                            return (
                                                <p key={i} className="mb-1">
                                                    <strong className="text-slate-900">{label.replace('**', '')}:</strong>{' '}
                                                    {rest.join(':**').replace(/\*\*/g, '')}
                                                </p>
                                            );
                                        }
                                        if (line.match(/^\d+\. /)) {
                                            return (
                                                <p key={i} className="ml-4 text-slate-600">
                                                    {line}
                                                </p>
                                            );
                                        }
                                        if (line.startsWith('- ')) {
                                            const isWarning = line.includes('⚠️');
                                            return (
                                                <p key={i} className={`ml-4 ${isWarning ? 'text-amber-700' : 'text-slate-600'}`}>
                                                    • {line.replace('- ', '')}
                                                </p>
                                            );
                                        }
                                        if (line.startsWith('---')) {
                                            return <hr key={i} className="my-4 border-violet-200" />;
                                        }
                                        if (line.trim() === '') return null;
                                        return <p key={i} className="text-slate-600">{line}</p>;
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            )}

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative">
                {/* Original Code */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <FileCode2 className="w-4 h-4 text-slate-500" />
                        <span>Original Forms PL/SQL</span>
                    </div>
                    <CodeBlock
                        code={originalCode}
                        language="plsql"
                        title={originalTitle}
                        maxHeight={500}
                    />
                </div>

                {/* Arrow (visible on larger screens) */}
                <div className="hidden lg:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center shadow-md">
                        <ArrowRight className="w-5 h-5 text-violet-600" />
                    </div>
                </div>

                {/* Generated Code */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-violet-700">
                            <FileCode2 className="w-4 h-4 text-violet-500" />
                            <span>{generatedTitle}</span>
                        </div>
                        <button
                            onClick={handleCopyGenerated}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 hover:bg-violet-50 rounded-lg transition-colors"
                        >
                            {copiedGenerated ? (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy Code
                                </>
                            )}
                        </button>
                    </div>
                    <div className="relative">
                        <div className="absolute -top-1 -right-1 px-2 py-0.5 bg-violet-600 text-white text-xs font-medium rounded-bl-lg rounded-tr-lg z-10">
                            APEX
                        </div>
                        <CodeBlock
                            code={generatedCode}
                            language="plsql"
                            title={generatedTitle}
                            maxHeight={500}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

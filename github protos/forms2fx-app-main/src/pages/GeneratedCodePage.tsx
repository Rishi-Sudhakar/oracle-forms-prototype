import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, FileCode2, Copy, Check, Download, Loader2, ChevronRight, ChevronDown, Package, Zap } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import { getAllGeneratedCode } from '../services/firestoreService';
import CodeBlock from '../components/CodeBlock';

export default function GeneratedCodePage() {
    const { fileId } = useParams();
    const {
        currentAnalysis,
        files,
        selectFile,
        generatedCode,
        generatedExplanations,
        setGeneratedCode
    } = useAnalysisStore();
    const [loading, setLoading] = useState(true);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    // Load file if not selected
    useEffect(() => {
        if (!currentAnalysis && fileId) {
            const file = files.find((f) => f.id === fileId);
            if (file) selectFile(file);
        }
    }, [fileId, currentAnalysis, files, selectFile]);

    // Fetch generated code on mount
    useEffect(() => {
        if (!fileId) return;

        const fetchCode = async () => {
            try {
                setLoading(true);
                const codeMap = await getAllGeneratedCode(fileId);
                Object.entries(codeMap).forEach(([name, data]) => {
                    setGeneratedCode(name, data.code, data.explanation);
                });
            } catch (err) {
                console.error('Error fetching generated code:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCode();
    }, [fileId, setGeneratedCode]);

    // Convert store data to array for display - deduplicate by name
    const generatedItems = useMemo(() => {
        const uniqueItems = new Map<string, { key: string; code: string; explanation?: string; source: string; name: string; type: 'trigger' | 'unit' }>();

        Object.entries(generatedCode).forEach(([key, code]) => {
            const parts = key.split('-');
            const source = parts[0] || 'Unknown';
            const name = parts.slice(1).join('-') || key;
            const type = key.startsWith('unit-') ? 'unit' : 'trigger';

            // Use name as unique identifier to prevent duplicates
            const uniqueKey = `${type}-${name}`;

            // Only add if not already present, or if this is a newer version (overwrite)
            if (!uniqueItems.has(uniqueKey)) {
                uniqueItems.set(uniqueKey, {
                    key,
                    code,
                    explanation: generatedExplanations[key],
                    source,
                    name,
                    type
                });
            }
        });

        return Array.from(uniqueItems.values());
    }, [generatedCode, generatedExplanations]);

    const handleCopy = async (key: string, code: string) => {
        await navigator.clipboard.writeText(code);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleDownloadAll = () => {
        const allCode = generatedItems.map(item =>
            `-- ============================================\n-- ${item.source}: ${item.name}\n-- ============================================\n\n${item.code}`
        ).join('\n\n\n');

        const blob = new Blob([allCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentAnalysis?.name || 'generated'}_apex_code.sql`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!currentAnalysis) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <FileCode2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No analysis data available</p>
                    <Link to="/upload" className="btn-primary mt-4">Upload a file</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto">
            <header className="bg-white border-b border-slate-200 px-8 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mb-2">
                            <Link to="/" className="hover:text-primary-600">Dashboard</Link>
                            <span>/</span>
                            <Link to={`/analysis/${fileId}`} className="hover:text-primary-600">{currentAnalysis.name}</Link>
                            <span>/</span>
                            <span className="text-slate-900">Generated Code</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <Sparkles className="w-7 h-7 text-violet-500" />
                            Generated APEX Code
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {generatedItems.length} items generated • Click to expand and view code
                        </p>
                    </div>
                    {generatedItems.length > 0 && (
                        <button onClick={handleDownloadAll} className="btn-primary flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Download All
                        </button>
                    )}
                </div>
            </header>

            <div className="p-8">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                        <span className="ml-3 text-slate-500">Loading generated code...</span>
                    </div>
                ) : generatedItems.length === 0 ? (
                    <div className="text-center py-12">
                        <Sparkles className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">No Code Generated Yet</h3>
                        <p className="text-slate-500 mb-4">
                            Go to Triggers or Program Units and click "Generate APEX Code".
                        </p>
                        <div className="flex justify-center gap-3">
                            <Link to={`/analysis/${fileId}/triggers`} className="btn-primary">Go to Triggers</Link>
                            <Link to={`/analysis/${fileId}/program-units`} className="btn-secondary">Go to Program Units</Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {generatedItems.map((item, index) => {
                            const isExpanded = expandedItem === item.key;

                            return (
                                <motion.div
                                    key={item.key}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="card overflow-hidden"
                                >
                                    {/* Collapsed Header - Clickable */}
                                    <button
                                        onClick={() => setExpandedItem(isExpanded ? null : item.key)}
                                        className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                                    >
                                        {/* Icon */}
                                        <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
                                            {item.type === 'trigger' ? (
                                                <Zap className="w-5 h-5" />
                                            ) : (
                                                <Package className="w-5 h-5" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 text-left">
                                            <h3 className="font-semibold text-slate-900">{item.name}</h3>
                                            <p className="text-sm text-slate-500">{item.source}</p>
                                        </div>

                                        {/* Type badge */}
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.type === 'trigger'
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {item.type === 'trigger' ? 'Trigger' : 'Program Unit'}
                                        </span>

                                        {/* Expand/Collapse icon */}
                                        {isExpanded ? (
                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        )}
                                    </button>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-200 p-6 space-y-4 bg-slate-50">
                                            {/* Copy Button */}
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => handleCopy(item.key, item.code)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                                >
                                                    {copiedKey === item.key ? (
                                                        <><Check className="w-4 h-4 text-emerald-500" />Copied!</>
                                                    ) : (
                                                        <><Copy className="w-4 h-4" />Copy Code</>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Code Block */}
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-violet-500" />
                                                    Generated APEX Code
                                                </h4>
                                                <CodeBlock code={item.code} maxHeight={300} />
                                            </div>

                                            {/* Explanation */}
                                            {item.explanation && (
                                                <div className="p-4 bg-white rounded-lg border border-slate-200">
                                                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Explanation</h4>
                                                    <pre className="whitespace-pre-wrap text-sm text-slate-600">{item.explanation}</pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Filter, Search, ChevronDown, ChevronRight, FileCode2, AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import StatusBadge, { TriggerTypeBadge } from '../components/StatusBadge';
import CodeBlock from '../components/CodeBlock';
import GenerateApexButton from '../components/GenerateApexButton';
import GenerationPreview from '../components/GenerationPreview';
import type { Trigger } from '../types/forms';
import type { GenerationProgress } from '../types/generation';
import { generateForTrigger } from '../services/generationOrchestrator';
import { buildKnowledgeContext, createEmptyContext } from '../services/knowledgeBuilder';
import { hasApiKey } from '../services/geminiService';

export default function TriggerInspector() {
    const { fileId } = useParams();
    const {
        currentAnalysis,
        files,
        selectFile,
        knowledgeContext,
        setKnowledgeContext,
        generatedCode,
        generatedExplanations,
        setGeneratedCode,
        setShowApiKeyModal
    } = useAnalysisStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [expandedTrigger, setExpandedTrigger] = useState<string | null>(null);

    // Build knowledge context on load if not already set
    useEffect(() => {
        if (currentAnalysis && !knowledgeContext) {
            const context = buildKnowledgeContext(currentAnalysis);
            setKnowledgeContext(context);
        }
    }, [currentAnalysis, knowledgeContext, setKnowledgeContext]);

    useEffect(() => {
        if (!currentAnalysis && fileId) {
            const file = files.find((f) => f.id === fileId);
            if (file) selectFile(file);
        }
    }, [fileId, currentAnalysis, files, selectFile]);

    const allTriggers = useMemo(() => {
        if (!currentAnalysis) return [];
        const triggers: (Trigger & { source: string })[] = [];
        currentAnalysis.triggers.forEach((t) => triggers.push({ ...t, source: 'Form' }));
        currentAnalysis.blocks.forEach((block) => {
            block.triggers.forEach((t) => triggers.push({ ...t, source: `Block: ${block.name}` }));
            block.items.forEach((item) => {
                item.triggers.forEach((t) => triggers.push({ ...t, source: `Item: ${block.name}.${item.name}` }));
            });
        });
        return triggers;
    }, [currentAnalysis]);

    const filteredTriggers = useMemo(() => {
        return allTriggers.filter((trigger) => {
            const matchesSearch = searchQuery === '' || trigger.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filterType === 'all' || trigger.classification === filterType;
            return matchesSearch && matchesFilter;
        });
    }, [allTriggers, searchQuery, filterType]);

    const triggersByType = useMemo(() => {
        const groups: Record<string, number> = {};
        allTriggers.forEach((t) => { groups[t.classification] = (groups[t.classification] || 0) + 1; });
        return groups;
    }, [allTriggers]);

    // Create generation handler for a trigger
    const createGenerateHandler = useCallback((trigger: Trigger & { source: string }) => {
        return async (onProgress: (progress: GenerationProgress) => void) => {
            const context = knowledgeContext || createEmptyContext(currentAnalysis?.name || 'FORM');

            // Parse source to get block/item names
            let blockName: string | undefined;
            let itemName: string | undefined;
            if (trigger.source.startsWith('Block: ')) {
                blockName = trigger.source.replace('Block: ', '');
            } else if (trigger.source.startsWith('Item: ')) {
                const parts = trigger.source.replace('Item: ', '').split('.');
                blockName = parts[0];
                itemName = parts[1];
            }

            const result = await generateForTrigger(
                trigger.name,
                trigger.decodedText,
                context,
                blockName,
                itemName,
                onProgress
            );

            return {
                success: result.success,
                code: result.generatedCode,
                explanation: result.explanation,
                error: result.error
            };
        };
    }, [knowledgeContext, currentAnalysis]);

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
                            <span className="text-slate-900">Triggers</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">Trigger Inspector</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Analyze {allTriggers.length} triggers •
                            {hasApiKey() ? (
                                <span className="text-emerald-600 ml-1">AI Generation Ready</span>
                            ) : (
                                <button
                                    onClick={() => setShowApiKeyModal(true)}
                                    className="text-violet-600 hover:text-violet-700 ml-1"
                                >
                                    Configure API Key for AI Generation
                                </button>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowApiKeyModal(true)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="API Settings"
                    >
                        <Settings className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
            </header>

            <div className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                    <button onClick={() => setFilterType('all')} className={`card p-4 text-left ${filterType === 'all' ? 'ring-2 ring-primary-500' : ''}`}>
                        <p className="text-2xl font-bold text-slate-900">{allTriggers.length}</p>
                        <p className="text-sm text-slate-500">All</p>
                    </button>
                    {Object.entries(triggersByType).map(([type, count]) => (
                        <button key={type} onClick={() => setFilterType(type)} className={`card p-4 text-left ${filterType === type ? 'ring-2 ring-primary-500' : ''}`}>
                            <p className="text-2xl font-bold text-slate-900">{count}</p>
                            <p className="text-sm text-slate-500 capitalize">{type}</p>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Search triggers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-field pl-10" />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Filter className="w-4 h-4" />
                        <span>{filteredTriggers.length} results</span>
                    </div>
                </div>

                <div className="space-y-4">
                    {filteredTriggers.map((trigger, index) => {
                        const key = `${trigger.source}-${trigger.name}`;
                        const isExpanded = expandedTrigger === key;
                        const existingGeneratedCode = generatedCode[key];
                        const existingExplanation = generatedExplanations[key];

                        // Create handler that saves both code and explanation
                        const handleGenerate = async (onProgress: (progress: GenerationProgress) => void) => {
                            const result = await createGenerateHandler(trigger)(onProgress);
                            if (result.success && fileId) {
                                setGeneratedCode(key, result.code, result.explanation);

                                // Save to Firestore
                                try {
                                    // Construct Unit ID based on trigger source info to match saveFormUnits logic
                                    let unitId = '';
                                    if (trigger.source === 'Form') {
                                        unitId = `${fileId}_trigger_form_${trigger.name}`;
                                    } else if (trigger.source.startsWith('Block: ')) {
                                        const blockName = trigger.source.replace('Block: ', '');
                                        unitId = `${fileId}_trigger_block_${blockName}_${trigger.name}`;
                                    } else if (trigger.source.startsWith('Item: ')) {
                                        const parts = trigger.source.replace('Item: ', '').split('.');
                                        unitId = `${fileId}_trigger_item_${parts[0]}_${parts[1]}_${trigger.name}`;
                                    }

                                    if (unitId) {
                                        // Dynamic import or passed prop? better to import
                                        const { saveGeneratedCode } = await import('../services/firestoreService');
                                        await saveGeneratedCode(fileId, unitId, result.code, result.explanation);
                                    }
                                } catch (err) {
                                    console.error('Failed to save generated code to Firestore:', err);
                                }
                            }
                            return result;
                        };

                        return (
                            <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }} className="card overflow-hidden">
                                <button onClick={() => setExpandedTrigger(isExpanded ? null : key)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${trigger.apexTarget.supportLevel === 'full' ? 'bg-emerald-100 text-emerald-600' : trigger.apexTarget.supportLevel === 'partial' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-medium text-slate-900">{trigger.name}</h3>
                                            <p className="text-sm text-slate-500">{trigger.source}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {existingGeneratedCode && (
                                            <StatusBadge variant="success">AI Generated</StatusBadge>
                                        )}
                                        <TriggerTypeBadge type={trigger.classification} />
                                        <StatusBadge variant={trigger.apexTarget.supportLevel === 'full' ? 'success' : trigger.apexTarget.supportLevel === 'partial' ? 'warning' : 'error'}>{trigger.apexTarget.type}</StatusBadge>
                                        {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-slate-200 p-6 space-y-6">
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900 mb-2">APEX Target</h4>
                                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800">
                                                <CheckCircle className="w-4 h-4" />
                                                <span className="font-medium">{trigger.apexTarget.type}</span>
                                                <span>→</span>
                                                <span>{trigger.apexTarget.point}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900 mb-2">Steps</h4>
                                            <ul className="space-y-2">
                                                {trigger.apexTarget.instructions.map((step, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm">
                                                        <span className="w-5 h-5 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-xs">{i + 1}</span>
                                                        <span className={step.startsWith('WARNING') ? 'text-amber-600' : 'text-slate-600'}>{step.startsWith('WARNING') && <AlertTriangle className="w-4 h-4 inline mr-1" />}{step}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Original code and Generate button */}
                                        {trigger.decodedText && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-semibold text-slate-900">Original PL/SQL</h4>
                                                    <GenerateApexButton
                                                        code={trigger.decodedText}
                                                        name={key}
                                                        onGenerate={handleGenerate}
                                                        label={existingGeneratedCode ? "Regenerate AI Code" : "Generate APEX Code"}
                                                        variant={existingGeneratedCode ? "outline" : "default"}
                                                    />
                                                </div>
                                                <CodeBlock code={trigger.decodedText} title="Original PL/SQL" maxHeight={250} />
                                            </div>
                                        )}

                                        {/* Show generated code if exists */}
                                        {existingGeneratedCode && (
                                            <GenerationPreview
                                                originalCode={trigger.decodedText}
                                                generatedCode={existingGeneratedCode}
                                                originalTitle={`Trigger: ${trigger.name}`}
                                                generatedTitle="Generated APEX Code"
                                                explanation={existingExplanation}
                                            />
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {filteredTriggers.length === 0 && (
                    <div className="text-center py-12">
                        <Zap className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                        <p className="text-slate-500">No triggers match your criteria</p>
                    </div>
                )}
            </div>
        </div>
    );
}

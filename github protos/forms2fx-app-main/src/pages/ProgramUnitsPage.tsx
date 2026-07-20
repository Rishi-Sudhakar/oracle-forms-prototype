import { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package,
    ChevronDown,
    ChevronRight,
    Search,
    Filter,
    Star,
    FileCode2,
    AlertTriangle,
    Users,
    ArrowRight,
    Settings,
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import CodeBlock from '../components/CodeBlock';
import StatusBadge from '../components/StatusBadge';
import GenerateApexButton from '../components/GenerateApexButton';
import GenerationPreview from '../components/GenerationPreview';
import type { ProgramUnitEnriched, LogicCategory } from '../types/forms';
import type { GenerationProgress } from '../types/generation';
import { generateForProgramUnit } from '../services/generationOrchestrator';
import { buildKnowledgeContext, createEmptyContext } from '../services/knowledgeBuilder';
import { hasApiKey } from '../services/geminiService';

export default function ProgramUnitsPage() {
    const { fileId } = useParams();
    const {
        files,
        knowledgeContext,
        setKnowledgeContext,
        generatedCode,
        generatedExplanations,
        setShowApiKeyModal
    } = useAnalysisStore();

    const file = files.find((f) => f.id === fileId);
    const formModule = file?.formModule;
    const programUnits = formModule?.programUnitsEnriched || [];

    const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [selectedImpact, setSelectedImpact] = useState<string>('all');
    const [showOnlyMain, setShowOnlyMain] = useState(false);

    // Build knowledge context on load if not already set
    if (formModule && !knowledgeContext) {
        const context = buildKnowledgeContext(formModule);
        setKnowledgeContext(context);
    }

    // Filter program units
    const filteredUnits = useMemo(() => {
        return programUnits.filter((unit) => {
            if (searchQuery && !unit.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }

            if (selectedType !== 'all' && unit.programUnitType !== selectedType) {
                return false;
            }

            if (selectedImpact !== 'all' && unit.impactScore !== selectedImpact) {
                return false;
            }

            if (showOnlyMain && !unit.isMainFunction) {
                return false;
            }

            return true;
        });
    }, [programUnits, searchQuery, selectedType, selectedImpact, showOnlyMain]);

    // Group by type
    const groupedUnits = useMemo(() => {
        const groups: Record<string, ProgramUnitEnriched[]> = {};

        filteredUnits.forEach((unit) => {
            const type = unit.programUnitType;
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(unit);
        });

        return groups;
    }, [filteredUnits]);

    // Create generation handler for a program unit
    const createGenerateHandler = useCallback((unit: ProgramUnitEnriched) => {
        return async (onProgress: (progress: GenerationProgress) => void) => {
            const context = knowledgeContext || createEmptyContext(formModule?.name || 'FORM');

            const result = await generateForProgramUnit(
                unit.name,
                unit.programUnitType,
                unit.decodedText,
                context,
                onProgress
            );

            return {
                success: result.success,
                code: result.generatedCode,
                explanation: result.explanation,
                error: result.error
            };
        };
    }, [knowledgeContext, formModule]);

    if (!formModule) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-500">No analysis data available</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Package className="w-6 h-6 text-primary-500" />
                            Program Units
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Analyze {programUnits.length} program units •
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
                {/* Filters */}
                <div className="card p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search units..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        {/* Type filter */}
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                            >
                                <option value="all">All Types</option>
                                <option value="Procedure">Procedures</option>
                                <option value="Function">Functions</option>
                                <option value="Package">Packages</option>
                            </select>
                        </div>

                        {/* Impact filter */}
                        <div>
                            <select
                                value={selectedImpact}
                                onChange={(e) => setSelectedImpact(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="all">All Impact Levels</option>
                                <option value="high">High Impact</option>
                                <option value="medium">Medium Impact</option>
                                <option value="low">Low Impact</option>
                            </select>
                        </div>

                        {/* Main functions only */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showOnlyMain}
                                onChange={(e) => setShowOnlyMain(e.target.checked)}
                                className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm text-slate-700 flex items-center gap-1">
                                <Star className="w-4 h-4 text-amber-500" />
                                Main Functions Only
                            </span>
                        </label>
                    </div>

                    <div className="text-sm text-slate-500 mt-4">
                        Showing {filteredUnits.length} of {programUnits.length} units
                    </div>
                </div>

                {/* Program units grouped by type */}
                <div className="space-y-6">
                    {Object.entries(groupedUnits).map(([type, units]) => (
                        <div key={type} className="card">
                            <div className="p-4 border-b border-slate-200 bg-slate-50">
                                <h3 className="font-semibold text-slate-900">
                                    {type}s ({units.length})
                                </h3>
                            </div>

                            <div className="divide-y divide-slate-200">
                                {units.map((unit) => (
                                    <ProgramUnitItem
                                        key={unit.name}
                                        unit={unit}
                                        isExpanded={expandedUnit === unit.name}
                                        onToggle={() =>
                                            setExpandedUnit(expandedUnit === unit.name ? null : unit.name)
                                        }
                                        generatedCode={generatedCode[`unit-${unit.name}`]}
                                        generatedExplanation={generatedExplanations[`unit-${unit.name}`]}
                                        onGenerate={createGenerateHandler(unit)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}

                    {filteredUnits.length === 0 && (
                        <div className="card p-12 text-center">
                            <FileCode2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">No program units match your filters</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// =====================================================
// Program Unit Item Component
// =====================================================

interface ProgramUnitItemProps {
    unit: ProgramUnitEnriched;
    isExpanded: boolean;
    onToggle: () => void;
    generatedCode?: string;
    generatedExplanation?: string;
    onGenerate: (onProgress: (progress: GenerationProgress) => void) => Promise<{ success: boolean; code: string; explanation?: string; error?: string }>;
}

function ProgramUnitItem({ unit, isExpanded, onToggle, generatedCode: existingGeneratedCode, generatedExplanation: existingExplanation, onGenerate }: ProgramUnitItemProps) {
    const { setGeneratedCode } = useAnalysisStore();
    const { fileId } = useParams();

    const handleGenerate = useCallback(async (onProgress: (progress: GenerationProgress) => void) => {
        const result = await onGenerate(onProgress);
        if (result.success && fileId) {
            const key = `unit-${unit.name}`;
            setGeneratedCode(key, result.code, result.explanation);

            // Save to Firestore for persistence - use same key format as store
            try {
                const { saveGeneratedCode } = await import('../services/firestoreService');
                await saveGeneratedCode(fileId, key, result.code, result.explanation);
            } catch (err) {
                console.error('Failed to save generated code to Firestore:', err);
            }
        }
        return result;
    }, [onGenerate, unit.name, setGeneratedCode, fileId]);


    return (
        <div>
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full p-4 hover:bg-slate-50 transition-colors flex items-start gap-4 text-left"
            >
                <div className="flex-shrink-0 mt-0.5">
                    {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                        <h4 className="font-mono text-sm font-semibold text-slate-900">{unit.name}</h4>

                        {unit.isMainFunction && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                <Star className="w-3 h-3" fill="currentColor" />
                                Main Function
                            </span>
                        )}

                        {existingGeneratedCode && (
                            <StatusBadge variant="success">AI Generated</StatusBadge>
                        )}

                        <ImpactBadge impact={unit.impactScore} />
                        <ClassificationBadge classification={unit.classification} />
                    </div>

                    {unit.businessResponsibility && (
                        <p className="text-sm text-slate-600 mb-2">{unit.businessResponsibility}</p>
                    )}

                    {unit.mainFunctionReason && (
                        <p className="text-xs text-slate-500 italic">💡 {unit.mainFunctionReason}</p>
                    )}

                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <FileCode2 className="w-3.5 h-3.5" />
                            {unit.lineCount} lines
                        </span>

                        {unit.parameters.length > 0 && (
                            <span>
                                {unit.parameters.length} parameter{unit.parameters.length > 1 ? 's' : ''}
                            </span>
                        )}

                        <span>Complexity: {unit.complexity}/10</span>

                        {unit.calledBy.length > 0 && (
                            <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                Called by {unit.calledBy.length}
                            </span>
                        )}

                        {unit.dependencies.length > 0 && (
                            <span className="flex items-center gap-1">
                                <ArrowRight className="w-3.5 h-3.5" />
                                Calls {unit.dependencies.length}
                            </span>
                        )}
                    </div>

                    {unit.riskFlags.length > 0 && (
                        <div className="flex items-start gap-2 mt-3">
                            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-700">
                                {unit.riskFlags.slice(0, 2).join(', ')}
                                {unit.riskFlags.length > 2 && ` +${unit.riskFlags.length - 2} more`}
                            </div>
                        </div>
                    )}
                </div>
            </button>

            {/* Expanded content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pl-14 space-y-4">
                            {/* Parameters */}
                            {unit.parameters.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-semibold text-slate-700 mb-2">Parameters</h5>
                                    <div className="space-y-1">
                                        {unit.parameters.map((param, i) => (
                                            <div
                                                key={i}
                                                className="text-xs font-mono bg-slate-50 px-2 py-1 rounded flex items-center gap-2"
                                            >
                                                <span className="font-semibold text-slate-900">{param.name}</span>
                                                <span className="text-slate-500">{param.mode}</span>
                                                <span className="text-slate-600">{param.dataType}</span>
                                                {param.defaultValue && (
                                                    <span className="text-slate-500">= {param.defaultValue}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Return type */}
                            {unit.returnType && (
                                <div>
                                    <h5 className="text-xs font-semibold text-slate-700 mb-2">Returns</h5>
                                    <div className="text-xs font-mono bg-slate-50 px-2 py-1 rounded inline-block">
                                        {unit.returnType}
                                    </div>
                                </div>
                            )}

                            {/* Dependencies */}
                            {unit.dependencies.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-semibold text-slate-700 mb-2">
                                        Calls ({unit.dependencies.length})
                                    </h5>
                                    <div className="flex flex-wrap gap-1">
                                        {unit.dependencies.map((dep) => (
                                            <span
                                                key={dep}
                                                className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200"
                                            >
                                                {dep}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Called by */}
                            {unit.calledBy.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-semibold text-slate-700 mb-2">
                                        Called By ({unit.calledBy.length})
                                    </h5>
                                    <div className="flex flex-wrap gap-1">
                                        {unit.calledBy.map((caller) => (
                                            <span
                                                key={caller}
                                                className="text-xs font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200"
                                            >
                                                {caller}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Code with Generate button */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h5 className="text-xs font-semibold text-slate-700">Original Code</h5>
                                    <GenerateApexButton
                                        code={unit.decodedText}
                                        name={`unit-${unit.name}`}
                                        onGenerate={handleGenerate}
                                    />
                                </div>
                                <CodeBlock language="sql" code={unit.decodedText} />
                            </div>

                            {/* Show generated code if exists */}
                            {existingGeneratedCode && (
                                <GenerationPreview
                                    originalCode={unit.decodedText}
                                    generatedCode={existingGeneratedCode}
                                    originalTitle={`${unit.programUnitType}: ${unit.name}`}
                                    generatedTitle="Generated APEX Code"
                                    explanation={existingExplanation}
                                />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// =====================================================
// Helper Components
// =====================================================

function ImpactBadge({ impact }: { impact: 'high' | 'medium' | 'low' }) {
    const variant = impact === 'high' ? 'error' : impact === 'medium' ? 'warning' : 'neutral';
    return (
        <StatusBadge variant={variant}>
            {impact === 'high' ? '🔥' : impact === 'medium' ? '⚠️' : '✓'} {impact} impact
        </StatusBadge>
    );
}

function ClassificationBadge({ classification }: { classification: LogicCategory }) {
    const colorMap: Record<LogicCategory, string> = {
        'UI Logic': 'bg-purple-100 text-purple-700 border-purple-200',
        'Validation Logic': 'bg-amber-100 text-amber-700 border-amber-200',
        'Business Logic': 'bg-blue-100 text-blue-700 border-blue-200',
        'Transaction Logic': 'bg-rose-100 text-rose-700 border-rose-200',
        'Integration Logic': 'bg-cyan-100 text-cyan-700 border-cyan-200',
        'Security/Access Control': 'bg-red-100 text-red-700 border-red-200',
        'Utility/Helper': 'bg-slate-100 text-slate-700 border-slate-200',
        Unknown: 'bg-slate-100 text-slate-500 border-slate-200',
    };

    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorMap[classification]}`}
        >
            {classification}
        </span>
    );
}

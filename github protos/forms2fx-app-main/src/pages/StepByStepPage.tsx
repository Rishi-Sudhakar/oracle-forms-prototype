import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ListChecks,
    Zap,
    Package,
    ChevronRight,
    ChevronDown,
    AlertTriangle,
    CheckCircle2,
    Sparkles,
    FileCode2,
    ArrowRight
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import StatusBadge from '../components/StatusBadge';
import CodeBlock from '../components/CodeBlock';

interface ImplementationStep {
    id: string;
    title: string;
    type: 'trigger' | 'program-unit' | 'dynamic-action';
    source: string;
    priority: 'critical' | 'high' | 'medium';
    description: string;
    originalCode?: string;
    generatedCode?: string;
    explanation?: string;
    dependencies?: string[];
    apexTarget?: string;
    status: 'pending' | 'generated' | 'reviewed';
}

export default function StepByStepPage() {
    const { fileId } = useParams();
    const {
        currentAnalysis,
        files,
        selectFile,
        generatedCode,
        generatedExplanations
    } = useAnalysisStore();
    const [expandedStep, setExpandedStep] = useState<string | null>(null);

    // Load file if not selected
    useEffect(() => {
        if (!currentAnalysis && fileId) {
            const file = files.find((f) => f.id === fileId);
            if (file) selectFile(file);
        }
    }, [fileId, currentAnalysis, files, selectFile]);

    // Build implementation steps from impactful items only
    const implementationSteps = useMemo((): ImplementationStep[] => {
        if (!currentAnalysis) return [];

        const steps: ImplementationStep[] = [];

        // 1. Add high-impact triggers
        const allTriggers: Array<{ trigger: typeof currentAnalysis.triggers[0]; source: string }> = [];

        // Form-level triggers
        currentAnalysis.triggers.forEach(t => {
            allTriggers.push({ trigger: t, source: 'Form' });
        });

        // Block and Item triggers
        currentAnalysis.blocks.forEach(block => {
            block.triggers.forEach(t => {
                allTriggers.push({ trigger: t, source: `Block: ${block.name}` });
            });
            block.items.forEach(item => {
                item.triggers.forEach(t => {
                    allTriggers.push({ trigger: t, source: `Item: ${block.name}.${item.name}` });
                });
            });
        });

        // Filter to important triggers (not unknown classification, has code)
        const importantTriggers = allTriggers.filter(({ trigger }) => {
            const isImportant = trigger.classification !== 'unknown' &&
                trigger.decodedText &&
                trigger.decodedText.length > 50;
            return isImportant;
        });

        // Sort by importance (form-level first, then by classification)
        importantTriggers.sort((a, b) => {
            if (a.source === 'Form' && b.source !== 'Form') return -1;
            if (a.source !== 'Form' && b.source === 'Form') return 1;

            // Prioritize validation, navigation, transaction
            const priorityOrder = ['validation', 'navigation', 'transaction', 'query', 'display', 'utility'];
            const aIndex = priorityOrder.indexOf(a.trigger.classification);
            const bIndex = priorityOrder.indexOf(b.trigger.classification);
            return aIndex - bIndex;
        });

        // Add top triggers
        importantTriggers.slice(0, 10).forEach(({ trigger, source }, index) => {
            const key = `${source}-${trigger.name}`;
            const hasGenerated = !!generatedCode[key];

            steps.push({
                id: `trigger-${index}`,
                title: trigger.name,
                type: 'trigger',
                source,
                priority: trigger.classification === 'validation' || trigger.classification === 'pre-dml' || trigger.classification === 'post-dml' || trigger.classification === 'commit'
                    ? 'critical'
                    : trigger.classification === 'navigation' || trigger.classification === 'post-query'
                        ? 'high'
                        : 'medium',
                description: `${trigger.classification} trigger - ${trigger.apexTarget.type}`,
                originalCode: trigger.decodedText,
                generatedCode: generatedCode[key],
                explanation: generatedExplanations[key],
                apexTarget: trigger.apexTarget.type,
                status: hasGenerated ? 'generated' : 'pending'
            });
        });

        // 2. Add high-impact program units
        const programUnits = currentAnalysis.programUnitsEnriched || [];
        const importantUnits = programUnits
            .filter(unit =>
                unit.impactScore === 'high' ||
                unit.isMainFunction ||
                unit.complexity >= 7 ||
                unit.calledBy.length >= 3
            )
            .slice(0, 10);

        importantUnits.forEach((unit, index) => {
            const key = `unit-${unit.name}`;
            const hasGenerated = !!generatedCode[key];

            steps.push({
                id: `unit-${index}`,
                title: unit.name,
                type: 'program-unit',
                source: unit.programUnitType,
                priority: unit.impactScore === 'high' ? 'critical' : unit.complexity >= 7 ? 'high' : 'medium',
                description: unit.businessResponsibility || `${unit.classification} - ${unit.lineCount} lines`,
                originalCode: unit.decodedText,
                generatedCode: generatedCode[key],
                explanation: generatedExplanations[key],
                dependencies: unit.dependencies.slice(0, 5),
                status: hasGenerated ? 'generated' : 'pending'
            });
        });

        // Sort by priority
        const priorityOrder = { critical: 0, high: 1, medium: 2 };
        steps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return steps;
    }, [currentAnalysis, generatedCode, generatedExplanations]);

    // Stats
    const stats = useMemo(() => {
        const total = implementationSteps.length;
        const generated = implementationSteps.filter(s => s.status === 'generated').length;
        const critical = implementationSteps.filter(s => s.priority === 'critical').length;
        return { total, generated, critical };
    }, [implementationSteps]);

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
                            <span className="text-slate-900">Step by Step</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <ListChecks className="w-7 h-7 text-emerald-500" />
                            Step by Step Implementation
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Focus on the most impactful items for migration
                        </p>
                    </div>
                </div>
            </header>

            <div className="p-8">
                {/* Progress Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="card p-4">
                        <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
                        <div className="text-sm text-slate-500">Total Steps</div>
                    </div>
                    <div className="card p-4">
                        <div className="text-3xl font-bold text-rose-600">{stats.critical}</div>
                        <div className="text-sm text-slate-500">Critical Items</div>
                    </div>
                    <div className="card p-4">
                        <div className="text-3xl font-bold text-emerald-600">{stats.generated}</div>
                        <div className="text-sm text-slate-500">AI Generated</div>
                    </div>
                    <div className="card p-4">
                        <div className="text-3xl font-bold text-violet-600">
                            {stats.total > 0 ? Math.round((stats.generated / stats.total) * 100) : 0}%
                        </div>
                        <div className="text-sm text-slate-500">Complete</div>
                    </div>
                </div>

                {/* Implementation Steps */}
                <div className="space-y-4">
                    {implementationSteps.length === 0 ? (
                        <div className="card p-12 text-center">
                            <ListChecks className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Impactful Items Found</h3>
                            <p className="text-slate-500">
                                This form doesn't have any high-complexity triggers or program units.
                            </p>
                        </div>
                    ) : (
                        implementationSteps.map((step, index) => (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className="card overflow-hidden"
                            >
                                <button
                                    onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                                >
                                    {/* Step number */}
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                                        ${step.status === 'generated'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : step.priority === 'critical'
                                                ? 'bg-rose-100 text-rose-700'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {step.status === 'generated' ? (
                                            <CheckCircle2 className="w-5 h-5" />
                                        ) : (
                                            index + 1
                                        )}
                                    </div>

                                    {/* Step info */}
                                    <div className="flex-1 text-left">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-slate-900">{step.title}</h3>
                                            {step.type === 'trigger' ? (
                                                <Zap className="w-4 h-4 text-amber-500" />
                                            ) : (
                                                <Package className="w-4 h-4 text-blue-500" />
                                            )}
                                            <span className="text-xs text-slate-500">{step.source}</span>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-1">{step.description}</p>
                                    </div>

                                    {/* Status badges */}
                                    <div className="flex items-center gap-2">
                                        <StatusBadge
                                            variant={
                                                step.priority === 'critical' ? 'error' :
                                                    step.priority === 'high' ? 'warning' : 'neutral'
                                            }
                                        >
                                            {step.priority}
                                        </StatusBadge>
                                        {step.generatedCode && (
                                            <StatusBadge variant="success">
                                                <Sparkles className="w-3 h-3 mr-1" />
                                                Generated
                                            </StatusBadge>
                                        )}
                                    </div>

                                    {/* Expand icon */}
                                    {expandedStep === step.id ? (
                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                    )}
                                </button>

                                {/* Expanded content */}
                                {expandedStep === step.id && (
                                    <div className="border-t border-slate-200 p-6 space-y-4 bg-slate-50">
                                        {/* APEX Target */}
                                        {step.apexTarget && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <ArrowRight className="w-4 h-4 text-emerald-500" />
                                                <span className="font-medium text-slate-700">APEX Target:</span>
                                                <span className="text-emerald-600">{step.apexTarget}</span>
                                            </div>
                                        )}

                                        {/* Dependencies */}
                                        {step.dependencies && step.dependencies.length > 0 && (
                                            <div>
                                                <span className="text-sm font-medium text-slate-700">Dependencies: </span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {step.dependencies.map(dep => (
                                                        <span key={dep} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                            {dep}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Original Code */}
                                        {step.originalCode && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-700 mb-2">Original PL/SQL</h4>
                                                <CodeBlock code={step.originalCode} maxHeight={200} />
                                            </div>
                                        )}

                                        {/* Generated Code */}
                                        {step.generatedCode ? (
                                            <div>
                                                <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4" />
                                                    Generated APEX Code
                                                </h4>
                                                <CodeBlock code={step.generatedCode} maxHeight={300} />
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                                <div className="flex items-center gap-2 text-amber-800">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    <span className="font-medium">Not yet generated</span>
                                                </div>
                                                <p className="text-sm text-amber-700 mt-1">
                                                    Go to {step.type === 'trigger' ? 'Triggers' : 'Program Units'} page to generate APEX code for this item.
                                                </p>
                                            </div>
                                        )}

                                        {/* Explanation */}
                                        {step.explanation && (
                                            <div className="p-4 bg-slate-100 rounded-lg">
                                                <h4 className="text-sm font-semibold text-slate-700 mb-2">Explanation</h4>
                                                <pre className="text-sm text-slate-600 whitespace-pre-wrap">{step.explanation}</pre>
                                            </div>
                                        )}

                                        {/* Action Link */}
                                        <div className="pt-4 border-t border-slate-200">
                                            <Link
                                                to={step.type === 'trigger'
                                                    ? `/analysis/${fileId}/triggers`
                                                    : `/analysis/${fileId}/program-units`
                                                }
                                                className="btn-primary inline-flex items-center gap-2"
                                            >
                                                {step.generatedCode ? 'View in Full Page' : 'Generate Code'}
                                                <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

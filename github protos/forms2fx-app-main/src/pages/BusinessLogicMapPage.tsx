import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Network,
    Star,
    Zap,
    ArrowRight,
    FileCode2,
    ChevronRight,
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import StatusBadge from '../components/StatusBadge';
import type { HierarchyNode, ProgramUnitEnriched } from '../types/forms';

export default function BusinessLogicMapPage() {
    const { fileId } = useParams();
    const { files } = useAnalysisStore();

    const file = files.find((f) => f.id === fileId);
    const formModule = file?.formModule;
    const hierarchy = formModule?.formLogicHierarchy;
    const programUnits = formModule?.programUnitsEnriched || [];
    const mainFunctions = programUnits.filter((u) => u.isMainFunction);

    if (!formModule || !hierarchy) {
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
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Network className="w-6 h-6 text-primary-500" />
                    Business Logic Map
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Understand the core business logic and call hierarchy of {formModule.name}
                </p>
            </header>

            <div className="p-8 space-y-8">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard
                        icon={<Star className="w-5 h-5 text-amber-500" />}
                        label="Main Functions"
                        value={mainFunctions.length}
                        color="amber"
                    />
                    <StatCard
                        icon={<Zap className="w-5 h-5 text-blue-500" />}
                        label="Entry Points"
                        value={hierarchy.entryPoints.length}
                        color="blue"
                    />
                    <StatCard
                        icon={<FileCode2 className="w-5 h-5 text-purple-500" />}
                        label="Supporting Utilities"
                        value={hierarchy.supportingUtilities.length}
                        color="purple"
                    />
                    <StatCard
                        icon={<ArrowRight className="w-5 h-5 text-slate-500" />}
                        label="UI Glue Logic"
                        value={hierarchy.uiGlueLogic.length}
                        color="slate"
                    />
                </div>

                {/* Main Functions Cards */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500" fill="currentColor" />
                        Core Business Controllers
                    </h2>

                    {mainFunctions.length === 0 ? (
                        <div className="card p-8 text-center text-slate-500">
                            No main functions identified in this form
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {mainFunctions.map((unit) => (
                                <MainFunctionCard key={unit.name} unit={unit} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Entry Points */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-blue-500" />
                        Entry Points
                    </h2>

                    <div className="card divide-y divide-slate-200">
                        {hierarchy.entryPoints.length === 0 ? (
                            <div className="p-6 text-center text-slate-500">
                                No entry points identified
                            </div>
                        ) : (
                            hierarchy.entryPoints.map((node, i) => (
                                <HierarchyNodeItem key={`${node.name}-${i}`} node={node} depth={0} />
                            ))
                        )}
                    </div>
                </section>

                {/* Call Tree Visualization */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">
                        Form Logic Hierarchy
                    </h2>

                    <div className="card p-6">
                        <div className="mb-4 flex items-center gap-6 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-full bg-amber-500" />
                                Entry Point
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-full bg-blue-500" />
                                Main Function
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 rounded-full bg-slate-400" />
                                Helper
                            </span>
                        </div>

                        <div className="space-y-2">
                            {hierarchy.entryPoints.slice(0, 5).map((node, i) => (
                                <CallTreeNode key={`tree-${node.name}-${i}`} node={node} />
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

// =====================================================
// Components
// =====================================================

function StatCard({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card p-4 border-l-4 border-${color}-500`}
        >
            <div className="flex items-center gap-3">
                {icon}
                <div>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                </div>
            </div>
        </motion.div>
    );
}

function MainFunctionCard({ unit }: { unit: ProgramUnitEnriched }) {
    const triggerCallers = unit.calledBy.filter((c) => c.startsWith('Trigger:'));

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-5 hover:shadow-md transition-shadow"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" fill="currentColor" />
                    <h3 className="font-mono text-sm font-semibold text-slate-900">{unit.name}</h3>
                </div>
                <ImpactBadge impact={unit.impactScore} />
            </div>

            {unit.businessResponsibility && (
                <p className="text-sm text-slate-600 mb-3">{unit.businessResponsibility}</p>
            )}

            {unit.mainFunctionReason && (
                <p className="text-xs text-slate-500 mb-3 italic">💡 {unit.mainFunctionReason}</p>
            )}

            <div className="space-y-2 text-xs">
                {/* Entry points */}
                {triggerCallers.length > 0 && (
                    <div>
                        <span className="font-semibold text-slate-700">Entry Points:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {triggerCallers.slice(0, 3).map((caller) => (
                                <span
                                    key={caller}
                                    className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs"
                                >
                                    {caller.replace('Trigger: ', '')}
                                </span>
                            ))}
                            {triggerCallers.length > 3 && (
                                <span className="text-slate-400">+{triggerCallers.length - 3} more</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Downstream calls */}
                {unit.dependencies.length > 0 && (
                    <div>
                        <span className="font-semibold text-slate-700">Calls:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {unit.dependencies.slice(0, 4).map((dep) => (
                                <span
                                    key={dep}
                                    className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono"
                                >
                                    {dep}
                                </span>
                            ))}
                            {unit.dependencies.length > 4 && (
                                <span className="text-slate-400">+{unit.dependencies.length - 4} more</span>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-4 pt-2 text-slate-500 border-t border-slate-100 mt-2">
                    <span>{unit.lineCount} lines</span>
                    <span>Complexity: {unit.complexity}/10</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {unit.classification}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

function HierarchyNodeItem({ node, depth }: { node: HierarchyNode; depth: number }) {
    return (
        <div className="p-4" style={{ marginLeft: depth * 24 }}>
            <div className="flex items-center gap-3">
                <span
                    className={`w-2 h-2 rounded-full ${node.type === 'trigger' ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                />
                <span className="font-mono text-sm text-slate-900">{node.name}</span>
                <ImpactBadge impact={node.impactScore} />
            </div>
            <p className="text-xs text-slate-500 mt-1 ml-5">{node.description}</p>
        </div>
    );
}

function CallTreeNode({ node, depth = 0 }: { node: HierarchyNode; depth?: number }) {
    if (depth > 3) return null;

    return (
        <div style={{ marginLeft: depth * 20 }}>
            <div className="flex items-center gap-2 py-1">
                {depth > 0 && (
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                )}
                <span
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${depth === 0
                        ? 'bg-amber-500'
                        : node.impactScore === 'high'
                            ? 'bg-blue-500'
                            : 'bg-slate-400'
                        }`}
                />
                <span className="font-mono text-xs text-slate-700">{node.name}</span>
                <span className="text-xs text-slate-400">({node.classification})</span>
            </div>
            {node.children.map((child, i) => (
                <CallTreeNode key={`${child.name}-${i}`} node={child} depth={depth + 1} />
            ))}
        </div>
    );
}

function ImpactBadge({ impact }: { impact: 'high' | 'medium' | 'low' }) {
    const variant = impact === 'high' ? 'error' : impact === 'medium' ? 'warning' : 'neutral';
    return (
        <StatusBadge variant={variant}>
            {impact}
        </StatusBadge>
    );
}

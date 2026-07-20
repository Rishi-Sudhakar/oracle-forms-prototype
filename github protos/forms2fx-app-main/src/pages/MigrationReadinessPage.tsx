import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Gauge,
    AlertTriangle,
    CheckCircle2,
    Clock,
    TrendingUp,
    AlertCircle,
    FileCode2,
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import StatusBadge from '../components/StatusBadge';
import type { RiskItem, PriorityItem } from '../types/forms';

export default function MigrationReadinessPage() {
    const { fileId } = useParams();
    const { files } = useAnalysisStore();

    const file = files.find((f) => f.id === fileId);
    const formModule = file?.formModule;
    const readiness = formModule?.migrationReadiness;

    if (!formModule || !readiness) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-500">No analysis data available</p>
            </div>
        );
    }

    const complexityColor =
        readiness.overallComplexity >= 7
            ? 'text-rose-500'
            : readiness.overallComplexity >= 4
                ? 'text-amber-500'
                : 'text-emerald-500';

    return (
        <div className="flex-1 overflow-auto">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-6">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Gauge className="w-6 h-6 text-primary-500" />
                    Migration Readiness
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Assess migration complexity, risks, and priorities for {formModule.name}
                </p>
            </header>

            <div className="p-8 space-y-8">
                {/* Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Complexity Gauge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="card p-6 col-span-1 md:col-span-2 lg:col-span-1"
                    >
                        <div className="text-center">
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                                Overall Complexity
                            </p>
                            <p className={`text-5xl font-bold ${complexityColor}`}>
                                {readiness.overallComplexity}
                                <span className="text-xl text-slate-400">/10</span>
                            </p>
                            <p className="text-sm text-slate-500 mt-2">
                                {readiness.overallComplexity >= 7
                                    ? 'High complexity - careful planning required'
                                    : readiness.overallComplexity >= 4
                                        ? 'Moderate complexity - standard migration'
                                        : 'Low complexity - straightforward migration'}
                            </p>
                        </div>
                    </motion.div>

                    {/* Total Units */}
                    <StatCard
                        icon={<FileCode2 className="w-5 h-5 text-blue-500" />}
                        label="Total Program Units"
                        value={readiness.totalProgramUnits}
                    />

                    {/* Effort Estimate */}
                    <StatCard
                        icon={<Clock className="w-5 h-5 text-purple-500" />}
                        label="Estimated Effort"
                        value={readiness.estimatedEffort}
                        isText
                    />

                    {/* Risk Count */}
                    <StatCard
                        icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
                        label="Critical Risks"
                        value={readiness.criticalRisks.filter((r) => r.severity === 'high').length}
                    />
                </div>

                {/* Complexity Breakdown */}
                <section className="card p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Complexity Breakdown</h2>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-rose-50 rounded-lg">
                            <p className="text-3xl font-bold text-rose-600">
                                {readiness.highComplexityUnits}
                            </p>
                            <p className="text-sm text-rose-700">High Complexity</p>
                            <p className="text-xs text-rose-500 mt-1">7-10 score</p>
                        </div>

                        <div className="text-center p-4 bg-amber-50 rounded-lg">
                            <p className="text-3xl font-bold text-amber-600">
                                {readiness.mediumComplexityUnits}
                            </p>
                            <p className="text-sm text-amber-700">Medium Complexity</p>
                            <p className="text-xs text-amber-500 mt-1">4-6 score</p>
                        </div>

                        <div className="text-center p-4 bg-emerald-50 rounded-lg">
                            <p className="text-3xl font-bold text-emerald-600">
                                {readiness.lowComplexityUnits}
                            </p>
                            <p className="text-sm text-emerald-700">Low Complexity</p>
                            <p className="text-xs text-emerald-500 mt-1">1-3 score</p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                        <div className="h-4 rounded-full overflow-hidden flex bg-slate-200">
                            <div
                                className="bg-rose-500 transition-all"
                                style={{
                                    width: `${(readiness.highComplexityUnits / readiness.totalProgramUnits) * 100}%`,
                                }}
                            />
                            <div
                                className="bg-amber-500 transition-all"
                                style={{
                                    width: `${(readiness.mediumComplexityUnits / readiness.totalProgramUnits) * 100}%`,
                                }}
                            />
                            <div
                                className="bg-emerald-500 transition-all"
                                style={{
                                    width: `${(readiness.lowComplexityUnits / readiness.totalProgramUnits) * 100}%`,
                                }}
                            />
                        </div>
                    </div>
                </section>

                {/* Critical Risks */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Critical Risks ({readiness.criticalRisks.length})
                    </h2>

                    {readiness.criticalRisks.length === 0 ? (
                        <div className="card p-6 text-center">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                            <p className="text-slate-600">No critical risks identified</p>
                        </div>
                    ) : (
                        <div className="card divide-y divide-slate-200">
                            {readiness.criticalRisks.map((risk, i) => (
                                <RiskItemRow key={`${risk.unitName}-${i}`} risk={risk} />
                            ))}
                        </div>
                    )}
                </section>

                {/* Migration Priority */}
                <section>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Migration Priority (Top 10)
                    </h2>

                    <div className="card overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                                        Priority
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                                        Program Unit
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                                        Reason
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                                        Est. Hours
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {readiness.priorityList.slice(0, 10).map((item) => (
                                    <PriorityItemRow key={item.unitName} item={item} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Migration Tips */}
                <section className="card p-6 bg-blue-50 border-blue-200">
                    <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Migration Recommendations
                    </h2>
                    <ul className="space-y-2 text-sm text-blue-800">
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <span>
                                Start with <strong>low-complexity, high-impact</strong> units for quick wins
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <span>
                                Address units with <strong>Forms-specific builtins</strong> early as they
                                require custom APEX implementations
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <span>
                                Main functions should be migrated before their dependencies for easier testing
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <span>
                                UI Logic can often be simplified or eliminated in APEX - review before
                                converting
                            </span>
                        </li>
                    </ul>
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
    isText,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    isText?: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-4"
        >
            <div className="flex items-center gap-3">
                {icon}
                <div>
                    <p className={`${isText ? 'text-lg' : 'text-2xl'} font-bold text-slate-900`}>
                        {value}
                    </p>
                    <p className="text-xs text-slate-500">{label}</p>
                </div>
            </div>
        </motion.div>
    );
}

function RiskItemRow({ risk }: { risk: RiskItem }) {
    const severityVariant =
        risk.severity === 'high' ? 'error' : risk.severity === 'medium' ? 'warning' : 'neutral';

    const riskTypeLabel = {
        'tight-ui-coupling': '🔗 UI Coupling',
        'heavy-trigger-logic': '⚡ Heavy Trigger',
        'forms-builtins': '📦 Forms Builtins',
        'direct-dml-in-trigger': '💾 Direct DML',
        'complex-logic': '🧩 Complex Logic',
    }[risk.riskType];

    return (
        <div className="p-4 flex items-start gap-4">
            <AlertTriangle
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${risk.severity === 'high' ? 'text-rose-500' : 'text-amber-500'
                    }`}
            />
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-semibold text-slate-900">
                        {risk.unitName}
                    </span>
                    <StatusBadge variant={severityVariant}>{risk.severity}</StatusBadge>
                    <span className="text-xs text-slate-500">{riskTypeLabel}</span>
                </div>
                <p className="text-sm text-slate-600">{risk.description}</p>
            </div>
        </div>
    );
}

function PriorityItemRow({ item }: { item: PriorityItem }) {
    return (
        <tr className="hover:bg-slate-50">
            <td className="px-4 py-3">
                <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${item.priority <= 3
                            ? 'bg-rose-100 text-rose-700'
                            : item.priority <= 6
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                        }`}
                >
                    {item.priority}
                </span>
            </td>
            <td className="px-4 py-3 font-mono text-sm text-slate-900">{item.unitName}</td>
            <td className="px-4 py-3 text-sm text-slate-600">{item.reason}</td>
            <td className="px-4 py-3 text-sm text-slate-700 font-semibold">{item.estimatedHours}h</td>
        </tr>
    );
}

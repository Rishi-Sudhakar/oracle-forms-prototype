import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Layers,
    Zap,
    List,
    Database,
    LayoutGrid,
    ArrowRight,
    AlertTriangle,
    CheckCircle,
    FileCode2,
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

export default function FormOverview() {
    const { fileId } = useParams();
    const { currentAnalysis, files, selectFile } = useAnalysisStore();

    useEffect(() => {
        if (!currentAnalysis && fileId) {
            const file = files.find((f) => f.id === fileId);
            if (file) selectFile(file);
        }
    }, [fileId, currentAnalysis, files, selectFile]);

    if (!currentAnalysis) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <FileCode2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No analysis data available</p>
                    <Link to="/upload" className="btn-primary mt-4">
                        Upload a file
                    </Link>
                </div>
            </div>
        );
    }

    const totalItems = currentAnalysis.blocks.reduce(
        (sum, b) => sum + b.items.length,
        0
    );

    const totalTriggers =
        currentAnalysis.triggers.length +
        currentAnalysis.blocks.reduce((sum, b) => sum + b.triggers.length, 0) +
        currentAnalysis.blocks.reduce(
            (sum, b) =>
                sum + b.items.reduce((iSum, i) => iSum + i.triggers.length, 0),
            0
        );

    const dbBlocks = currentAnalysis.blocks.filter((b) => b.databaseBlock);
    const nonDbBlocks = currentAnalysis.blocks.filter((b) => !b.databaseBlock);

    return (
        <div className="flex-1 overflow-auto">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-6">
                <div className="flex items-center gap-3 text-sm text-slate-500 mb-2">
                    <Link to="/" className="hover:text-primary-600">
                        Dashboard
                    </Link>
                    <span>/</span>
                    <span className="text-slate-900">{currentAnalysis.name}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {currentAnalysis.name}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {currentAnalysis.title || 'Oracle Forms Module Analysis'}
                        </p>
                    </div>
                    <Link
                        to={`/analysis/${fileId}/mapping`}
                        className="btn-primary"
                    >
                        View APEX Mapping
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </header>

            {/* Content */}
            <div className="p-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Data Blocks"
                        value={currentAnalysis.blocks.length}
                        icon={Layers}
                        color="blue"
                        subtitle={`${dbBlocks.length} database, ${nonDbBlocks.length} control`}
                    />
                    <StatCard
                        title="Items"
                        value={totalItems}
                        icon={List}
                        color="emerald"
                        subtitle="Form fields"
                    />
                    <StatCard
                        title="Triggers"
                        value={totalTriggers}
                        icon={Zap}
                        color="amber"
                        subtitle="Logic to analyze"
                    />
                    <StatCard
                        title="LOVs"
                        value={currentAnalysis.lovs.length}
                        icon={LayoutGrid}
                        color="purple"
                        subtitle="List of Values"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Blocks List */}
                    <div className="card">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Data Blocks
                            </h2>
                            <span className="text-sm text-slate-500">
                                {currentAnalysis.blocks.length} blocks
                            </span>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                            {currentAnalysis.blocks.map((block, index) => (
                                <motion.div
                                    key={block.name}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                >
                                    <Link
                                        to={`/analysis/${fileId}/blocks/${block.name}`}
                                        className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${block.databaseBlock
                                                    ? 'bg-blue-100 text-blue-600'
                                                    : 'bg-slate-100 text-slate-600'
                                                    }`}
                                            >
                                                {block.databaseBlock ? (
                                                    <Database className="w-4 h-4" />
                                                ) : (
                                                    <Layers className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {block.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {block.items.length} items • {block.triggers.length}{' '}
                                                    triggers
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {block.databaseBlock ? (
                                                <StatusBadge variant="success">DB</StatusBadge>
                                            ) : (
                                                <StatusBadge variant="neutral">Control</StatusBadge>
                                            )}
                                            <ArrowRight className="w-4 h-4 text-slate-400" />
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Form-Level Triggers */}
                    <div className="card">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Form-Level Triggers
                            </h2>
                            <Link
                                to={`/analysis/${fileId}/triggers`}
                                className="text-sm text-primary-600 hover:text-primary-700"
                            >
                                View All →
                            </Link>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                            {currentAnalysis.triggers.length === 0 ? (
                                <div className="p-6 text-center text-slate-500 text-sm">
                                    No form-level triggers found
                                </div>
                            ) : (
                                currentAnalysis.triggers.map((trigger, index) => (
                                    <motion.div
                                        key={trigger.name}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="flex items-center justify-between px-6 py-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                                                <Zap className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {trigger.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {trigger.classification}
                                                </p>
                                            </div>
                                        </div>
                                        <StatusBadge
                                            variant={
                                                trigger.apexTarget.supportLevel === 'full'
                                                    ? 'success'
                                                    : trigger.apexTarget.supportLevel === 'partial'
                                                        ? 'warning'
                                                        : 'error'
                                            }
                                        >
                                            {trigger.apexTarget.supportLevel}
                                        </StatusBadge>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Suggested APEX Structure */}
                <div className="mt-8 card">
                    <div className="px-6 py-4 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Suggested APEX Pages
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Based on the form structure, we suggest the following APEX pages
                        </p>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {/* Main Form Page */}
                            <div className="border border-slate-200 rounded-lg p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center">
                                            <LayoutGrid className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-900">
                                                Page 10: {currentAnalysis.name} - Main
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                Main form page with navigation tree and data regions
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {dbBlocks.slice(0, 5).map((block) => (
                                                    <span
                                                        key={block.name}
                                                        className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded"
                                                    >
                                                        {block.name}
                                                    </span>
                                                ))}
                                                {dbBlocks.length > 5 && (
                                                    <span className="px-2 py-1 text-slate-400 text-xs">
                                                        +{dbBlocks.length - 5} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                                </div>
                            </div>

                            {/* LOV Page */}
                            {currentAnalysis.lovs.length > 0 && (
                                <div className="border border-slate-200 rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                                                <List className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-slate-900">
                                                    Shared Components: LOVs
                                                </h3>
                                                <p className="text-sm text-slate-500 mt-1">
                                                    {currentAnalysis.lovs.length} Shared List of Values to create
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {currentAnalysis.lovs.slice(0, 4).map((lov) => (
                                                        <span
                                                            key={lov.name}
                                                            className="px-2 py-1 bg-purple-50 text-purple-600 text-xs rounded"
                                                        >
                                                            {lov.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                                    </div>
                                </div>
                            )}

                            {/* Warnings */}
                            {currentAnalysis.blocks.some((b) =>
                                b.items.some((i) => i.itemType === 'Hierarchical Tree')
                            ) && (
                                    <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                            <div>
                                                <h3 className="font-medium text-amber-800">
                                                    Manual Implementation Required
                                                </h3>
                                                <p className="text-sm text-amber-700 mt-1">
                                                    This form contains a Hierarchical Tree which requires
                                                    custom APEX Tree Region implementation with custom
                                                    JavaScript.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

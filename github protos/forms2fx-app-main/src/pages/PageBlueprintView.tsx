import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileCode2, ChevronDown, ChevronRight, Download, Copy, Check,
    Layout, Grid3X3, Terminal, BookOpen, Layers, Box
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import StatusBadge from '../components/StatusBadge';
import { generatePageBlueprints } from '../services/uiLayoutEngine';
import type { PageBlueprint } from '../types/pageBlueprint';

export default function PageBlueprintView() {
    const { fileId } = useParams();
    const { currentAnalysis, files, selectFile } = useAnalysisStore();
    const [expandedPage, setExpandedPage] = useState<number | null>(null);
    const [activePanel, setActivePanel] = useState<'structure' | 'wireframe' | 'explanation'>('structure');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!currentAnalysis && fileId) {
            const file = files.find((f) => f.id === fileId);
            if (file) selectFile(file);
        }
    }, [fileId, currentAnalysis, files, selectFile]);

    const blueprints = useMemo(() => {
        if (!currentAnalysis) return [];
        return generatePageBlueprints(currentAnalysis);
    }, [currentAnalysis]);

    const handleExportJson = (blueprint: PageBlueprint) => {
        const data = {
            ...blueprint,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${blueprint.pageName.replace(/\s+/g, '_')}_blueprint.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportAll = () => {
        const data = {
            formModule: currentAnalysis?.name,
            blueprints,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentAnalysis?.name || 'apex'}_all_blueprints.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCopyWireframe = async (wireframe: string) => {
        await navigator.clipboard.writeText(wireframe);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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
                <div className="flex items-center gap-3 text-sm text-slate-500 mb-2">
                    <Link to="/" className="hover:text-primary-600">Dashboard</Link>
                    <span>/</span>
                    <Link to={`/analysis/${fileId}`} className="hover:text-primary-600">{currentAnalysis.name}</Link>
                    <span>/</span>
                    <span className="text-slate-900">Page Blueprints</span>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Page-Level Blueprints</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Structured page designs with sections, wireframes, and developer instructions
                        </p>
                    </div>
                    <button onClick={handleExportAll} className="btn-primary">
                        <Download className="w-4 h-4" />Export All Blueprints
                    </button>
                </div>
            </header>

            <div className="p-8">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-primary-600">{blueprints.length}</p>
                        <p className="text-sm text-slate-500">Total Pages</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-emerald-600">
                            {blueprints.filter(b => b.priority === 'main').length}
                        </p>
                        <p className="text-sm text-slate-500">Main Pages</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-amber-600">
                            {blueprints.filter(b => b.priority === 'dialog').length}
                        </p>
                        <p className="text-sm text-slate-500">Dialog Pages</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-purple-600">
                            {blueprints.reduce((sum, b) => sum + b.sections.length + b.childRegions.length, 0)}
                        </p>
                        <p className="text-sm text-slate-500">Total Regions</p>
                    </div>
                </div>

                {/* Blueprints */}
                <div className="space-y-4">
                    {blueprints.map((blueprint) => (
                        <motion.div
                            key={blueprint.pageIdSuggestion}
                            className="card overflow-hidden"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {/* Page Header */}
                            <button
                                onClick={() => setExpandedPage(
                                    expandedPage === blueprint.pageIdSuggestion ? null : blueprint.pageIdSuggestion
                                )}
                                className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg ${blueprint.priority === 'main'
                                            ? 'bg-primary-100 text-primary-600'
                                            : 'bg-amber-100 text-amber-600'
                                        }`}>
                                        {blueprint.pageIdSuggestion}
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-semibold text-slate-900">{blueprint.pageName}</h3>
                                        <p className="text-sm text-slate-500">
                                            {blueprint.sections.length} sections · {blueprint.childRegions.length} grids · {blueprint.buttons.length} buttons
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <StatusBadge variant={blueprint.priority === 'main' ? 'success' : 'warning'}>
                                        {blueprint.priority}
                                    </StatusBadge>
                                    <StatusBadge variant="info">{blueprint.template}</StatusBadge>
                                    {expandedPage === blueprint.pageIdSuggestion
                                        ? <ChevronDown className="w-5 h-5 text-slate-400" />
                                        : <ChevronRight className="w-5 h-5 text-slate-400" />
                                    }
                                </div>
                            </button>

                            {/* Expanded Content */}
                            <AnimatePresence>
                                {expandedPage === blueprint.pageIdSuggestion && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {/* Sub-tabs */}
                                        <div className="border-b border-slate-200 px-6 flex gap-1">
                                            {[
                                                { key: 'structure', label: 'Structure', icon: Layout },
                                                { key: 'wireframe', label: 'Wireframe', icon: Terminal },
                                                { key: 'explanation', label: 'Developer Guide', icon: BookOpen },
                                            ].map((tab) => (
                                                <button
                                                    key={tab.key}
                                                    onClick={() => setActivePanel(tab.key as any)}
                                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activePanel === tab.key
                                                            ? 'border-primary-500 text-primary-600'
                                                            : 'border-transparent text-slate-500 hover:text-slate-700'
                                                        }`}
                                                >
                                                    <tab.icon className="w-4 h-4" />
                                                    {tab.label}
                                                </button>
                                            ))}
                                            <div className="flex-1" />
                                            <button
                                                onClick={() => handleExportJson(blueprint)}
                                                className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500 hover:text-primary-600"
                                            >
                                                <Download className="w-4 h-4" />Export JSON
                                            </button>
                                        </div>

                                        <div className="p-6">
                                            {activePanel === 'structure' && (
                                                <div className="space-y-6">
                                                    {/* Page Info */}
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-slate-500">Theme:</span>{' '}
                                                            <span className="font-medium">{blueprint.theme}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-500">Layout:</span>{' '}
                                                            <span className="font-medium">{blueprint.layout.columns}-column {blueprint.layout.type}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-500">Source Canvases:</span>{' '}
                                                            <span className="font-medium">{blueprint.sourceCanvases.join(', ') || 'Main'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-500">Uses Tabs:</span>{' '}
                                                            <span className="font-medium">{blueprint.layout.usesSubTabs ? 'Yes' : 'No'}</span>
                                                        </div>
                                                    </div>

                                                    {/* Purpose */}
                                                    <div className="bg-slate-50 rounded-lg p-4">
                                                        <p className="text-sm text-slate-600">{blueprint.purpose}</p>
                                                    </div>

                                                    {/* Sections */}
                                                    <div>
                                                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                                            <Layers className="w-4 h-4" />Sections
                                                        </h4>
                                                        <div className="grid gap-3">
                                                            {blueprint.sections.map((section, idx) => (
                                                                <div key={idx} className="border border-slate-200 rounded-lg p-4">
                                                                    <div className="flex items-start justify-between mb-2">
                                                                        <div>
                                                                            <h5 className="font-medium text-slate-900">{section.title}</h5>
                                                                            <p className="text-sm text-slate-500">
                                                                                Region: <code className="bg-slate-100 px-1 rounded">{section.regionName}</code>
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <StatusBadge variant="info">{section.type}</StatusBadge>
                                                                            <StatusBadge variant="neutral">{section.layout}</StatusBadge>
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-slate-50 rounded p-3">
                                                                        <p className="text-xs text-slate-500 mb-2">Items ({section.items.length}):</p>
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {section.items.slice(0, 8).map((item) => (
                                                                                <span key={item.apexName} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs">
                                                                                    {item.apexName}
                                                                                    <span className="text-slate-400 ml-1">({item.redwoodType})</span>
                                                                                </span>
                                                                            ))}
                                                                            {section.items.length > 8 && (
                                                                                <span className="text-xs text-slate-400">+{section.items.length - 8} more</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Child Regions */}
                                                    {blueprint.childRegions.length > 0 && (
                                                        <div>
                                                            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                                                <Grid3X3 className="w-4 h-4" />Detail Grids
                                                            </h4>
                                                            <div className="grid gap-3">
                                                                {blueprint.childRegions.map((child, idx) => (
                                                                    <div key={idx} className="border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                                                                        <div>
                                                                            <h5 className="font-medium text-slate-900">{child.title}</h5>
                                                                            <p className="text-sm text-slate-500">
                                                                                {child.regionName} · Source: {child.sourceBlock}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <StatusBadge variant="success">{child.type}</StatusBadge>
                                                                            {child.collapsible && <StatusBadge variant="neutral">Collapsible</StatusBadge>}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Buttons */}
                                                    {blueprint.buttons.length > 0 && (
                                                        <div>
                                                            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                                                <Box className="w-4 h-4" />Buttons
                                                            </h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {blueprint.buttons.map((btn, idx) => (
                                                                    <div key={idx} className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                                                                        <span className="font-medium">{btn.label}</span>
                                                                        <span className="text-xs text-slate-500">({btn.position})</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {activePanel === 'wireframe' && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-semibold text-slate-900">ASCII Wireframe</h4>
                                                        <button
                                                            onClick={() => handleCopyWireframe(blueprint.wireframe)}
                                                            className="btn-secondary text-sm"
                                                        >
                                                            {copied ? <><Check className="w-4 h-4 text-emerald-500" />Copied!</> : <><Copy className="w-4 h-4" />Copy</>}
                                                        </button>
                                                    </div>
                                                    <pre className="bg-slate-900 text-green-400 p-6 rounded-lg overflow-x-auto font-mono text-sm leading-relaxed">
                                                        {blueprint.wireframe}
                                                    </pre>
                                                </div>
                                            )}

                                            {activePanel === 'explanation' && (
                                                <div className="prose prose-slate max-w-none">
                                                    <div className="bg-white border border-slate-200 rounded-lg p-6">
                                                        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                                                            {blueprint.developerExplanation}
                                                        </pre>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}

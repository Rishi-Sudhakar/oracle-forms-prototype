import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Copy, Check, FileCode2, Layers, Zap, List, LayoutGrid, ChevronDown, ChevronRight, GitBranch, Table } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import StatusBadge from '../components/StatusBadge';
import { buildHierarchicalMapping } from '../services/uiLayoutEngine';

interface MappingRow {
    formsComponent: string;
    formsType: string;
    formsName: string;
    apexComponent: string;
    apexType: string;
    apexName: string;
    status: 'full' | 'partial' | 'manual';
}

export default function ApexMapping() {
    const { fileId } = useParams();
    const { currentAnalysis, files, selectFile } = useAnalysisStore();
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'blocks' | 'items' | 'triggers' | 'lovs'>('blocks');
    const [viewMode, setViewMode] = useState<'flat' | 'tree'>('flat');
    const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set());
    const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!currentAnalysis && fileId) {
            const file = files.find((f) => f.id === fileId);
            if (file) selectFile(file);
        }
    }, [fileId, currentAnalysis, files, selectFile]);

    const mappings = useMemo(() => {
        if (!currentAnalysis) return { blocks: [], items: [], triggers: [], lovs: [] };

        const blocks: MappingRow[] = currentAnalysis.blocks.map((block) => ({
            formsComponent: 'Block',
            formsType: block.databaseBlock ? 'Database Block' : 'Control Block',
            formsName: block.name,
            apexComponent: 'Region',
            apexType: block.databaseBlock ? (block.recordsDisplayCount > 1 ? 'Interactive Grid' : 'Form') : 'Static Content',
            apexName: `R_${block.name}`,
            status: 'full',
        }));

        const items: MappingRow[] = [];
        currentAnalysis.blocks.forEach((block) => {
            block.items.forEach((item) => {
                items.push({
                    formsComponent: 'Item',
                    formsType: item.itemType,
                    formsName: `${block.name}.${item.name}`,
                    apexComponent: 'Page Item',
                    apexType: item.uiLayout?.preferredItemType || 'Text Field',
                    apexName: `P10_${item.name}`,
                    status: item.itemType === 'Hierarchical Tree' ? 'manual' : 'full',
                });
            });
        });

        const triggers: MappingRow[] = [];
        const addTrigger = (t: any, source: string) => {
            triggers.push({
                formsComponent: 'Trigger',
                formsType: t.classification,
                formsName: `${source}.${t.name}`,
                apexComponent: t.apexTarget.type,
                apexType: t.apexTarget.point,
                apexName: `${t.name.replace(/-/g, '_')}`,
                status: t.apexTarget.supportLevel,
            });
        };
        currentAnalysis.triggers.forEach((t) => addTrigger(t, 'Form'));
        currentAnalysis.blocks.forEach((block) => {
            block.triggers.forEach((t) => addTrigger(t, block.name));
            block.items.forEach((item) => item.triggers.forEach((t) => addTrigger(t, `${block.name}.${item.name}`)));
        });

        const lovs: MappingRow[] = currentAnalysis.lovs.map((lov) => ({
            formsComponent: 'LOV',
            formsType: 'List of Values',
            formsName: lov.name,
            apexComponent: 'Shared LOV',
            apexType: 'Dynamic',
            apexName: lov.name,
            status: 'full',
        }));

        return { blocks, items, triggers, lovs };
    }, [currentAnalysis]);

    const hierarchicalMapping = useMemo(() => {
        if (!currentAnalysis) return null;
        return buildHierarchicalMapping(currentAnalysis);
    }, [currentAnalysis]);

    const stats = useMemo(() => {
        const all = [...mappings.blocks, ...mappings.items, ...mappings.triggers, ...mappings.lovs];
        return {
            total: all.length,
            full: all.filter((m) => m.status === 'full').length,
            partial: all.filter((m) => m.status === 'partial').length,
            manual: all.filter((m) => m.status === 'manual').length,
        };
    }, [mappings]);

    const handleExportJson = () => {
        const data = viewMode === 'tree' && hierarchicalMapping
            ? { formName: currentAnalysis?.name, hierarchicalMapping, exportedAt: new Date().toISOString() }
            : { formName: currentAnalysis?.name, mappings, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentAnalysis?.name || 'apex'}_mapping.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCopyTable = async () => {
        const current = activeTab === 'blocks' ? mappings.blocks : activeTab === 'items' ? mappings.items : activeTab === 'triggers' ? mappings.triggers : mappings.lovs;
        const text = current.map((r) => `${r.formsName}\t${r.formsType}\t${r.apexComponent}\t${r.apexType}\t${r.apexName}`).join('\n');
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const togglePage = (pageId: number) => {
        setExpandedPages(prev => {
            const next = new Set(prev);
            if (next.has(pageId)) next.delete(pageId);
            else next.add(pageId);
            return next;
        });
    };

    const toggleRegion = (regionKey: string) => {
        setExpandedRegions(prev => {
            const next = new Set(prev);
            if (next.has(regionKey)) next.delete(regionKey);
            else next.add(regionKey);
            return next;
        });
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

    const currentMappings = activeTab === 'blocks' ? mappings.blocks : activeTab === 'items' ? mappings.items : activeTab === 'triggers' ? mappings.triggers : mappings.lovs;

    return (
        <div className="flex-1 overflow-auto">
            <header className="bg-white border-b border-slate-200 px-8 py-6">
                <div className="flex items-center gap-3 text-sm text-slate-500 mb-2">
                    <Link to="/" className="hover:text-primary-600">Dashboard</Link><span>/</span>
                    <Link to={`/analysis/${fileId}`} className="hover:text-primary-600">{currentAnalysis.name}</Link><span>/</span>
                    <span className="text-slate-900">APEX Mapping</span>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">APEX Mapping Summary</h1>
                        <p className="mt-1 text-sm text-slate-500">Complete migration blueprint for {currentAnalysis.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* View Toggle */}
                        <div className="flex items-center bg-slate-100 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('flat')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'flat' ? 'bg-white shadow text-primary-600' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <Table className="w-4 h-4" />Flat
                            </button>
                            <button
                                onClick={() => setViewMode('tree')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === 'tree' ? 'bg-white shadow text-primary-600' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                <GitBranch className="w-4 h-4" />Tree
                            </button>
                        </div>
                        <button onClick={handleCopyTable} className="btn-secondary">
                            {copied ? <><Check className="w-4 h-4 text-emerald-500" />Copied!</> : <><Copy className="w-4 h-4" />Copy</>}
                        </button>
                        <button onClick={handleExportJson} className="btn-primary"><Download className="w-4 h-4" />Export</button>
                    </div>
                </div>
            </header>

            <div className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card p-4"><p className="text-2xl font-bold text-slate-900">{stats.total}</p><p className="text-sm text-slate-500">Total Mappings</p></div>
                    <div className="card p-4"><p className="text-2xl font-bold text-emerald-600">{stats.full}</p><p className="text-sm text-slate-500">Fully Supported</p></div>
                    <div className="card p-4"><p className="text-2xl font-bold text-amber-600">{stats.partial}</p><p className="text-sm text-slate-500">Partial Support</p></div>
                    <div className="card p-4"><p className="text-2xl font-bold text-rose-600">{stats.manual}</p><p className="text-sm text-slate-500">Manual Review</p></div>
                </div>

                <div className="card">
                    {viewMode === 'flat' ? (
                        <>
                            <div className="border-b border-slate-200">
                                <div className="flex gap-1 px-4">
                                    {[
                                        { key: 'blocks', label: 'Blocks', icon: Layers, count: mappings.blocks.length },
                                        { key: 'items', label: 'Items', icon: List, count: mappings.items.length },
                                        { key: 'triggers', label: 'Triggers', icon: Zap, count: mappings.triggers.length },
                                        { key: 'lovs', label: 'LOVs', icon: LayoutGrid, count: mappings.lovs.length },
                                    ].map((tab) => (
                                        <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                            <tab.icon className="w-4 h-4" />{tab.label}<span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-100 rounded">{tab.count}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr>
                                            <th className="table-header">Forms Component</th>
                                            <th className="table-header">Forms Type</th>
                                            <th className="table-header">→</th>
                                            <th className="table-header">APEX Component</th>
                                            <th className="table-header">APEX Type</th>
                                            <th className="table-header">Suggested Name</th>
                                            <th className="table-header">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentMappings.map((row, index) => (
                                            <motion.tr key={`${row.formsName}-${index}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.01 }} className="hover:bg-slate-50">
                                                <td className="table-cell font-medium text-slate-900">{row.formsName}</td>
                                                <td className="table-cell text-slate-600">{row.formsType}</td>
                                                <td className="table-cell text-slate-400">→</td>
                                                <td className="table-cell font-medium text-primary-600">{row.apexComponent}</td>
                                                <td className="table-cell text-slate-600">{row.apexType}</td>
                                                <td className="table-cell"><code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{row.apexName}</code></td>
                                                <td className="table-cell">
                                                    <StatusBadge variant={row.status === 'full' ? 'success' : row.status === 'partial' ? 'warning' : 'error'}>
                                                        {row.status === 'full' ? 'Supported' : row.status === 'partial' ? 'Partial' : 'Manual'}
                                                    </StatusBadge>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        /* HIERARCHICAL TREE VIEW */
                        <div className="p-4">
                            <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
                                <GitBranch className="w-4 h-4" />
                                <span>Page → Region → Section → Items</span>
                            </div>

                            {hierarchicalMapping?.pageMappings.map((page) => (
                                <div key={page.pageIdSuggestion} className="mb-3">
                                    {/* Page Level */}
                                    <button
                                        onClick={() => togglePage(page.pageIdSuggestion)}
                                        className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        {expandedPages.has(page.pageIdSuggestion) ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                                        <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center font-bold">
                                            {page.pageIdSuggestion}
                                        </div>
                                        <div className="text-left flex-1">
                                            <h4 className="font-medium text-slate-900">{page.pageName}</h4>
                                            <p className="text-sm text-slate-500">{page.regions.length} regions</p>
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {expandedPages.has(page.pageIdSuggestion) && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="ml-8 mt-2 space-y-2"
                                            >
                                                {page.regions.map((region) => {
                                                    const regionKey = `${page.pageIdSuggestion}-${region.regionName}`;
                                                    return (
                                                        <div key={regionKey}>
                                                            {/* Region Level */}
                                                            <button
                                                                onClick={() => toggleRegion(regionKey)}
                                                                className="w-full flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors"
                                                            >
                                                                {region.items.length > 0 ? (
                                                                    expandedRegions.has(regionKey) ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
                                                                ) : <div className="w-4" />}
                                                                <Layers className="w-4 h-4 text-emerald-500" />
                                                                <div className="text-left flex-1">
                                                                    <span className="font-medium text-slate-900">{region.regionName}</span>
                                                                    <span className="ml-2 text-sm text-slate-500">({region.section})</span>
                                                                </div>
                                                                <StatusBadge variant="info">{region.type}</StatusBadge>
                                                                <span className="text-xs text-slate-400">{region.items.length} items</span>
                                                            </button>

                                                            <AnimatePresence>
                                                                {expandedRegions.has(regionKey) && region.items.length > 0 && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        className="ml-8 mt-1 space-y-1"
                                                                    >
                                                                        {region.items.map((item, idx) => (
                                                                            <div key={idx} className="flex items-center gap-3 p-2 text-sm bg-slate-50 rounded">
                                                                                <div className="w-4 h-4 bg-slate-200 rounded text-xs flex items-center justify-center text-slate-500">
                                                                                    {item.column},{item.row}
                                                                                </div>
                                                                                <span className="text-slate-600">{item.formsName}</span>
                                                                                <span className="text-slate-400">→</span>
                                                                                <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200 text-primary-600">{item.apexItem}</code>
                                                                                <span className="text-xs text-slate-400">({item.apexType})</span>
                                                                                <div className="flex-1" />
                                                                                <StatusBadge variant={item.status === 'full' ? 'success' : item.status === 'partial' ? 'warning' : 'error'}>
                                                                                    {item.status}
                                                                                </StatusBadge>
                                                                            </div>
                                                                        ))}
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


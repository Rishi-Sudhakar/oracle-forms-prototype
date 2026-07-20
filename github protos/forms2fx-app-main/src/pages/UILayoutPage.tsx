import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Grid3X3, FileCode2, Columns, LayoutTemplate, Monitor, Square, ChevronDown, ChevronRight } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import StatusBadge from '../components/StatusBadge';

export default function UILayoutPage() {
    const { fileId } = useParams();
    const { currentAnalysis, files, selectFile } = useAnalysisStore();
    const [activeTab, setActiveTab] = useState<'pages' | 'canvases' | 'regions' | 'theme'>('pages');
    const [expandedPage, setExpandedPage] = useState<number | null>(null);

    useEffect(() => {
        if (!currentAnalysis && fileId) {
            const file = files.find((f) => f.id === fileId);
            if (file) selectFile(file);
        }
    }, [fileId, currentAnalysis, files, selectFile]);

    if (!currentAnalysis || !currentAnalysis.uiStructure) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <FileCode2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">No UI layout data available</p>
                    <Link to="/upload" className="btn-primary mt-4">Upload a file</Link>
                </div>
            </div>
        );
    }

    const { uiStructure } = currentAnalysis;

    return (
        <div className="flex-1 overflow-auto">
            <header className="bg-white border-b border-slate-200 px-8 py-6">
                <div className="flex items-center gap-3 text-sm text-slate-500 mb-2">
                    <Link to="/" className="hover:text-primary-600">Dashboard</Link>
                    <span>/</span>
                    <Link to={`/analysis/${fileId}`} className="hover:text-primary-600">{currentAnalysis.name}</Link>
                    <span>/</span>
                    <span className="text-slate-900">UI Layout</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">UI Layout Intelligence</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Canvas structure, region mapping, and APEX page layout recommendations
                </p>
            </header>

            <div className="p-8">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-primary-600">{uiStructure.suggestedPages.length}</p>
                        <p className="text-sm text-slate-500">Suggested Pages</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-emerald-600">{currentAnalysis.canvases.length}</p>
                        <p className="text-sm text-slate-500">Canvases</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-amber-600">{uiStructure.regionGroups.length}</p>
                        <p className="text-sm text-slate-500">Region Groups</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-purple-600">{uiStructure.tabStructure.tabs.length}</p>
                        <p className="text-sm text-slate-500">Tabs</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="card">
                    <div className="border-b border-slate-200 flex">
                        {[
                            { key: 'pages', label: 'Suggested Pages', icon: LayoutTemplate },
                            { key: 'canvases', label: 'Canvas Structure', icon: Monitor },
                            { key: 'regions', label: 'Region Groups', icon: Grid3X3 },
                            { key: 'theme', label: 'Theme & Template', icon: Columns },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {activeTab === 'pages' && (
                            <div className="space-y-4">
                                {uiStructure.suggestedPages.map((page) => (
                                    <div key={page.pageNumber} className="border border-slate-200 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setExpandedPage(expandedPage === page.pageNumber ? null : page.pageNumber)}
                                            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center font-bold">
                                                    {page.pageNumber}
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="font-semibold text-slate-900">{page.pageTitle}</h3>
                                                    <p className="text-sm text-slate-500">
                                                        {page.regions.length} regions • {page.pageType}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <StatusBadge variant={page.pageType === 'Normal' ? 'success' : 'info'}>{page.pageType}</StatusBadge>
                                                {expandedPage === page.pageNumber ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                                            </div>
                                        </button>

                                        {expandedPage === page.pageNumber && (
                                            <div className="p-6 space-y-4">
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div><span className="text-slate-500">Template:</span> <span className="font-medium">{page.pageTemplate}</span></div>
                                                    <div><span className="text-slate-500">Source Canvases:</span> <span className="font-medium">{page.sourceCanvases.join(', ') || 'Main'}</span></div>
                                                </div>

                                                <h4 className="font-medium text-slate-900 mt-4">Regions</h4>
                                                <div className="space-y-3">
                                                    {page.regions.map((region, idx) => (
                                                        <div key={idx} className="border border-slate-200 rounded-lg p-4">
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div>
                                                                    <h5 className="font-medium text-slate-900">{region.title}</h5>
                                                                    <p className="text-sm text-slate-500">Source: {region.sourceBlock}</p>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <StatusBadge variant="info">{region.type}</StatusBadge>
                                                                    <StatusBadge variant="neutral">{region.layout}</StatusBadge>
                                                                </div>
                                                            </div>
                                                            <div className="bg-slate-50 rounded p-3">
                                                                <p className="text-xs text-slate-500 mb-2">Items ({region.items.length}):</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {region.items.slice(0, 10).map((item) => (
                                                                        <span key={item.apexName} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs">
                                                                            {item.apexName}
                                                                            <span className="text-slate-400 ml-1">({item.redwoodType})</span>
                                                                        </span>
                                                                    ))}
                                                                    {region.items.length > 10 && <span className="text-xs text-slate-400">+{region.items.length - 10} more</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'canvases' && (
                            <div className="space-y-4">
                                {currentAnalysis.canvases.map((canvas) => (
                                    <div key={canvas.name} className="border border-slate-200 rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${canvas.canvasType === 'Stacked' ? 'bg-purple-100 text-purple-600' :
                                                    canvas.canvasType === 'Tab' ? 'bg-amber-100 text-amber-600' :
                                                        'bg-blue-100 text-blue-600'
                                                    }`}>
                                                    <Square className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-slate-900">{canvas.name}</h4>
                                                    <p className="text-sm text-slate-500">Window: {canvas.windowName || 'Main'}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <StatusBadge variant={canvas.canvasType === 'Content' ? 'success' : canvas.canvasType === 'Stacked' ? 'info' : 'warning'}>
                                                    {canvas.canvasType}
                                                </StatusBadge>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-4 text-sm bg-slate-50 rounded p-3">
                                            <div><span className="text-slate-500">Size:</span> <span className="font-mono">{canvas.width}x{canvas.height}</span></div>
                                            <div><span className="text-slate-500">Viewport:</span> <span className="font-mono">{canvas.viewportWidth}x{canvas.viewportHeight}</span></div>
                                            <div><span className="text-slate-500">Frames:</span> <span className="font-medium">{canvas.frames.length}</span></div>
                                            <div>
                                                <span className="text-slate-500">APEX:</span>{' '}
                                                <span className="font-medium text-primary-600">
                                                    {canvas.apexLayout?.suggestedRegionPosition || 'Body'}
                                                </span>
                                            </div>
                                        </div>
                                        {canvas.frames.length > 0 && (
                                            <div className="mt-3">
                                                <p className="text-xs text-slate-500 mb-2">Frames:</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {canvas.frames.map((frame) => (
                                                        <span key={frame.name} className="px-2 py-1 bg-slate-100 rounded text-xs">
                                                            {frame.title || frame.name} ({frame.width}x{frame.height})
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'regions' && (
                            <div className="space-y-4">
                                {uiStructure.regionGroups.map((group) => (
                                    <div key={group.name} className="border border-slate-200 rounded-lg p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-medium text-slate-900">{group.title}</h4>
                                                <p className="text-sm text-slate-500">Block: {group.name} • Canvas: {group.canvas}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <StatusBadge variant="info">{group.suggestedRegionType}</StatusBadge>
                                                <StatusBadge variant="neutral">Tab: {group.suggestedTab}</StatusBadge>
                                            </div>
                                        </div>
                                        <div className="mt-3 text-sm text-slate-600">
                                            <span className="font-medium">{group.itemCount}</span> items
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'theme' && (
                            <div className="space-y-6">
                                <div className="border border-slate-200 rounded-lg p-6">
                                    <h4 className="font-semibold text-slate-900 mb-4">Theme Recommendation</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-slate-500">Theme</p>
                                            <p className="font-medium text-lg text-primary-600">{uiStructure.theme.themeName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Style</p>
                                            <p className="font-medium">{uiStructure.theme.themeStyle}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Page Template</p>
                                            <p className="font-medium">{uiStructure.theme.pageTemplate}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-slate-500">Region Template</p>
                                            <p className="font-medium">{uiStructure.theme.regionTemplate}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-lg p-6">
                                    <h4 className="font-semibold text-slate-900 mb-4">Template Options</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        {Object.entries(uiStructure.theme.templateOptions).map(([key, value]) => (
                                            <div key={key} className="bg-slate-50 rounded p-3">
                                                <p className="text-sm text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                                                <p className="font-medium">{String(value)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-lg p-6">
                                    <h4 className="font-semibold text-slate-900 mb-4">Layout Strategy</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 rounded p-3">
                                            <p className="text-sm text-slate-500">Primary Layout</p>
                                            <p className="font-medium">{uiStructure.layoutStrategy.primaryLayout}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded p-3">
                                            <p className="text-sm text-slate-500">Navigation Style</p>
                                            <p className="font-medium">{uiStructure.layoutStrategy.navigationStyle}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded p-3">
                                            <p className="text-sm text-slate-500">Uses Tabs</p>
                                            <p className="font-medium">{uiStructure.layoutStrategy.usesTabsOrAccordion ? 'Yes' : 'No'}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded p-3">
                                            <p className="text-sm text-slate-500">Has Modal Dialogs</p>
                                            <p className="font-medium">{uiStructure.layoutStrategy.hasModalDialogs ? 'Yes' : 'No'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// =====================================================
// APEX Page Designer Preview Component
// Full visual page preview with Redwood styling
// =====================================================

import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileCode2, ChevronRight, Settings, Eye, Code, Layers,
    Monitor, Tablet, Smartphone, ZoomIn, ZoomOut, Download,
    PanelLeftClose, PanelLeft
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import { generatePageBlueprints } from '../services/uiLayoutEngine';
import { RedwoodField } from '../components/preview/RedwoodField';
import { RedwoodInteractiveGrid } from '../components/preview/RedwoodInteractiveGrid';
import { RedwoodRegion, RedwoodPageHeader, RedwoodButton } from '../components/preview/RedwoodComponents';
import type { PageBlueprint } from '../types/pageBlueprint';

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

export default function PageDesignerPreview() {
    const { fileId } = useParams();
    const { currentAnalysis, files, selectFile } = useAnalysisStore();
    const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [propertiesOpen, setPropertiesOpen] = useState(true);
    const [viewport, setViewport] = useState<ViewportSize>('desktop');
    const [zoom, setZoom] = useState(100);
    const [viewMode, setViewMode] = useState<'preview' | 'structure'>('preview');

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

    useEffect(() => {
        if (blueprints.length > 0 && !selectedPageId) {
            setSelectedPageId(blueprints[0].pageIdSuggestion);
        }
    }, [blueprints, selectedPageId]);

    const selectedPage = useMemo(() => {
        return blueprints.find(b => b.pageIdSuggestion === selectedPageId) || null;
    }, [blueprints, selectedPageId]);

    const viewportWidths: Record<ViewportSize, string> = {
        desktop: '100%',
        tablet: '768px',
        mobile: '375px'
    };

    if (!currentAnalysis) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <FileCode2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-4">No analysis data available</p>
                    <Link to="/upload" className="btn-primary">Upload a file</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden">
            {/* Top Toolbar */}
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title={sidebarOpen ? 'Hide Pages' : 'Show Pages'}
                    >
                        {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
                    </button>
                    <div className="h-6 w-px bg-gray-200" />
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Link to="/" className="hover:text-primary-600">Dashboard</Link>
                        <ChevronRight className="w-4 h-4" />
                        <Link to={`/analysis/${fileId}`} className="hover:text-primary-600">{currentAnalysis.name}</Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-gray-900 font-medium">Page Designer</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all ${viewMode === 'preview' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                                }`}
                        >
                            <Eye className="w-4 h-4" />Preview
                        </button>
                        <button
                            onClick={() => setViewMode('structure')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all ${viewMode === 'structure' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
                                }`}
                        >
                            <Code className="w-4 h-4" />Structure
                        </button>
                    </div>

                    <div className="h-6 w-px bg-gray-200 mx-2" />

                    {/* Viewport Selector */}
                    <div className="flex items-center gap-1">
                        {[
                            { size: 'desktop' as const, icon: Monitor },
                            { size: 'tablet' as const, icon: Tablet },
                            { size: 'mobile' as const, icon: Smartphone },
                        ].map(({ size, icon: Icon }) => (
                            <button
                                key={size}
                                onClick={() => setViewport(size)}
                                className={`p-2 rounded-lg transition-all ${viewport === size ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'
                                    }`}
                                title={size.charAt(0).toUpperCase() + size.slice(1)}
                            >
                                <Icon className="w-4 h-4" />
                            </button>
                        ))}
                    </div>

                    <div className="h-6 w-px bg-gray-200 mx-2" />

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setZoom(z => Math.max(50, z - 10))}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium w-12 text-center">{zoom}%</span>
                        <button
                            onClick={() => setZoom(z => Math.min(150, z + 10))}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <ZoomIn className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="h-6 w-px bg-gray-200 mx-2" />

                    <button
                        onClick={() => setPropertiesOpen(!propertiesOpen)}
                        className={`p-2 rounded-lg transition-all ${propertiesOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
                        title="Properties"
                    >
                        <Settings className="w-4 h-4" />
                    </button>

                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                        <Download className="w-4 h-4" />Export
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Page Navigator */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 280, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="bg-white border-r border-gray-200 flex flex-col overflow-hidden"
                        >
                            <div className="p-4 border-b border-gray-200">
                                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Layers className="w-4 h-4" />
                                    Pages ({blueprints.length})
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                {blueprints.map((page) => (
                                    <button
                                        key={page.pageIdSuggestion}
                                        onClick={() => {
                                            setSelectedPageId(page.pageIdSuggestion);
                                            setSelectedRegion(null);
                                            setSelectedItem(null);
                                        }}
                                        className={`
                                            w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all
                                            ${selectedPageId === page.pageIdSuggestion
                                                ? 'bg-blue-50 border border-blue-200'
                                                : 'hover:bg-gray-50 border border-transparent'
                                            }
                                        `}
                                    >
                                        <div className={`
                                            w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm
                                            ${selectedPageId === page.pageIdSuggestion
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-600'
                                            }
                                        `}>
                                            {page.pageIdSuggestion}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-medium truncate ${selectedPageId === page.pageIdSuggestion ? 'text-blue-900' : 'text-gray-900'
                                                }`}>
                                                {page.pageName.split(' - ')[1] || page.pageName}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {page.sections.length} regions · {page.priority}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Preview Area */}
                <div className="flex-1 overflow-auto p-8 bg-gray-100">
                    <div
                        className="mx-auto transition-all duration-300"
                        style={{
                            width: viewportWidths[viewport],
                            maxWidth: '100%',
                            transform: `scale(${zoom / 100})`,
                            transformOrigin: 'top center'
                        }}
                    >
                        {selectedPage ? (
                            <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
                                {/* Page Header */}
                                <RedwoodPageHeader
                                    title={selectedPage.pageName}
                                    subtitle={selectedPage.purpose}
                                    pageNumber={selectedPage.pageIdSuggestion}
                                    buttons={selectedPage.buttons.filter(b => b.position?.includes('Header')).map(b => ({
                                        label: b.label,
                                        variant: b.action === 'Submit' ? 'primary' as const : 'secondary' as const
                                    }))}
                                />

                                {/* Page Content */}
                                <div className="p-6 space-y-6 bg-gray-50 min-h-[600px]">
                                    {/* Form Sections */}
                                    {selectedPage.sections.map((section, idx) => (
                                        <RedwoodRegion
                                            key={idx}
                                            title={section.title}
                                            regionName={section.regionName}
                                            type="form"
                                            columns={section.layout === 'Grid-2' ? 2 : section.layout === 'Grid-3' ? 3 : 1}
                                            isSelected={selectedRegion === section.regionName}
                                            onClick={() => {
                                                setSelectedRegion(section.regionName);
                                                setSelectedItem(null);
                                            }}
                                        >
                                            {section.items.map((item, itemIdx) => (
                                                <RedwoodField
                                                    key={itemIdx}
                                                    name={item.apexName}
                                                    label={item.label}
                                                    type={mapRedwoodTypeToFieldType(item.redwoodType)}
                                                    required={item.required}
                                                    readOnly={item.readOnly}
                                                    colSpan={item.colSpan}
                                                    isSelected={selectedItem === item.apexName}
                                                    onClick={() => {
                                                        setSelectedRegion(section.regionName);
                                                        setSelectedItem(item.apexName);
                                                    }}
                                                />
                                            ))}
                                        </RedwoodRegion>
                                    ))}

                                    {/* Interactive Grids */}
                                    {selectedPage.childRegions.map((grid, idx) => (
                                        <RedwoodInteractiveGrid
                                            key={idx}
                                            title={grid.title}
                                            regionName={grid.regionName}
                                            sourceTable={grid.sourceBlock}
                                            columns={generateSampleColumns(grid.sourceBlock)}
                                            isSelected={selectedRegion === grid.regionName}
                                            onClick={() => {
                                                setSelectedRegion(grid.regionName);
                                                setSelectedItem(null);
                                            }}
                                        />
                                    ))}
                                </div>

                                {/* Page Footer with Buttons */}
                                {selectedPage.buttons.filter(b => !b.position?.includes('Header')).length > 0 && (
                                    <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                                        {selectedPage.buttons
                                            .filter(b => !b.position?.includes('Header'))
                                            .map((btn, i) => (
                                                <RedwoodButton
                                                    key={i}
                                                    label={btn.label}
                                                    variant={btn.action === 'Submit' ? 'primary' : btn.action === 'Navigate' ? 'tertiary' : 'secondary'}
                                                />
                                            ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                                <Layers className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-500">Select a page from the sidebar to preview</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar - Properties Panel */}
                <AnimatePresence>
                    {propertiesOpen && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 320, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="bg-white border-l border-gray-200 flex flex-col overflow-hidden"
                        >
                            <div className="p-4 border-b border-gray-200">
                                <h2 className="font-semibold text-gray-900">Properties</h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                {selectedItem && selectedPage ? (
                                    <ItemProperties
                                        page={selectedPage}
                                        itemName={selectedItem}
                                    />
                                ) : selectedRegion && selectedPage ? (
                                    <RegionProperties
                                        page={selectedPage}
                                        regionName={selectedRegion}
                                    />
                                ) : selectedPage ? (
                                    <PageProperties page={selectedPage} />
                                ) : (
                                    <div className="text-center text-gray-500 py-8">
                                        <Settings className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">Select an element to view properties</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// Helper Components
function PageProperties({ page }: { page: PageBlueprint }) {
    return (
        <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium mb-1">Page</p>
                <p className="font-semibold text-blue-900">{page.pageName}</p>
            </div>
            <PropertyGroup title="General">
                <PropertyRow label="Page ID" value={String(page.pageIdSuggestion)} />
                <PropertyRow label="Priority" value={page.priority} />
                <PropertyRow label="Template" value={page.template} />
                <PropertyRow label="Theme" value={page.theme} />
            </PropertyGroup>
            <PropertyGroup title="Layout">
                <PropertyRow label="Type" value={page.layout.type} />
                <PropertyRow label="Columns" value={String(page.layout.columns)} />
                <PropertyRow label="Uses Tabs" value={page.layout.usesSubTabs ? 'Yes' : 'No'} />
                <PropertyRow label="Uses Accordion" value={page.layout.usesAccordion ? 'Yes' : 'No'} />
            </PropertyGroup>
            <PropertyGroup title="Source">
                <PropertyRow label="Forms Module" value={page.sourceFormsModule} />
                <PropertyRow label="Canvases" value={page.sourceCanvases.join(', ') || 'Main'} />
                <PropertyRow label="Blocks" value={`${page.sourceBlocks.length} blocks`} />
            </PropertyGroup>
        </div>
    );
}

function RegionProperties({ page, regionName }: { page: PageBlueprint; regionName: string }) {
    const section = page.sections.find(s => s.regionName === regionName);
    const grid = page.childRegions.find(g => g.regionName === regionName);

    if (section) {
        return (
            <div className="space-y-4">
                <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-xs text-emerald-600 font-medium mb-1">Region</p>
                    <p className="font-semibold text-emerald-900">{section.title}</p>
                </div>
                <PropertyGroup title="General">
                    <PropertyRow label="Name" value={section.regionName} />
                    <PropertyRow label="Type" value={section.type} />
                    <PropertyRow label="Display Sequence" value={String(section.displaySequence)} />
                </PropertyGroup>
                <PropertyGroup title="Layout">
                    <PropertyRow label="Grid Layout" value={section.layout || 'Grid-2'} />
                    <PropertyRow label="Column" value={String(section.gridColumn)} />
                    <PropertyRow label="Row" value={String(section.gridRow)} />
                    <PropertyRow label="Col Span" value={String(section.colSpan)} />
                </PropertyGroup>
                <PropertyGroup title="Items">
                    <PropertyRow label="Item Count" value={String(section.items.length)} />
                </PropertyGroup>
            </div>
        );
    }

    if (grid) {
        return (
            <div className="space-y-4">
                <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-purple-600 font-medium mb-1">Interactive Grid</p>
                    <p className="font-semibold text-purple-900">{grid.title}</p>
                </div>
                <PropertyGroup title="General">
                    <PropertyRow label="Name" value={grid.regionName} />
                    <PropertyRow label="Type" value={grid.type} />
                    <PropertyRow label="Source Block" value={grid.sourceBlock} />
                </PropertyGroup>
                <PropertyGroup title="Relationship">
                    <PropertyRow label="Relationship" value={grid.relationship || 'Detail'} />
                    <PropertyRow label="Location" value={grid.location || 'Below'} />
                    <PropertyRow label="Collapsible" value={grid.collapsible ? 'Yes' : 'No'} />
                </PropertyGroup>
            </div>
        );
    }

    return null;
}

function ItemProperties({ page, itemName }: { page: PageBlueprint; itemName: string }) {
    let item = null;
    let sectionTitle = '';

    for (const section of page.sections) {
        const found = section.items.find(i => i.apexName === itemName);
        if (found) {
            item = found;
            sectionTitle = section.title;
            break;
        }
    }

    if (!item) return null;

    return (
        <div className="space-y-4">
            <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-amber-600 font-medium mb-1">Page Item</p>
                <p className="font-semibold text-amber-900">{item.label}</p>
            </div>
            <PropertyGroup title="Identification">
                <PropertyRow label="Name" value={item.apexName} />
                <PropertyRow label="Type" value={item.redwoodType} />
                <PropertyRow label="Forms Name" value={item.formsName} />
            </PropertyGroup>
            <PropertyGroup title="Label">
                <PropertyRow label="Label" value={item.label} />
            </PropertyGroup>
            <PropertyGroup title="Validation">
                <PropertyRow label="Required" value={item.required ? 'Yes' : 'No'} />
                <PropertyRow label="Read Only" value={item.readOnly ? 'Yes' : 'No'} />
            </PropertyGroup>
            <PropertyGroup title="Layout">
                <PropertyRow label="Section" value={sectionTitle} />
                <PropertyRow label="Column" value={String(item.gridColumn)} />
                <PropertyRow label="Row" value={String(item.gridRow)} />
                <PropertyRow label="Col Span" value={String(item.colSpan)} />
            </PropertyGroup>
        </div>
    );
}

function PropertyGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">{children}</div>
        </div>
    );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{label}</span>
            <span className="font-medium text-gray-900 text-right max-w-[160px] truncate" title={value}>{value}</span>
        </div>
    );
}

// Helper functions
function mapRedwoodTypeToFieldType(redwoodType: string): 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'display' | 'popup-lov' {
    const typeMap: Record<string, 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'display' | 'popup-lov'> = {
        'Text Field': 'text',
        'Number Field': 'number',
        'Date Picker': 'date',
        'Select List': 'select',
        'Popup LOV': 'popup-lov',
        'Text Area': 'textarea',
        'Checkbox': 'checkbox',
        'Switch': 'checkbox',
        'Display Only': 'display',
        'Hidden': 'text',
    };
    return typeMap[redwoodType] || 'text';
}

function generateSampleColumns(blockName: string): { name: string; label: string; type: 'text' | 'number' | 'date' | 'lov' }[] {
    // Generate sample columns based on block name patterns
    const commonCols = [
        { name: 'ID', label: 'ID', type: 'number' as const },
        { name: 'DESCRIPTION', label: 'Description', type: 'text' as const },
        { name: 'STATUS', label: 'Status', type: 'lov' as const },
        { name: 'CREATED_DATE', label: 'Created', type: 'date' as const },
        { name: 'UPDATED_DATE', label: 'Updated', type: 'date' as const },
    ];

    if (blockName.includes('ADDRESS') || blockName.includes('MORADA')) {
        return [
            { name: 'STREET', label: 'Street', type: 'text' },
            { name: 'CITY', label: 'City', type: 'text' },
            { name: 'STATE', label: 'State', type: 'lov' },
            { name: 'POSTAL_CODE', label: 'Postal Code', type: 'text' },
            { name: 'COUNTRY', label: 'Country', type: 'lov' },
        ];
    }

    if (blockName.includes('CONTACT') || blockName.includes('PHONE')) {
        return [
            { name: 'TYPE', label: 'Type', type: 'lov' },
            { name: 'PHONE', label: 'Phone', type: 'text' },
            { name: 'EMAIL', label: 'Email', type: 'text' },
            { name: 'PRIMARY', label: 'Primary', type: 'lov' },
        ];
    }

    return commonCols;
}

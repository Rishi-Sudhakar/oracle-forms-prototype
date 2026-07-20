// =====================================================
// Custom PLB Explorer Page
// Upload and analyze .sql/.plb files
// =====================================================

import { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    FileCode2,
    RefreshCw,
    Package,
    FunctionSquare,
    AlertTriangle,
    CheckCircle2,
    Database,
    LayoutGrid,
    ListChecks,
    Code2,
    ArrowRight,
    ArrowLeft,
    Copy,
    Loader2,
    FileText,
    X,
    ChevronLeft,
    ChevronRight,
    GripVertical
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import { parsePLBFile } from '../services/plbParserService';
import type { ExtractedUnit, PLBAnalysis } from '../types/plbTypes';
import CodeBlock from '../components/CodeBlock';

export default function CustomPLBExplorerPage() {
    const { fileId } = useParams();
    const { currentAnalysis, files, selectFile } = useAnalysisStore();

    const [plbAnalysis, setPLBAnalysis] = useState<PLBAnalysis | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<ExtractedUnit | null>(null);
    const [showPackageOverview, setShowPackageOverview] = useState(true); // Show package overview by default
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sidebar resizing state
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const MIN_SIDEBAR_WIDTH = 200;
    const MAX_SIDEBAR_WIDTH = 500;

    // Validation tracking state
    const [validatedUnits, setValidatedUnits] = useState<Set<string>>(new Set());

    // Load file if not selected
    useEffect(() => {
        if (!currentAnalysis && fileId) {
            const file = files.find((f) => f.id === fileId);
            if (file) selectFile(file);
        }
    }, [fileId, currentAnalysis, files, selectFile]);

    // Load persisted PLB analysis from localStorage
    useEffect(() => {
        if (fileId) {
            const saved = localStorage.getItem(`plb_analysis_${fileId}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    setPLBAnalysis(parsed);
                } catch (e) {
                    console.error('Failed to load PLB analysis:', e);
                }
            }
            // Load validated units
            const savedValidated = localStorage.getItem(`plb_validated_${fileId}`);
            if (savedValidated) {
                try {
                    const parsed = JSON.parse(savedValidated);
                    setValidatedUnits(new Set(parsed));
                } catch (e) {
                    console.error('Failed to load validated units:', e);
                }
            }
        }
    }, [fileId]);

    // Toggle validation status for a unit
    const toggleValidation = useCallback((unitName: string) => {
        setValidatedUnits(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitName)) {
                newSet.delete(unitName);
            } else {
                newSet.add(unitName);
            }
            // Persist to localStorage
            if (fileId) {
                localStorage.setItem(`plb_validated_${fileId}`, JSON.stringify([...newSet]));
            }
            return newSet;
        });
    }, [fileId]);

    const handleFileUpload = useCallback(async (file: File) => {
        if (!fileId) return;

        setIsUploading(true);
        setError(null);

        try {
            const content = await file.text();
            const units = parsePLBFile(content, file.name);

            if (units.length === 0) {
                setError('No procedures, functions, or packages found in the file.');
                setIsUploading(false);
                return;
            }

            const analysis: PLBAnalysis = {
                id: `${fileId}_${Date.now()}`,
                formId: fileId,
                fileName: file.name,
                uploadedAt: new Date(),
                units,
                rawContent: content
            };

            setPLBAnalysis(analysis);
            setSelectedUnit(units[0]);

            // Persist to localStorage
            localStorage.setItem(`plb_analysis_${fileId}`, JSON.stringify(analysis));

        } catch (err) {
            console.error('Failed to parse PLB file:', err);
            setError('Failed to parse the file. Please ensure it is a valid PL/SQL file.');
        } finally {
            setIsUploading(false);
        }
    }, [fileId]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.sql') || file.name.endsWith('.plb') || file.name.endsWith('.pls') || file.name.endsWith('.pkb'))) {
            handleFileUpload(file);
        } else {
            setError('Please upload a .sql, .plb, .pls, or .pkb file');
        }
    }, [handleFileUpload]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
    }, [handleFileUpload]);

    const handleReExtract = useCallback(() => {
        if (plbAnalysis && fileId) {
            const units = parsePLBFile(plbAnalysis.rawContent, plbAnalysis.fileName);
            const updatedAnalysis = {
                ...plbAnalysis,
                units,
                uploadedAt: new Date()
            };
            setPLBAnalysis(updatedAnalysis);
            setSelectedUnit(units[0] || null);
            localStorage.setItem(`plb_analysis_${fileId}`, JSON.stringify(updatedAnalysis));
        }
    }, [plbAnalysis, fileId]);

    const handleClearAnalysis = useCallback(() => {
        if (fileId) {
            localStorage.removeItem(`plb_analysis_${fileId}`);
            setPLBAnalysis(null);
            setSelectedUnit(null);
        }
    }, [fileId]);

    // Sidebar resize handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;

            const newWidth = e.clientX;
            if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
                setSidebarWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH]);

    const toggleSidebar = useCallback(() => {
        setSidebarCollapsed(prev => !prev);
    }, []);

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
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-6 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mb-2">
                            <Link to="/" className="hover:text-primary-600">Dashboard</Link>
                            <span>/</span>
                            <Link to={`/analysis/${fileId}`} className="hover:text-primary-600">{currentAnalysis.name}</Link>
                            <span>/</span>
                            <span className="text-slate-900">Custom PLB Explorer</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <FileText className="w-7 h-7 text-indigo-500" />
                            Custom PLB Explorer
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Upload .sql/.plb files • View original vs APEX-safe code • Extract dependencies
                        </p>
                    </div>
                    {plbAnalysis && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleReExtract}
                                className="btn-secondary flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Re-Extract
                            </button>
                            <button
                                onClick={handleClearAnalysis}
                                className="btn-secondary flex items-center gap-2 text-red-600 hover:bg-red-50"
                            >
                                <X className="w-4 h-4" />
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {!plbAnalysis ? (
                    /* Upload Area */
                    <div className="flex-1 p-8">
                        <div
                            className={`h-full border-2 border-dashed rounded-xl flex items-center justify-center transition-colors ${isDragging
                                ? 'border-indigo-400 bg-indigo-50'
                                : 'border-slate-300 hover:border-slate-400'
                                }`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                        >
                            <div className="text-center">
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-16 h-16 mx-auto text-indigo-500 animate-spin mb-4" />
                                        <p className="text-lg font-medium text-slate-700">Parsing file...</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                                        <p className="text-lg font-medium text-slate-700 mb-2">
                                            Drag & drop your PLB/SQL file here
                                        </p>
                                        <p className="text-sm text-slate-500 mb-4">
                                            Supports .sql, .plb, .pls, .pkb files
                                        </p>
                                        <label className="btn-primary cursor-pointer">
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".sql,.plb,.pls,.pkb"
                                                onChange={handleFileSelect}
                                            />
                                            Select File
                                        </label>
                                        {error && (
                                            <p className="mt-4 text-sm text-red-600 flex items-center justify-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                {error}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Analysis View */
                    <div className="flex flex-col h-full">
                        {/* Progress Bar - Fixed Header */}
                        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-slate-700">
                                    Validation Progress
                                </span>
                                <span className="text-sm text-slate-500">
                                    {validatedUnits.size} / {plbAnalysis.units.length} validated
                                </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2.5">
                                <div
                                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${plbAnalysis.units.length > 0 ? (validatedUnits.size / plbAnalysis.units.length) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex flex-1 overflow-hidden">
                            {/* Left Sidebar - Program Units List (Resizable) */}
                            <div
                                ref={sidebarRef}
                                style={{ width: sidebarCollapsed ? 48 : sidebarWidth }}
                                className={`relative border-r border-slate-200 bg-slate-50 overflow-hidden flex-shrink-0 transition-all duration-200 ${isResizing ? 'select-none' : ''}`}
                            >
                                {/* Collapse Toggle Button */}
                                <button
                                    onClick={toggleSidebar}
                                    className="absolute top-2 right-2 z-10 w-6 h-6 bg-white border border-slate-200 rounded flex items-center justify-center hover:bg-slate-100 transition-colors"
                                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                >
                                    {sidebarCollapsed ? (
                                        <ChevronRight className="w-4 h-4 text-slate-500" />
                                    ) : (
                                        <ChevronLeft className="w-4 h-4 text-slate-500" />
                                    )}
                                </button>

                                {/* Sidebar Content */}
                                {!sidebarCollapsed && (
                                    <div className="p-4 overflow-y-auto h-full">
                                        {/* Package Name - Main Header (Clickable) */}
                                        <button
                                            onClick={() => {
                                                setShowPackageOverview(true);
                                                setSelectedUnit(null);
                                            }}
                                            className={`w-full text-left p-3 rounded-lg mb-3 transition-colors ${showPackageOverview && !selectedUnit
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-900'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Package className="w-5 h-5" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm truncate">
                                                        {plbAnalysis.fileName.replace(/\.(sql|plb|pls|pkb)$/i, '')}
                                                    </p>
                                                    <p className={`text-xs ${showPackageOverview && !selectedUnit ? 'text-indigo-200' : 'text-indigo-600'}`}>
                                                        {plbAnalysis.units.length} procedures / functions
                                                    </p>
                                                </div>
                                            </div>
                                        </button>

                                        {/* Program Units Header */}
                                        <div className="flex items-center justify-between mb-2 mt-4">
                                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Program Units</h3>
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                                                {plbAnalysis.units.length}
                                            </span>
                                        </div>

                                        <div className="space-y-2">
                                            {[...plbAnalysis.units]
                                                .sort((a, b) => {
                                                    // Procedures first, then Functions, then Packages
                                                    const typeOrder = { 'Procedure': 0, 'Function': 1, 'Package Spec': 2, 'Package Body': 3 };
                                                    const typeCompare = (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
                                                    if (typeCompare !== 0) return typeCompare;
                                                    // Within same type, sort by fewest outgoing calls first
                                                    const aOutgoing = a.dependencies.calledProcedures?.length || 0;
                                                    const bOutgoing = b.dependencies.calledProcedures?.length || 0;
                                                    return aOutgoing - bOutgoing;
                                                })
                                                .map((unit) => (
                                                    <button
                                                        key={`${unit.type}-${unit.name}`}
                                                        onClick={() => {
                                                            setSelectedUnit(unit);
                                                            setShowPackageOverview(false);
                                                        }}
                                                        className={`w-full text-left p-3 rounded-lg transition-colors ${selectedUnit?.name === unit.name && !showPackageOverview
                                                            ? 'bg-indigo-100 border-indigo-300 border'
                                                            : 'bg-white border border-slate-200 hover:border-indigo-200'
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${unit.type === 'Procedure' ? 'bg-blue-100 text-blue-600' :
                                                                unit.type === 'Function' ? 'bg-emerald-100 text-emerald-600' :
                                                                    'bg-purple-100 text-purple-600'
                                                                }`}>
                                                                {unit.type === 'Procedure' ? (
                                                                    <Code2 className="w-4 h-4" />
                                                                ) : unit.type === 'Function' ? (
                                                                    <FunctionSquare className="w-4 h-4" />
                                                                ) : (
                                                                    <Package className="w-4 h-4" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-mono text-sm font-medium text-slate-900 truncate">
                                                                    {unit.name}
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    {unit.type} • {unit.endLine - unit.startLine + 1} lines
                                                                </p>
                                                                {unit.commentedBuiltins.length > 0 && (
                                                                    <div className="flex items-center gap-1 mt-1">
                                                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                                                        <span className="text-xs text-amber-600">
                                                                            {unit.commentedBuiltins.length} Forms built-ins
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Validation indicator */}
                                                            {validatedUnits.has(unit.name) && (
                                                                <div className="flex-shrink-0">
                                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Collapsed State - show icons only */}
                                {sidebarCollapsed && (
                                    <div className="pt-12 px-2">
                                        {plbAnalysis.units.slice(0, 10).map((unit, i) => (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    setSelectedUnit(unit);
                                                    setSidebarCollapsed(false);
                                                }}
                                                className={`w-8 h-8 mb-1 rounded flex items-center justify-center ${selectedUnit?.name === unit.name
                                                    ? 'bg-indigo-100'
                                                    : 'bg-white hover:bg-slate-100'
                                                    }`}
                                                title={unit.name}
                                            >
                                                <Code2 className="w-4 h-4 text-slate-600" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Resize Handle */}
                                {!sidebarCollapsed && (
                                    <div
                                        onMouseDown={handleMouseDown}
                                        className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-200 transition-colors flex items-center justify-center group"
                                    >
                                        <GripVertical className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 hidden group-hover:block" />
                                    </div>
                                )}
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto">
                                {showPackageOverview ? (
                                    <PackageOverviewView
                                        plbAnalysis={plbAnalysis}
                                        validatedUnits={validatedUnits}
                                    />
                                ) : selectedUnit ? (
                                    <UnitDetailView
                                        unit={selectedUnit}
                                        allUnits={plbAnalysis.units}
                                        isValidated={validatedUnits.has(selectedUnit.name)}
                                        onToggleValidation={() => toggleValidation(selectedUnit.name)}
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-500">
                                        Select a program unit to view
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* End Content Area */}
                    </div>
                )}
            </div>
        </div>
    );
}

// =====================================================
// Package Overview View Component
// =====================================================

interface PackageOverviewViewProps {
    plbAnalysis: PLBAnalysis;
    validatedUnits: Set<string>;
}

function PackageOverviewView({ plbAnalysis, validatedUnits }: PackageOverviewViewProps) {
    // Copy to clipboard helper
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    // Aggregate complexity stats
    const totalLines = plbAnalysis.units.reduce((sum, u) => sum + (u.endLine - u.startLine + 1), 0);
    const procedureCount = plbAnalysis.units.filter(u => u.type === 'Procedure').length;
    const functionCount = plbAnalysis.units.filter(u => u.type === 'Function').length;
    const validatedCount = plbAnalysis.units.filter(u => validatedUnits.has(u.name)).length;

    // Aggregate ALL unique dependencies across all units (deduplicated)
    const allPageItems = [...new Set(plbAnalysis.units.flatMap(u => u.dependencies.pageItems))].sort();
    const allTables = [...new Set(plbAnalysis.units.flatMap(u => u.dependencies.tables))].sort();
    const allProcedures = [...new Set(plbAnalysis.units.flatMap(u => u.dependencies.calledProcedures || []))].sort();

    return (
        <div className="p-6 space-y-6 min-w-0">
            {/* Package Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <Package className="w-6 h-6 text-indigo-600" />
                    {plbAnalysis.fileName.replace(/\.(sql|plb|pls|pkb)$/i, '')}
                </h2>
                <p className="text-sm text-slate-500 mt-1">{plbAnalysis.fileName}</p>
            </div>

            {/* Complexity Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                    <div className="text-3xl font-bold text-blue-700">{totalLines}</div>
                    <div className="text-sm text-blue-600">Total Lines</div>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-4">
                    <div className="text-3xl font-bold text-indigo-700">{procedureCount}</div>
                    <div className="text-sm text-indigo-600">Procedures</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4">
                    <div className="text-3xl font-bold text-emerald-700">{functionCount}</div>
                    <div className="text-sm text-emerald-600">Functions</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                    <div className="text-3xl font-bold text-purple-700">{validatedCount}/{plbAnalysis.units.length}</div>
                    <div className="text-sm text-purple-600">Validated</div>
                </div>
            </div>

            {/* All Dependencies Section */}
            <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">All Dependencies (Deduplicated)</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* All Page Items */}
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4 text-blue-500" />
                            Page Items
                            <span className="ml-auto px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                {allPageItems.length}
                            </span>
                        </h4>
                        {allPageItems.length === 0 ? (
                            <p className="text-sm text-slate-500">No page items</p>
                        ) : (
                            <ul className="space-y-1 max-h-64 overflow-y-auto">
                                {allPageItems.map((item, idx) => (
                                    <li key={item} className="text-sm font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center justify-between group">
                                        <span>
                                            <span className="text-blue-400 mr-2">{idx + 1}.</span>
                                            {item}
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(item)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-blue-100 rounded"
                                            title="Copy"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* All Tables */}
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Database className="w-4 h-4 text-emerald-500" />
                            Tables
                            <span className="ml-auto px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                                {allTables.length}
                            </span>
                        </h4>
                        {allTables.length === 0 ? (
                            <p className="text-sm text-slate-500">No tables</p>
                        ) : (
                            <ul className="space-y-1 max-h-64 overflow-y-auto">
                                {allTables.map((table, idx) => (
                                    <li key={table} className="text-sm font-mono bg-emerald-50 text-emerald-700 px-2 py-1 rounded flex items-center justify-between group">
                                        <span>
                                            <span className="text-emerald-400 mr-2">{idx + 1}.</span>
                                            {table}
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(table)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-emerald-100 rounded"
                                            title="Copy"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* All Procedures Called */}
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <FunctionSquare className="w-4 h-4 text-orange-500" />
                            Procedures Used
                            <span className="ml-auto px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                                {allProcedures.length}
                            </span>
                        </h4>
                        {allProcedures.length === 0 ? (
                            <p className="text-sm text-slate-500">No internal calls</p>
                        ) : (
                            <ul className="space-y-1 max-h-64 overflow-y-auto">
                                {allProcedures.map((proc, idx) => (
                                    <li key={proc} className="text-sm font-mono bg-orange-50 text-orange-700 px-2 py-1 rounded flex items-center justify-between group">
                                        <span>
                                            <span className="text-orange-400 mr-2">{idx + 1}.</span>
                                            {proc}
                                        </span>
                                        <button
                                            onClick={() => copyToClipboard(proc)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-orange-100 rounded"
                                            title="Copy"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* Program Units List */}
            <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">All Program Units</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left p-3 font-medium text-slate-700">Name</th>
                                <th className="text-left p-3 font-medium text-slate-700">Type</th>
                                <th className="text-center p-3 font-medium text-slate-700">Lines</th>
                                <th className="text-center p-3 font-medium text-slate-700">Calls</th>
                                <th className="text-center p-3 font-medium text-slate-700">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {plbAnalysis.units.map(unit => (
                                <tr key={unit.name} className="hover:bg-slate-50">
                                    <td className="p-3 font-mono text-slate-900">{unit.name}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${unit.type === 'Procedure' ? 'bg-blue-100 text-blue-700' :
                                                unit.type === 'Function' ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-purple-100 text-purple-700'
                                            }`}>
                                            {unit.type}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center text-slate-600">{unit.endLine - unit.startLine + 1}</td>
                                    <td className="p-3 text-center text-slate-600">{unit.dependencies.calledProcedures?.length || 0}</td>
                                    <td className="p-3 text-center">
                                        {validatedUnits.has(unit.name) ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                                        ) : (
                                            <span className="text-slate-400">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// =====================================================
// Unit Detail View Component
// =====================================================

interface UnitDetailViewProps {
    unit: ExtractedUnit;
    allUnits: ExtractedUnit[];
    isValidated: boolean;
    onToggleValidation: () => void;
}

function UnitDetailView({ unit, allUnits, isValidated, onToggleValidation }: UnitDetailViewProps) {
    const [activeTab, setActiveTab] = useState<'code' | 'patterns' | 'dependencies' | 'checklist'>('code');

    const patternCount = unit.semanticPatterns?.patterns.length || 0;
    const criticalCount = unit.semanticPatterns?.summary.critical || 0;

    return (
        <div className="p-6 space-y-6 min-w-0">
            {/* Unit Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 font-mono">{unit.name}</h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                            <Code2 className="w-4 h-4" />
                            {unit.type}
                        </span>
                        <span>Lines {unit.startLine} - {unit.endLine}</span>
                        <span>{unit.endLine - unit.startLine + 1} lines of code</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Validate Button */}
                    <button
                        onClick={onToggleValidation}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${isValidated
                            ? 'bg-emerald-100 border border-emerald-300 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        <CheckCircle2 className={`w-4 h-4 ${isValidated ? 'text-emerald-600' : 'text-slate-400'}`} />
                        {isValidated ? 'Validated in APEX' : 'Mark as Validated'}
                    </button>

                    {criticalCount > 0 && (
                        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-medium text-red-800">
                                {criticalCount} Critical Pattern{criticalCount > 1 ? 's' : ''}
                            </p>
                        </div>
                    )}
                    {unit.commentedBuiltins.length > 0 && (
                        <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm font-medium text-amber-800">
                                {unit.commentedBuiltins.length} Forms built-ins
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('code')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'code'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <FileCode2 className="w-4 h-4" />
                        Code View
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('patterns')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'patterns'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Patterns
                        {patternCount > 0 && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${criticalCount > 0
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                                }`}>
                                {patternCount}
                            </span>
                        )}
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('dependencies')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'dependencies'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Dependencies
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                            {unit.dependencies.pageItems.length + unit.dependencies.tables.length}
                        </span>
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('checklist')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'checklist'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <ListChecks className="w-4 h-4" />
                        APEX Checklist
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                            {unit.checklist.length}
                        </span>
                    </div>
                </button>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'code' && (
                    <motion.div
                        key="code"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <CodeComparisonView unit={unit} />
                    </motion.div>
                )}
                {activeTab === 'patterns' && (
                    <motion.div
                        key="patterns"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <PatternsView unit={unit} />
                    </motion.div>
                )}
                {activeTab === 'dependencies' && (
                    <motion.div
                        key="dependencies"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <DependenciesView unit={unit} allUnits={allUnits} />
                    </motion.div>
                )}
                {activeTab === 'checklist' && (
                    <motion.div
                        key="checklist"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <ChecklistView unit={unit} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// =====================================================
// Code Comparison View
// =====================================================

function CodeComparisonView({ unit }: { unit: ExtractedUnit }) {
    return (
        <div className="space-y-4">
            {/* Commented Built-ins Summary */}
            {unit.commentedBuiltins.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Forms Built-ins Commented Out
                    </h4>
                    <div className="space-y-1">
                        {unit.commentedBuiltins.map((cb, i) => (
                            <div key={i} className="text-sm">
                                <code className="font-mono text-amber-700">{cb.builtin}</code>
                                <span className="text-amber-600 ml-2">— {cb.reason}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Side-by-side code view */}
            <div className="grid grid-cols-2 gap-4">
                {/* Original Code */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <FileCode2 className="w-4 h-4 text-slate-500" />
                        <h4 className="font-medium text-slate-700">Original Code</h4>
                    </div>
                    <CodeBlock
                        code={unit.originalCode}
                        language="sql"
                        maxHeight={500}
                    />
                </div>

                {/* APEX-Safe Code */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 bg-indigo-500 rounded flex items-center justify-center">
                            <ArrowRight className="w-3 h-3 text-white" />
                        </div>
                        <h4 className="font-medium text-indigo-700">APEX-Safe Version</h4>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                            Forms built-ins commented
                        </span>
                    </div>
                    <CodeBlock
                        code={unit.apexSafeCode}
                        language="sql"
                        maxHeight={500}
                    />
                </div>
            </div>
        </div>
    );
}

// =====================================================
// Patterns View - Semantic Pattern Detection
// =====================================================

function PatternsView({ unit }: { unit: ExtractedUnit }) {
    const patterns = unit.semanticPatterns?.patterns || [];
    const summary = unit.semanticPatterns?.summary || { critical: 0, important: 0, info: 0 };

    if (patterns.length === 0) {
        return (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
                <h4 className="font-semibold text-emerald-800">No Semantic Patterns Detected</h4>
                <p className="text-sm text-emerald-600 mt-1">
                    This unit does not contain Forms-specific business logic patterns that require attention.
                </p>
            </div>
        );
    }

    const getSeverityStyles = (severity: string) => {
        switch (severity) {
            case 'CRITICAL':
                return 'bg-red-50 border-red-200 text-red-800';
            case 'IMPORTANT':
                return 'bg-amber-50 border-amber-200 text-amber-800';
            case 'INFO':
                return 'bg-blue-50 border-blue-200 text-blue-800';
            default:
                return 'bg-slate-50 border-slate-200 text-slate-800';
        }
    };

    const getSeverityBadgeStyles = (severity: string) => {
        switch (severity) {
            case 'CRITICAL':
                return 'bg-red-100 text-red-700';
            case 'IMPORTANT':
                return 'bg-amber-100 text-amber-700';
            case 'INFO':
                return 'bg-blue-100 text-blue-700';
            default:
                return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="space-y-4 overflow-hidden">
            {/* Summary */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Pattern Summary:</span>
                {summary.critical > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        {summary.critical} Critical
                    </span>
                )}
                {summary.important > 0 && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                        {summary.important} Important
                    </span>
                )}
                {summary.info > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                        {summary.info} Info
                    </span>
                )}
            </div>

            {/* Pattern List */}
            <div className="space-y-3">
                {patterns.map((pattern, i) => (
                    <div
                        key={pattern.id || i}
                        className={`border rounded-lg p-4 ${getSeverityStyles(pattern.severity)}`}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-xs font-bold rounded ${getSeverityBadgeStyles(pattern.severity)}`}>
                                    {pattern.severity}
                                </span>
                                <h4 className="font-semibold">{pattern.label}</h4>
                            </div>
                            <span className="text-xs text-slate-500">
                                Line{pattern.lineNumbers.length > 1 ? 's' : ''}: {pattern.lineNumbers.join(', ')}
                            </span>
                        </div>

                        <p className="text-sm mb-3 break-words">{pattern.description}</p>

                        {pattern.matchedCode.length > 0 && (
                            <div className="mb-3">
                                <p className="text-xs font-medium mb-1 opacity-70">Matched Code:</p>
                                <div className="bg-white bg-opacity-50 rounded p-2 font-mono text-xs overflow-x-auto">
                                    {pattern.matchedCode.map((code, j) => (
                                        <div key={j} className="truncate">{code}</div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="border-t border-current border-opacity-20 pt-2 mt-2">
                            <p className="text-xs font-medium opacity-70 mb-1">APEX Consideration:</p>
                            <p className="text-sm break-words">{pattern.apexConsideration}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// =====================================================
// Dependencies View
// =====================================================

function DependenciesView({ unit, allUnits }: { unit: ExtractedUnit; allUnits: ExtractedUnit[] }) {
    // Copy to clipboard helper
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    // Compute "Called By" - which procedures call this one
    const calledBy = allUnits.filter(u =>
        u.name !== unit.name &&
        u.dependencies.calledProcedures?.includes(unit.name)
    ).map(u => u.name);

    return (
        <div className="space-y-6 overflow-hidden">
            {/* First row: Page Items and Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Page Items - with numbers */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-blue-500" />
                        Page Items
                        <span className="ml-auto px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            {unit.dependencies.pageItems.length}
                        </span>
                    </h4>
                    {unit.dependencies.pageItems.length === 0 ? (
                        <p className="text-sm text-slate-500">No page items detected</p>
                    ) : (
                        <ul className="space-y-1 max-h-48 overflow-y-auto">
                            {unit.dependencies.pageItems.map((item, index) => (
                                <li key={item} className="text-sm font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center justify-between group">
                                    <span>
                                        <span className="text-blue-400 mr-2">{index + 1}.</span>
                                        {item}
                                    </span>
                                    <button
                                        onClick={() => copyToClipboard(item)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-blue-100 rounded"
                                        title="Copy"
                                    >
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Tables */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-500" />
                        Tables
                        <span className="ml-auto px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                            {unit.dependencies.tables.length}
                        </span>
                    </h4>
                    {unit.dependencies.tables.length === 0 ? (
                        <p className="text-sm text-slate-500">No tables detected</p>
                    ) : (
                        <ul className="space-y-1 max-h-48 overflow-y-auto">
                            {unit.dependencies.tables.map((table) => (
                                <li key={table} className="text-sm font-mono bg-emerald-50 text-emerald-700 px-2 py-1 rounded flex items-center justify-between group">
                                    <span>{table}</span>
                                    <button
                                        onClick={() => copyToClipboard(table)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-emerald-100 rounded"
                                        title="Copy"
                                    >
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Second row: Called Procedures and Called By */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Called Procedures / Functions (this unit calls) */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-orange-500" />
                        Calls (Outgoing)
                        <span className="ml-auto px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                            {unit.dependencies.calledProcedures?.length || 0}
                        </span>
                    </h4>
                    {(!unit.dependencies.calledProcedures || unit.dependencies.calledProcedures.length === 0) ? (
                        <p className="text-sm text-slate-500">No internal procedure calls detected</p>
                    ) : (
                        <ul className="space-y-1 max-h-48 overflow-y-auto">
                            {unit.dependencies.calledProcedures.map((proc) => (
                                <li key={proc} className="text-sm font-mono bg-orange-50 text-orange-700 px-2 py-1 rounded flex items-center justify-between group">
                                    <span className="flex items-center gap-2">
                                        <ArrowRight className="w-3 h-3" />
                                        {proc}
                                    </span>
                                    <button
                                        onClick={() => copyToClipboard(proc)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-orange-100 rounded"
                                        title="Copy"
                                    >
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Called By (other procedures that call this one) */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4 text-pink-500" />
                        Called By (Incoming)
                        <span className="ml-auto px-2 py-0.5 bg-pink-100 text-pink-700 text-xs rounded-full">
                            {calledBy.length}
                        </span>
                    </h4>
                    {calledBy.length === 0 ? (
                        <p className="text-sm text-slate-500">Not called by other procedures in this file</p>
                    ) : (
                        <ul className="space-y-1 max-h-48 overflow-y-auto">
                            {calledBy.map((proc) => (
                                <li key={proc} className="text-sm font-mono bg-pink-50 text-pink-700 px-2 py-1 rounded flex items-center justify-between group">
                                    <span className="flex items-center gap-2">
                                        <ArrowLeft className="w-3 h-3" />
                                        {proc}
                                    </span>
                                    <button
                                        onClick={() => copyToClipboard(proc)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-pink-100 rounded"
                                        title="Copy"
                                    >
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Third row: Cursors */}
            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-purple-500" />
                        Cursors
                        <span className="ml-auto px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                            {unit.dependencies.cursors.length}
                        </span>
                    </h4>
                    {unit.dependencies.cursors.length === 0 ? (
                        <p className="text-sm text-slate-500">No cursors detected</p>
                    ) : (
                        <ul className="space-y-2 max-h-48 overflow-y-auto">
                            {unit.dependencies.cursors.map((cursor) => (
                                <li key={cursor.name} className="text-sm bg-purple-50 p-2 rounded flex items-center justify-between group">
                                    <div>
                                        <p className="font-mono font-medium text-purple-700">{cursor.name}</p>
                                        {cursor.usesPageItems && (
                                            <p className="text-xs text-purple-600 mt-1">Uses page items</p>
                                        )}
                                        {cursor.tables.length > 0 && (
                                            <p className="text-xs text-purple-600">Tables: {cursor.tables.join(', ')}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(cursor.name)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-purple-100 rounded"
                                        title="Copy"
                                    >
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

// =====================================================
// Checklist View
// =====================================================

function ChecklistView({ unit }: { unit: ExtractedUnit }) {
    return (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-indigo-500" />
                APEX Verification Checklist
            </h4>

            {unit.checklist.length === 0 ? (
                <p className="text-slate-500">No items to verify</p>
            ) : (
                <div className="space-y-3">
                    {unit.checklist.map((item, i) => (
                        <div
                            key={i}
                            className={`flex items-start gap-3 p-3 rounded-lg ${item.status === 'check'
                                ? 'bg-emerald-50 border border-emerald-200'
                                : 'bg-amber-50 border border-amber-200'
                                }`}
                        >
                            {item.status === 'check' ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div>
                                <p className={`font-medium ${item.status === 'check' ? 'text-emerald-800' : 'text-amber-800'
                                    }`}>
                                    {item.message}
                                </p>
                                <p className="text-xs mt-1 text-slate-500">
                                    {item.type === 'page-item' && 'Verify this page item exists in your APEX application'}
                                    {item.type === 'table' && 'Ensure this table is accessible in your parsing schema'}
                                    {item.type === 'navigation' && 'Review if alternative navigation logic is needed'}
                                    {item.type === 'commit' && 'APEX handles commits differently - review transaction handling'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Complexity Summary */}
            <div className="mt-6 pt-6 border-t border-slate-200">
                <h5 className="font-medium text-slate-700 mb-3">Complexity Metrics</h5>
                <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-slate-900">{unit.complexity.lines}</p>
                        <p className="text-xs text-slate-500">Lines</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-slate-900">{unit.complexity.loops}</p>
                        <p className="text-xs text-slate-500">Loops</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-slate-900">{unit.complexity.cursors}</p>
                        <p className="text-xs text-slate-500">Cursors</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-slate-900">{unit.complexity.conditions}</p>
                        <p className="text-xs text-slate-500">Conditions</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

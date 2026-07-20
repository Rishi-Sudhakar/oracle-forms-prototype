// =====================================================
// APEX Redwood Interactive Grid Component
// Visual preview of APEX Interactive Grid with Redwood styling
// =====================================================

import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Filter, Download, Plus, MoreHorizontal } from 'lucide-react';

interface GridColumn {
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'lov';
    width?: number;
}

interface RedwoodInteractiveGridProps {
    title: string;
    regionName: string;
    columns: GridColumn[];
    sourceTable?: string;
    rowCount?: number;
    isSelected?: boolean;
    isCollapsed?: boolean;
    onClick?: () => void;
    onToggleCollapse?: () => void;
}

export function RedwoodInteractiveGrid({
    title,
    regionName,
    columns,
    sourceTable = 'TABLE_NAME',
    rowCount = 5,
    isSelected = false,
    isCollapsed = false,
    onClick,
    onToggleCollapse
}: RedwoodInteractiveGridProps) {
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    // Generate sample data
    const sampleRows = Array.from({ length: rowCount }, (_, i) => {
        const row: Record<string, string> = {};
        columns.forEach(col => {
            if (col.type === 'number') {
                row[col.name] = String(1000 + i * 100);
            } else if (col.type === 'date') {
                row[col.name] = `${String(i + 1).padStart(2, '0')}-JAN-2024`;
            } else {
                row[col.name] = `${col.label} ${i + 1}`;
            }
        });
        return row;
    });

    const handleSort = (colName: string) => {
        if (sortColumn === colName) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(colName);
            setSortDir('asc');
        }
    };

    return (
        <div
            className={`
                bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm
                transition-all duration-200
                ${isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}
                ${onClick ? 'cursor-pointer' : ''}
            `}
            onClick={onClick}
        >
            {/* Region Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleCollapse?.();
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                            {isCollapsed ? (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                                <ChevronUp className="w-4 h-4 text-gray-500" />
                            )}
                        </button>
                        <div>
                            <h3 className="font-semibold text-gray-900">{title}</h3>
                            <p className="text-xs text-gray-500">
                                Interactive Grid • {regionName} • Source: {sourceTable}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors" title="Search">
                            <Search className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors" title="Filter">
                            <Filter className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors" title="Download">
                            <Download className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors" title="Add Row">
                            <Plus className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors" title="Actions">
                            <MoreHorizontal className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            {!isCollapsed && (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="w-10 px-3 py-2 text-center">
                                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                                </th>
                                {columns.slice(0, 6).map((col) => (
                                    <th
                                        key={col.name}
                                        className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSort(col.name);
                                        }}
                                    >
                                        <div className="flex items-center gap-1">
                                            {col.label}
                                            {sortColumn === col.name && (
                                                sortDir === 'asc'
                                                    ? <ChevronUp className="w-3 h-3" />
                                                    : <ChevronDown className="w-3 h-3" />
                                            )}
                                        </div>
                                    </th>
                                ))}
                                {columns.length > 6 && (
                                    <th className="px-4 py-2 text-xs text-gray-400">
                                        +{columns.length - 6} more
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {sampleRows.map((row, i) => (
                                <tr
                                    key={i}
                                    className={`
                                        border-b border-gray-100 
                                        ${i % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}
                                        hover:bg-blue-50 transition-colors
                                    `}
                                >
                                    <td className="px-3 py-2 text-center">
                                        <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                                    </td>
                                    {columns.slice(0, 6).map((col) => (
                                        <td key={col.name} className="px-4 py-2 text-sm text-gray-700">
                                            {row[col.name]}
                                        </td>
                                    ))}
                                    {columns.length > 6 && (
                                        <td className="px-4 py-2 text-sm text-gray-400">...</td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Footer */}
            {!isCollapsed && (
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-sm text-gray-600">
                    <span>{rowCount} rows</span>
                    <div className="flex items-center gap-2">
                        <span>1-{rowCount} of {rowCount}</span>
                        <button className="p-1 hover:bg-gray-200 rounded" disabled>
                            <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
                        </button>
                        <button className="p-1 hover:bg-gray-200 rounded" disabled>
                            <ChevronUp className="w-4 h-4 rotate-90" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

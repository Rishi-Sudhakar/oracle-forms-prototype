import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Database,
    Zap,
    Hash,
    Type,
    Calendar,
    List,
    ToggleLeft,
    Eye,
    EyeOff,
    Lock,
    Unlock,
    FileCode2,
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import StatusBadge from '../components/StatusBadge';
import CodeBlock from '../components/CodeBlock';

export default function BlockDetail() {
    const { fileId, blockName } = useParams();
    const { currentAnalysis, files, selectFile, selectedBlock, selectBlock } =
        useAnalysisStore();

    useEffect(() => {
        if (!currentAnalysis && fileId) {
            const file = files.find((f) => f.id === fileId);
            if (file) selectFile(file);
        }
    }, [fileId, currentAnalysis, files, selectFile]);

    useEffect(() => {
        if (currentAnalysis && blockName) {
            const block = currentAnalysis.blocks.find((b) => b.name === blockName);
            if (block) selectBlock(block);
        }
    }, [currentAnalysis, blockName, selectBlock]);

    if (!currentAnalysis || !selectedBlock) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <FileCode2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500">Block not found</p>
                    <Link to={`/analysis/${fileId}`} className="btn-primary mt-4">
                        Back to Overview
                    </Link>
                </div>
            </div>
        );
    }

    const getItemIcon = (type: string) => {
        switch (type) {
            case 'Push Button':
                return ToggleLeft;
            case 'List Item':
                return List;
            case 'Date':
                return Calendar;
            case 'Number':
                return Hash;
            default:
                return Type;
        }
    };

    const getApexItemType = (item: any) => {
        return item.apexMapping?.itemType || 'Text Field';
    };

    return (
        <div className="flex-1 overflow-auto">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-6">
                <div className="flex items-center gap-3 text-sm text-slate-500 mb-2">
                    <Link to="/" className="hover:text-primary-600">
                        Dashboard
                    </Link>
                    <span>/</span>
                    <Link
                        to={`/analysis/${fileId}`}
                        className="hover:text-primary-600"
                    >
                        {currentAnalysis.name}
                    </Link>
                    <span>/</span>
                    <span className="text-slate-900">{selectedBlock.name}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            to={`/analysis/${fileId}`}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-slate-900">
                                    {selectedBlock.name}
                                </h1>
                                {selectedBlock.databaseBlock ? (
                                    <StatusBadge variant="success">Database Block</StatusBadge>
                                ) : (
                                    <StatusBadge variant="neutral">Control Block</StatusBadge>
                                )}
                            </div>
                            {selectedBlock.queryDataSourceName && (
                                <p className="mt-1 text-sm text-slate-500 flex items-center gap-2">
                                    <Database className="w-4 h-4" />
                                    Source: {selectedBlock.queryDataSourceName}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="p-8">
                {/* Block Properties */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="card p-5">
                        <h3 className="text-sm font-medium text-slate-500 mb-2">
                            Items Count
                        </h3>
                        <p className="text-3xl font-bold text-slate-900">
                            {selectedBlock.items.length}
                        </p>
                    </div>
                    <div className="card p-5">
                        <h3 className="text-sm font-medium text-slate-500 mb-2">
                            Block Triggers
                        </h3>
                        <p className="text-3xl font-bold text-slate-900">
                            {selectedBlock.triggers.length}
                        </p>
                    </div>
                    <div className="card p-5">
                        <h3 className="text-sm font-medium text-slate-500 mb-2">
                            APEX Region Type
                        </h3>
                        <p className="text-xl font-bold text-primary-600">
                            {selectedBlock.databaseBlock
                                ? selectedBlock.recordsDisplayCount > 1
                                    ? 'Interactive Grid'
                                    : 'Form Region'
                                : 'Static Content'}
                        </p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="card mb-8">
                    <div className="px-6 py-4 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Items ({selectedBlock.items.length})
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            All form items with their properties and APEX mappings
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className="table-header">Item Name</th>
                                    <th className="table-header">Forms Type</th>
                                    <th className="table-header">Data Type</th>
                                    <th className="table-header">Column</th>
                                    <th className="table-header">LOV</th>
                                    <th className="table-header">Properties</th>
                                    <th className="table-header">APEX Item</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedBlock.items.map((item, index) => {
                                    const ItemIcon = getItemIcon(item.itemType);
                                    return (
                                        <motion.tr
                                            key={item.name}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: index * 0.02 }}
                                            className="hover:bg-slate-50"
                                        >
                                            <td className="table-cell">
                                                <div className="flex items-center gap-2">
                                                    <ItemIcon className="w-4 h-4 text-slate-400" />
                                                    <span className="font-medium text-slate-900">
                                                        {item.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="table-cell text-slate-600">
                                                {item.itemType}
                                            </td>
                                            <td className="table-cell">
                                                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                                                    {item.dataType}
                                                </code>
                                            </td>
                                            <td className="table-cell text-slate-600">
                                                {item.columnName || '-'}
                                            </td>
                                            <td className="table-cell">
                                                {item.lovName ? (
                                                    <span className="text-purple-600 text-sm">
                                                        {item.lovName}
                                                    </span>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                            <td className="table-cell">
                                                <div className="flex items-center gap-1">
                                                    {item.required && (
                                                        <span
                                                            className="text-rose-500"
                                                            title="Required"
                                                        >
                                                            <Lock className="w-3.5 h-3.5" />
                                                        </span>
                                                    )}
                                                    {!item.enabled && (
                                                        <span
                                                            className="text-slate-400"
                                                            title="Disabled"
                                                        >
                                                            <Unlock className="w-3.5 h-3.5" />
                                                        </span>
                                                    )}
                                                    {item.visible ? (
                                                        <span className="text-emerald-500" title="Visible">
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400" title="Hidden">
                                                            <EyeOff className="w-3.5 h-3.5" />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="table-cell">
                                                <StatusBadge variant="info">
                                                    {getApexItemType(item)}
                                                </StatusBadge>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Block Triggers */}
                {selectedBlock.triggers.length > 0 && (
                    <div className="card">
                        <div className="px-6 py-4 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Block Triggers ({selectedBlock.triggers.length})
                            </h2>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {selectedBlock.triggers.map((trigger) => (
                                <div key={trigger.name} className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                                                <Zap className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-slate-900">
                                                    {trigger.name}
                                                </h3>
                                                <p className="text-sm text-slate-500">
                                                    Classification: {trigger.classification}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <StatusBadge
                                                variant={
                                                    trigger.apexTarget.supportLevel === 'full'
                                                        ? 'success'
                                                        : trigger.apexTarget.supportLevel === 'partial'
                                                            ? 'warning'
                                                            : 'error'
                                                }
                                            >
                                                {trigger.apexTarget.type}
                                            </StatusBadge>
                                        </div>
                                    </div>

                                    {/* APEX Implementation */}
                                    <div className="bg-slate-50 rounded-lg p-4 mb-4">
                                        <h4 className="text-sm font-medium text-slate-700 mb-2">
                                            APEX Implementation
                                        </h4>
                                        <ul className="space-y-1">
                                            {trigger.apexTarget.instructions.map((inst, i) => (
                                                <li
                                                    key={i}
                                                    className="text-sm text-slate-600 flex items-start gap-2"
                                                >
                                                    <span className="text-primary-500 mt-1">•</span>
                                                    {inst}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Code */}
                                    {trigger.decodedText && (
                                        <CodeBlock
                                            code={trigger.decodedText}
                                            title={`${trigger.name} - Original Code`}
                                            maxHeight={200}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

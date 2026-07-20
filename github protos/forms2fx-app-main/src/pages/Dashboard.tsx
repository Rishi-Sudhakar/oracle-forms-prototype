import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Upload,
    FileCode2,
    Layers,
    Zap,
    ArrowRight,
    Trash2,
    Clock,
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import StatCard from '../components/StatCard';
import { ParsedBadge, ParsingBadge } from '../components/StatusBadge';

export default function Dashboard() {
    const { files, selectFile, removeFile } = useAnalysisStore();

    const totalBlocks = files.reduce(
        (sum, f) => sum + (f.formModule?.blocks.length || 0),
        0
    );
    const totalItems = files.reduce(
        (sum, f) =>
            sum +
            (f.formModule?.blocks.reduce((s, b) => s + b.items.length, 0) || 0),
        0
    );
    const totalTriggers = files.reduce((sum, f) => {
        if (!f.formModule) return sum;
        const formT = f.formModule.triggers.length;
        const blockT = f.formModule.blocks.reduce((s, b) => s + b.triggers.length, 0);
        const itemT = f.formModule.blocks.reduce(
            (s, b) => s + b.items.reduce((is, i) => is + i.triggers.length, 0),
            0
        );
        return sum + formT + blockT + itemT;
    }, 0);

    return (
        <div className="flex-1 overflow-auto">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Analyze Oracle Forms XML files and generate APEX blueprints
                        </p>
                    </div>
                    <Link to="/upload" className="btn-primary">
                        <Upload className="w-4 h-4" />
                        Upload XML
                    </Link>
                </div>
            </header>

            {/* Content */}
            <div className="p-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Uploaded Files"
                        value={files.length}
                        icon={FileCode2}
                        color="indigo"
                        subtitle="Forms XML files"
                    />
                    <StatCard
                        title="Total Blocks"
                        value={totalBlocks}
                        icon={Layers}
                        color="blue"
                        subtitle="Across all forms"
                    />
                    <StatCard
                        title="Total Items"
                        value={totalItems}
                        icon={FileCode2}
                        color="emerald"
                        subtitle="Form fields to migrate"
                    />
                    <StatCard
                        title="Total Triggers"
                        value={totalTriggers}
                        icon={Zap}
                        color="amber"
                        subtitle="Logic to analyze"
                    />
                </div>

                {/* Files List */}
                <div className="card">
                    <div className="px-6 py-4 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Uploaded Files
                        </h2>
                    </div>

                    {files.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                                <FileCode2 className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-2">
                                No files uploaded yet
                            </h3>
                            <p className="text-sm text-slate-500 mb-6">
                                Upload an Oracle Forms XML file to start analyzing
                            </p>
                            <Link to="/upload" className="btn-primary">
                                <Upload className="w-4 h-4" />
                                Upload Your First File
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {files.map((file, index) => (
                                <motion.div
                                    key={file.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="px-6 py-4 flex items-center justify-between hover:bg-slate-50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                            <FileCode2 className="w-5 h-5 text-primary-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-900">
                                                {file.name}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {new Date(file.uploadedAt).toLocaleDateString()}
                                                </span>
                                                <span>•</span>
                                                <span>{(file.size / 1024).toFixed(1)} KB</span>
                                                {file.formModule && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{file.formModule.blocks.length} blocks</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {file.status === 'parsing' ? (
                                            <ParsingBadge />
                                        ) : file.status === 'parsed' ? (
                                            <ParsedBadge />
                                        ) : null}

                                        <Link
                                            to={`/analysis/${file.id}`}
                                            onClick={() => selectFile(file)}
                                            className="btn-secondary text-sm"
                                        >
                                            Open Analysis
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>

                                        <button
                                            onClick={() => removeFile(file.id)}
                                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

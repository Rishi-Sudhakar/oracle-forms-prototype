import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    FileCode2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    X,
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import { parseXmlInBrowser } from '../services/api';
import { saveForm } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import type { UploadedFile } from '../types/forms';

export default function UploadPage() {
    const navigate = useNavigate();
    const { addFile, updateFile, selectFile, removeFile } = useAnalysisStore();
    const { user } = useAuth();
    const [isDragging, setIsDragging] = useState(false);
    const [uploadState, setUploadState] = useState<{
        status: 'idle' | 'uploading' | 'parsing' | 'success' | 'error';
        progress: number;
        message: string;
        fileId?: string;
    }>({
        status: 'idle',
        progress: 0,
        message: '',
    });

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    }, []);

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
        },
        []
    );

    const processFile = async (file: File) => {
        if (!file.name.endsWith('.xml')) {
            setUploadState({
                status: 'error',
                progress: 0,
                message: 'Please select an XML file',
            });
            return;
        }

        const fileId = `file_${Date.now()}`;

        // Create initial file entry
        const uploadedFile: UploadedFile = {
            id: fileId,
            name: file.name,
            size: file.size,
            uploadedAt: new Date(),
            status: 'parsing',
        };
        addFile(uploadedFile);

        setUploadState({
            status: 'uploading',
            progress: 30,
            message: 'Reading file...',
            fileId,
        });

        try {
            // Read file content
            const content = await file.text();

            setUploadState({
                status: 'parsing',
                progress: 60,
                message: 'Parsing XML structure...',
                fileId,
            });

            // Parse XML
            const formModule = await parseXmlInBrowser(content);

            setUploadState({
                status: 'parsing',
                progress: 80,
                message: 'Saving to cloud...',
                fileId,
            });

            // Save to Firestore - use the returned ID as the source of truth
            let savedId = fileId;
            if (user) {
                savedId = await saveForm(user.uid, uploadedFile, formModule);
            } else {
                throw new Error('You must be logged in to upload files');
            }

            setUploadState({
                status: 'parsing',
                progress: 90,
                message: 'Generating APEX mappings...',
                fileId: savedId, // Use the real Firestore ID
            });

            // Update file with parsed data and real ID
            // We need to remove the temp file and add the real one to store? 
            // Or just update the ID? Store updateFile uses ID to find.
            // Better to add the "saved" file entry

            const finalFile: UploadedFile = {
                ...uploadedFile,
                id: savedId, // Update ID
                status: 'parsed',
                formModule,
            };

            // Remove temp, add real - actually addFile will append. 
            // We should just use the proper ID from start if possible? 
            // No, saveForm generates ID. 
            // Let's just fix the store state.
            removeFile(fileId);
            addFile(finalFile);

            setUploadState({
                status: 'success',
                progress: 100,
                message: `Successfully parsed ${formModule.name}`,
                fileId: savedId,
            });

            // Auto-navigate after a brief delay
            setTimeout(() => {
                selectFile(finalFile);
                navigate(`/analysis/${savedId}`);
            }, 1500);
        } catch (error) {
            console.error('Parse error:', error);
            updateFile(fileId, { status: 'error' });
            setUploadState({
                status: 'error',
                progress: 0,
                message: error instanceof Error ? error.message : 'Failed to parse XML file',
                fileId,
            });
        }
    };

    const resetUpload = () => {
        setUploadState({
            status: 'idle',
            progress: 0,
            message: '',
        });
    };

    return (
        <div className="flex-1 overflow-auto">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-6">
                <h1 className="text-2xl font-bold text-slate-900">Upload XML</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Upload an Oracle Forms XML file to analyze and generate APEX migration blueprints
                </p>
            </header>

            {/* Content */}
            <div className="p-8 max-w-3xl mx-auto">
                <AnimatePresence mode="wait">
                    {uploadState.status === 'idle' || uploadState.status === 'error' ? (
                        <motion.div
                            key="upload-zone"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            {/* Error message */}
                            {uploadState.status === 'error' && (
                                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-rose-800">
                                            Upload Failed
                                        </p>
                                        <p className="text-sm text-rose-600 mt-1">
                                            {uploadState.message}
                                        </p>
                                    </div>
                                    <button
                                        onClick={resetUpload}
                                        className="text-rose-500 hover:text-rose-700"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            {/* Drop zone */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${isDragging
                                    ? 'border-primary-500 bg-primary-50'
                                    : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
                                    }`}
                            >
                                <input
                                    type="file"
                                    accept=".xml"
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
                                    <Upload
                                        className={`w-8 h-8 ${isDragging ? 'text-primary-600' : 'text-primary-500'
                                            }`}
                                    />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900 mb-2">
                                    {isDragging
                                        ? 'Drop your file here'
                                        : 'Drag and drop your XML file'}
                                </h3>
                                <p className="text-sm text-slate-500 mb-4">
                                    or click to browse
                                </p>
                                <p className="text-xs text-slate-400">
                                    Supports Oracle Forms XML exports (.xml)
                                </p>
                            </div>

                            {/* Instructions */}
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    {
                                        step: '1',
                                        title: 'Upload XML',
                                        description:
                                            'Export your Oracle Form as XML and upload it here',
                                    },
                                    {
                                        step: '2',
                                        title: 'Analyze',
                                        description:
                                            'We parse blocks, items, triggers, and LOVs automatically',
                                    },
                                    {
                                        step: '3',
                                        title: 'Get Blueprint',
                                        description:
                                            'Receive detailed APEX migration mappings and code',
                                    },
                                ].map((item) => (
                                    <div key={item.step} className="text-center">
                                        <div className="w-8 h-8 mx-auto mb-3 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-bold">
                                            {item.step}
                                        </div>
                                        <h4 className="font-medium text-slate-900 mb-1">
                                            {item.title}
                                        </h4>
                                        <p className="text-xs text-slate-500">{item.description}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="progress"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="card p-8"
                        >
                            <div className="text-center">
                                {uploadState.status === 'success' ? (
                                    <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                                    </div>
                                )}

                                <h3 className="text-lg font-medium text-slate-900 mb-2">
                                    {uploadState.status === 'success'
                                        ? 'Analysis Complete!'
                                        : 'Processing XML...'}
                                </h3>
                                <p className="text-sm text-slate-500 mb-6">
                                    {uploadState.message}
                                </p>

                                {/* Progress bar */}
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <motion.div
                                        className="h-full bg-primary-500 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${uploadState.progress}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                <p className="mt-2 text-sm text-slate-400">
                                    {uploadState.progress}% complete
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Sample file hint */}
                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <FileCode2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-blue-800">
                                Sample File Available
                            </p>
                            <p className="text-sm text-blue-600 mt-1">
                                You can test with any Oracle Forms XML export file. Simply export your form from Oracle Forms Designer and upload it here.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

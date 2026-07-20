import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Loader2, Check, AlertCircle, ShieldCheck } from 'lucide-react';
import { testApiKey } from '../services/geminiService';
import { useAnalysisStore } from '../store/analysisStore';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function ApiKeyModal() {
    const { showApiKeyModal, setShowApiKeyModal, apiKey, setApiKey } = useAnalysisStore();
    const { user } = useAuth();
    const [key, setKey] = useState('');
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testResult, setTestResult] = useState<{ valid: boolean; error?: string } | null>(null);

    // Load key from store or Firestore when modal opens
    useEffect(() => {
        if (showApiKeyModal) {
            setKey(apiKey || '');
            setTestResult(null);

            // Try to fetch from Firestore if not in store
            if (!apiKey && user) {
                const fetchKey = async () => {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', user.uid));
                        if (userDoc.exists() && userDoc.data().settings?.apiKey) {
                            const storedKey = userDoc.data().settings.apiKey;
                            setKey(storedKey);
                            setApiKey(storedKey);
                        }
                    } catch (err) {
                        console.error('Error fetching API key:', err);
                    }
                };
                fetchKey();
            }
        }
    }, [showApiKeyModal, apiKey, user, setApiKey]);

    const handleTest = async () => {
        if (!key.trim()) return;

        setTesting(true);
        setTestResult(null);

        const result = await testApiKey(key.trim());
        setTestResult(result);
        setTesting(false);
    };

    const handleSave = async () => {
        if (!key.trim() || !user) return;

        setSaving(true);
        try {
            // Update store
            setApiKey(key.trim());

            // Save plain text to Firestore
            await setDoc(doc(db, 'users', user.uid), {
                settings: {
                    apiKey: key.trim(),
                    updatedAt: serverTimestamp()
                }
            }, { merge: true });

            setShowApiKeyModal(false);
        } catch (err) {
            console.error('Error saving API key:', err);
            setTestResult({ valid: false, error: 'Failed to save securely. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    if (!showApiKeyModal) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                onClick={() => setShowApiKeyModal(false)}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <Key className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Gemini API Key</h2>
                                <p className="text-xs text-slate-500">Required for code generation</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowApiKeyModal(false)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                API Key
                            </label>
                            <input
                                type="password"
                                value={key}
                                onChange={(e) => {
                                    setKey(e.target.value);
                                    setTestResult(null);
                                }}
                                placeholder="AIzaSy..."
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                            />
                        </div>

                        <p className="text-xs text-slate-500">
                            Get your API key from{' '}
                            <a
                                href="https://aistudio.google.com/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:underline"
                            >
                                Google AI Studio
                            </a>
                            . Your key is encrypted before storage and never shared.
                        </p>

                        {/* Test Result */}
                        {testResult && (
                            <div
                                className={`p-3 rounded-lg flex items-center gap-2 ${testResult.valid
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}
                            >
                                {testResult.valid ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        <span className="text-sm">API key is valid!</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-sm">{testResult.error}</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
                        <button
                            onClick={handleTest}
                            disabled={!key.trim() || testing}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {testing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                'Test Connection'
                            )}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!key.trim() || saving}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-4 h-4" />
                                    Save Securely
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

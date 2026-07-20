import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAnalysisStore } from '../store/analysisStore';
import { getUserForms, getAllGeneratedCode } from '../services/firestoreService';

export function useFormSync() {
    const { user } = useAuth();
    const {
        addFile,
        files,
        currentFile,
        setGeneratedCode,
        setLoading
    } = useAnalysisStore();

    // 1. Sync Files List on Login
    useEffect(() => {
        if (!user) return;

        // Ensure we don't fetch if already have files (unless force refresh needed?)
        // For now, if store is empty, fetch.
        if (files.length === 0) {
            const fetchForms = async () => {
                try {
                    setLoading(true);
                    const forms = await getUserForms(user.uid);

                    // Add forms to store (without heavy JSON data yet if possible, but getUserForms returns all?)
                    // getUserForms returns FormDocument. formDataJson takes space.
                    // We might want to parse it on demand?
                    // UploadedFile interface needs formModule.
                    // If we load list, we parse later?

                    for (const form of forms) {
                        try {
                            // We need to reconstruct UploadedFile object
                            // If formDataJson exists, we parse it
                            const parsedModule = JSON.parse(form.formDataJson);

                            addFile({
                                id: form.id,
                                name: form.fileName,
                                size: 0, // Not stored in schema currently, fixable?
                                uploadedAt: form.uploadedAt,
                                status: 'parsed',
                                formModule: parsedModule
                            });
                        } catch (e) {
                            console.error(`Failed to parse form ${form.id}`, e);
                        }
                    }
                } catch (err) {
                    console.error('Error fetching forms:', err);
                } finally {
                    setLoading(false);
                }
            };
            fetchForms();
        }
    }, [user, files.length, addFile, setLoading]);

    // 2. Sync Generated Code when File Selected
    useEffect(() => {
        if (!currentFile || !currentFile.id) return;

        const fetchCode = async () => {
            try {
                const codeMap = await getAllGeneratedCode(currentFile.id);
                Object.entries(codeMap).forEach(([name, data]) => {
                    setGeneratedCode(name, data.code, data.explanation);
                });
            } catch (err) {
                console.error('Error fetching generated code:', err);
            }
        };

        fetchCode();
    }, [currentFile?.id, setGeneratedCode]);
}

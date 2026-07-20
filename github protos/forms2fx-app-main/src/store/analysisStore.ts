import { create } from 'zustand';
import type { FormModule, UploadedFile, Block, Trigger, Canvas } from '../types/forms';
import type { FormKnowledgeContext, GenerationProgress } from '../types/generation';

interface AnalysisStore {
    // State
    files: UploadedFile[];
    currentFile: UploadedFile | null;
    currentAnalysis: FormModule | null;
    selectedBlock: Block | null;
    selectedTrigger: Trigger | null;
    selectedCanvas: Canvas | null;
    sidebarCollapsed: boolean;
    isLoading: boolean;
    error: string | null;

    // Generation state
    knowledgeContext: FormKnowledgeContext | null;
    generationProgress: GenerationProgress | null;
    generatedCode: Record<string, string>; // Map of trigger/unit name -> generated code
    generatedExplanations: Record<string, string>; // Map of trigger/unit name -> explanation
    showApiKeyModal: boolean;
    apiKey: string | null;

    // File actions
    addFile: (file: UploadedFile) => void;
    updateFile: (id: string, updates: Partial<UploadedFile>) => void;
    removeFile: (id: string) => void;
    selectFile: (file: UploadedFile | null) => void;

    // Analysis actions
    setAnalysis: (analysis: FormModule | null) => void;
    selectBlock: (block: Block | null) => void;
    selectTrigger: (trigger: Trigger | null) => void;
    selectCanvas: (canvas: Canvas | null) => void;

    // Generation actions
    setKnowledgeContext: (context: FormKnowledgeContext | null) => void;
    setGenerationProgress: (progress: GenerationProgress | null) => void;
    setGeneratedCode: (name: string, code: string, explanation?: string) => void;
    clearGeneratedCode: (name: string) => void;
    setShowApiKeyModal: (show: boolean) => void;
    setApiKey: (key: string | null) => void;

    // UI actions
    toggleSidebar: () => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;

    // Reset
    reset: () => void;
}

const initialState = {
    files: [],
    currentFile: null,
    currentAnalysis: null,
    selectedBlock: null,
    selectedTrigger: null,
    selectedCanvas: null,
    sidebarCollapsed: false,
    isLoading: false,
    error: null,
    knowledgeContext: null,
    generationProgress: null,
    generatedCode: {},
    generatedExplanations: {},
    showApiKeyModal: false,
    apiKey: null,
};

export const useAnalysisStore = create<AnalysisStore>((set) => ({
    ...initialState,

    addFile: (file) =>
        set((state) => ({
            files: [...state.files, file],
        })),

    updateFile: (id, updates) =>
        set((state) => ({
            files: state.files.map((f) =>
                f.id === id ? { ...f, ...updates } : f
            ),
            currentFile:
                state.currentFile?.id === id
                    ? { ...state.currentFile, ...updates }
                    : state.currentFile,
        })),

    removeFile: (id) =>
        set((state) => ({
            files: state.files.filter((f) => f.id !== id),
            currentFile: state.currentFile?.id === id ? null : state.currentFile,
            currentAnalysis: state.currentFile?.id === id ? null : state.currentAnalysis,
        })),

    selectFile: (file) =>
        set({
            currentFile: file,
            currentAnalysis: file?.formModule || null,
            selectedBlock: null,
            selectedTrigger: null,
            selectedCanvas: null,
            knowledgeContext: null,
            generatedCode: {},
            generatedExplanations: {},
            // Keep apiKey when switching files
        }),

    setAnalysis: (analysis) =>
        set({
            currentAnalysis: analysis,
            selectedBlock: null,
            selectedTrigger: null,
            selectedCanvas: null,
        }),

    selectBlock: (block) =>
        set({
            selectedBlock: block,
            selectedTrigger: null,
        }),

    selectTrigger: (trigger) =>
        set({ selectedTrigger: trigger }),

    selectCanvas: (canvas) =>
        set({ selectedCanvas: canvas }),

    // Generation actions
    setKnowledgeContext: (context) =>
        set({ knowledgeContext: context }),

    setGenerationProgress: (progress) =>
        set({ generationProgress: progress }),

    setGeneratedCode: (name, code, explanation) =>
        set((state) => ({
            generatedCode: { ...state.generatedCode, [name]: code },
            generatedExplanations: explanation
                ? { ...state.generatedExplanations, [name]: explanation }
                : state.generatedExplanations
        })),

    clearGeneratedCode: (name) =>
        set((state) => {
            const newCode = { ...state.generatedCode };
            const newExplanations = { ...state.generatedExplanations };
            delete newCode[name];
            delete newExplanations[name];
            return { generatedCode: newCode, generatedExplanations: newExplanations };
        }),

    setShowApiKeyModal: (show) =>
        set({ showApiKeyModal: show }),

    setApiKey: (key) =>
        set({ apiKey: key }),

    toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

    setLoading: (loading) =>
        set({ isLoading: loading }),

    setError: (error) =>
        set({ error }),

    reset: () =>
        set(initialState),
}));


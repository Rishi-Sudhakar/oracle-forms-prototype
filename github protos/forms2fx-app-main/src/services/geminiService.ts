// =====================================================

// =====================================================
// Gemini API Service
// =====================================================

import { useAnalysisStore } from '../store/analysisStore';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Check if API key exists (checked via Zustand store)
 */
export function hasApiKey(): boolean {
    return !!useAnalysisStore.getState().apiKey;
}

/**
 * Get the API key from the store
 */
export function getApiKey(): string | null {
    return useAnalysisStore.getState().apiKey;
}

/**
 * Estimate tokens for a text (rough: ~4 chars = 1 token)
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Test API key validity
 */
export async function testApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Hello' }] }],
                generationConfig: { maxOutputTokens: 10 }
            })
        });

        if (response.ok) {
            return { valid: true };
        }

        const error = await response.json();
        return { valid: false, error: error.error?.message || 'Invalid API key' };
    } catch (err) {
        return { valid: false, error: 'Network error - check your connection' };
    }
}

/**
 * Generate APEX code using Gemini API
 */
export async function generateApexCode(
    prompt: string,
    systemPrompt: string,
    apiKey: string, // Require API key to be passed in
    onProgress?: (message: string) => void
): Promise<{ success: boolean; code: string; error?: string; tokensUsed?: number }> {
    if (!apiKey) {
        return { success: false, code: '', error: 'No API key provided' };
    }

    onProgress?.('Connecting to Gemini API...');

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: systemPrompt + '\n\n' + prompt }]
                    }
                ],
                generationConfig: {
                    temperature: 0.2, // Low temperature for deterministic output
                    topP: 0.8,
                    maxOutputTokens: 8192,
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData.error?.message || `API error: ${response.status}`;

            if (response.status === 429) {
                return { success: false, code: '', error: 'Rate limit exceeded. Please wait a moment and try again.' };
            }
            if (response.status === 400 && errorMessage.includes('token')) {
                return { success: false, code: '', error: 'Code too large for single request. Chunking required.' };
            }

            return { success: false, code: '', error: errorMessage };
        }

        onProgress?.('Processing response...');

        const data = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const tokensUsed = data.usageMetadata?.totalTokenCount || 0;

        // Extract code from markdown code blocks if present
        const codeMatch = generatedText.match(/```(?:sql|plsql|apex)?\n?([\s\S]*?)```/);
        const cleanCode = codeMatch ? codeMatch[1].trim() : generatedText.trim();

        return {
            success: true,
            code: cleanCode,
            tokensUsed
        };
    } catch (err) {
        console.error('Gemini API error:', err);
        return {
            success: false,
            code: '',
            error: err instanceof Error ? err.message : 'Unknown error occurred'
        };
    }
}

/**
 * Generate with retry logic
 */
export async function generateWithRetry(
    prompt: string,
    systemPrompt: string,
    apiKey: string,
    maxRetries: number = 3,
    onProgress?: (message: string) => void
): Promise<{ success: boolean; code: string; error?: string }> {
    let lastError = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        onProgress?.(`Attempt ${attempt}/${maxRetries}...`);

        const result = await generateApexCode(prompt, systemPrompt, apiKey, onProgress);

        if (result.success) {
            return result;
        }

        lastError = result.error || 'Unknown error';

        // Don't retry for certain errors
        if (lastError.includes('API key') || lastError.includes('token')) {
            return result;
        }

        // Exponential backoff
        if (attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 1000;
            onProgress?.(`Rate limited. Waiting ${waitTime / 1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    return { success: false, code: '', error: `Failed after ${maxRetries} attempts: ${lastError}` };
}

// =====================================================
// Crypto Service for API Key Encryption
// Uses AES-GCM with Web Crypto API
// =====================================================

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;

/**
 * Generate a random salt
 */
function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate a random IV
 */
function generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Derive encryption key from user ID and salt
 */
async function deriveKey(userId: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(userId),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt.buffer as ArrayBuffer,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt an API key
 * Returns base64-encoded string containing: salt + iv + ciphertext
 */
export async function encryptApiKey(apiKey: string, userId: string): Promise<string> {
    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKey(userId, salt);

    const encoder = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
        key,
        encoder.encode(apiKey)
    );

    // Combine salt + iv + ciphertext
    const combined = new Uint8Array(
        salt.length + iv.length + new Uint8Array(ciphertext).length
    );
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt an API key
 */
export async function decryptApiKey(encryptedData: string, userId: string): Promise<string> {
    const combined = new Uint8Array(
        atob(encryptedData).split('').map(c => c.charCodeAt(0))
    );

    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

    const key = await deriveKey(userId, salt);

    const decrypted = await crypto.subtle.decrypt(
        { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
        key,
        ciphertext.buffer as ArrayBuffer
    );

    return new TextDecoder().decode(decrypted);
}

/**
 * Test if encryption/decryption works
 */
export async function testEncryption(): Promise<boolean> {
    try {
        const testKey = 'test-api-key-12345';
        const testUserId = 'test-user-id';

        const encrypted = await encryptApiKey(testKey, testUserId);
        const decrypted = await decryptApiKey(encrypted, testUserId);

        return decrypted === testKey;
    } catch {
        return false;
    }
}

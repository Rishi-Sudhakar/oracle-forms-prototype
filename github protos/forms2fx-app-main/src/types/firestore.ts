// Firestore document types for Forms2APEX

export interface UserDocument {
    email: string;
    createdAt: Date;
    settings: {
        encryptedApiKey?: string;
        apiKeySalt?: string;
    };
}

export interface FormDocument {
    userId: string;
    formName: string;
    fileName: string;
    uploadedAt: Date;
    updatedAt: Date;
    metadata: {
        blockCount: number;
        triggerCount: number;
        programUnitCount: number;
        canvasCount: number;
    };
    // Full parsed form data stored as JSON string (compressed)
    formDataJson: string;
}

export interface UnitDocument {
    formId: string;
    type: 'trigger' | 'program-unit';
    name: string;
    scope: string; // 'Form', 'Block: X', 'Item: X.Y'
    originalCode: string;
    classification?: string;
    complexity?: number;
    createdAt: Date;
}

export interface GeneratedDocument {
    unitId: string;
    formId: string;
    apexCode: string;
    explanation?: string;
    modelVersion: string;
    generatedAt: Date;
    updatedAt: Date;
}

import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { FormModule, UploadedFile } from '../types/forms';
import type { FormDocument, GeneratedDocument } from '../types/firestore';

// =====================================================
// Form Storage Service
// =====================================================

/**
 * Save a parsed form to Firestore
 */
export async function saveForm(
    userId: string,
    file: UploadedFile,
    formModule: FormModule
): Promise<string> {
    const formId = `${userId}_${Date.now()}`;

    const formDoc: FormDocument = {
        userId,
        formName: formModule.name,
        fileName: file.name,
        uploadedAt: new Date(),
        updatedAt: new Date(),
        metadata: {
            blockCount: formModule.blocks.length,
            triggerCount: formModule.triggers.length +
                formModule.blocks.reduce((acc, b) => acc + b.triggers.length +
                    b.items.reduce((acc2, i) => acc2 + i.triggers.length, 0), 0),
            programUnitCount: formModule.programUnitsEnriched?.length || formModule.programUnits.length,
            canvasCount: formModule.canvases.length
        },
        formDataJson: JSON.stringify(formModule)
    };

    await setDoc(doc(db, 'forms', formId), {
        ...formDoc,
        uploadedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    // Save units (triggers and program units) for faster querying
    await saveFormUnits(formId, formModule);

    return formId;
}

/**
 * Save form units (triggers and program units)
 */
async function saveFormUnits(formId: string, formModule: FormModule) {
    // Save form-level triggers
    for (const trigger of formModule.triggers) {
        if (trigger.decodedText) {
            const unitId = `${formId}_trigger_form_${trigger.name}`;
            await setDoc(doc(db, 'forms', formId, 'units', unitId), {
                formId,
                type: 'trigger',
                name: trigger.name,
                scope: 'Form',
                originalCode: trigger.decodedText,
                classification: trigger.classification,
                createdAt: serverTimestamp()
            });
        }
    }

    // Save block and item triggers
    for (const block of formModule.blocks) {
        for (const trigger of block.triggers) {
            if (trigger.decodedText) {
                const unitId = `${formId}_trigger_block_${block.name}_${trigger.name}`;
                await setDoc(doc(db, 'forms', formId, 'units', unitId), {
                    formId,
                    type: 'trigger',
                    name: trigger.name,
                    scope: `Block: ${block.name}`,
                    originalCode: trigger.decodedText,
                    classification: trigger.classification,
                    createdAt: serverTimestamp()
                });
            }
        }

        for (const item of block.items) {
            for (const trigger of item.triggers) {
                if (trigger.decodedText) {
                    const unitId = `${formId}_trigger_item_${block.name}_${item.name}_${trigger.name}`;
                    await setDoc(doc(db, 'forms', formId, 'units', unitId), {
                        formId,
                        type: 'trigger',
                        name: trigger.name,
                        scope: `Item: ${block.name}.${item.name}`,
                        originalCode: trigger.decodedText,
                        classification: trigger.classification,
                        createdAt: serverTimestamp()
                    });
                }
            }
        }
    }

    // Save program units
    const programUnits = formModule.programUnitsEnriched || [];
    for (const unit of programUnits) {
        if (unit.decodedText) {
            const unitId = `${formId}_unit_${unit.name}`;
            await setDoc(doc(db, 'forms', formId, 'units', unitId), {
                formId,
                type: 'program-unit',
                name: unit.name,
                scope: unit.programUnitType,
                originalCode: unit.decodedText,
                classification: unit.classification,
                complexity: unit.complexity,
                createdAt: serverTimestamp()
            });
        }
    }
}

/**
 * Get all forms for a user
 */
export async function getUserForms(userId: string): Promise<(FormDocument & { id: string })[]> {
    const q = query(
        collection(db, 'forms'),
        where('userId', '==', userId),
        orderBy('uploadedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        uploadedAt: (doc.data().uploadedAt as Timestamp)?.toDate() || new Date(),
        updatedAt: (doc.data().updatedAt as Timestamp)?.toDate() || new Date()
    })) as (FormDocument & { id: string })[];
}

/**
 * Get a specific form
 */
export async function getForm(formId: string): Promise<(FormDocument & { id: string }) | null> {
    const docRef = doc(db, 'forms', formId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return {
        id: docSnap.id,
        ...docSnap.data(),
        uploadedAt: (docSnap.data().uploadedAt as Timestamp)?.toDate() || new Date(),
        updatedAt: (docSnap.data().updatedAt as Timestamp)?.toDate() || new Date()
    } as FormDocument & { id: string };
}

/**
 * Delete a form and all its units
 */
export async function deleteForm(formId: string): Promise<void> {
    // Delete all units
    const unitsSnapshot = await getDocs(collection(db, 'forms', formId, 'units'));
    for (const unitDoc of unitsSnapshot.docs) {
        // Delete generated code for each unit
        const generatedSnapshot = await getDocs(
            collection(db, 'forms', formId, 'units', unitDoc.id, 'generated')
        );
        for (const genDoc of generatedSnapshot.docs) {
            await deleteDoc(genDoc.ref);
        }
        await deleteDoc(unitDoc.ref);
    }

    // Delete the form
    await deleteDoc(doc(db, 'forms', formId));
}

// =====================================================
// Generated Code Storage
// =====================================================

/**
 * Get generated code for a unit
 */
export async function getGeneratedCode(
    formId: string,
    unitKey: string
): Promise<GeneratedDocument | null> {
    const unitId = sanitizeUnitKey(unitKey);
    const generatedRef = doc(db, 'forms', formId, 'units', unitId, 'generated', 'latest');
    const docSnap = await getDoc(generatedRef);

    if (!docSnap.exists()) return null;

    return {
        ...docSnap.data(),
        generatedAt: (docSnap.data().generatedAt as Timestamp)?.toDate() || new Date(),
        updatedAt: (docSnap.data().updatedAt as Timestamp)?.toDate() || new Date()
    } as GeneratedDocument;
}

/**
 * Save generated code for a unit
 * Creates both the unit metadata doc and the generated code doc
 */
export async function saveGeneratedCode(
    formId: string,
    unitKey: string,
    apexCode: string,
    explanation?: string
): Promise<void> {
    const unitId = sanitizeUnitKey(unitKey);

    // Parse scope and name from the key (format: "scope-name" e.g., "unit-PROCESS_RECORD" or "Form-PRE-FORM")
    const firstDash = unitKey.indexOf('-');
    const scope = firstDash > 0 ? unitKey.substring(0, firstDash) : 'unknown';
    const name = firstDash > 0 ? unitKey.substring(firstDash + 1) : unitKey;

    // First, create/update the parent unit document with scope and name
    const unitRef = doc(db, 'forms', formId, 'units', unitId);
    await setDoc(unitRef, {
        unitId,
        formId,
        scope,
        name,
        updatedAt: serverTimestamp()
    }, { merge: true });

    // Then save the generated code
    const generatedRef = doc(db, 'forms', formId, 'units', unitId, 'generated', 'latest');
    await setDoc(generatedRef, {
        unitId,
        formId,
        apexCode,
        explanation,
        modelVersion: 'gemini-2.0-flash',
        generatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    // Update parent form's updatedAt
    await setDoc(doc(db, 'forms', formId), {
        updatedAt: serverTimestamp()
    }, { merge: true });
}

/**
 * Get all generated code for a form (for loading on page load)
 * Optimized: Uses parallel fetches instead of sequential for speed
 */
export async function getAllGeneratedCode(formId: string): Promise<Record<string, { code: string; explanation?: string }>> {
    const result: Record<string, { code: string; explanation?: string }> = {};

    const unitsSnapshot = await getDocs(collection(db, 'forms', formId, 'units'));

    // Parallel fetch all generated code docs
    const fetchPromises = unitsSnapshot.docs.map(async (unitDoc) => {
        const generatedRef = doc(db, 'forms', formId, 'units', unitDoc.id, 'generated', 'latest');
        const genSnap = await getDoc(generatedRef);

        if (genSnap.exists()) {
            const data = genSnap.data();
            const unitData = unitDoc.data();
            if (unitData.name && unitData.scope) {
                // Construct key to match TriggerInspector format: `${source}-${name}`
                const key = `${unitData.scope}-${unitData.name}`;
                return { key, code: data.apexCode, explanation: data.explanation };
            }
        }
        return null;
    });

    const results = await Promise.all(fetchPromises);

    for (const item of results) {
        if (item) {
            result[item.key] = { code: item.code, explanation: item.explanation };
        }
    }

    return result;
}

/**
 * Sanitize unit key for Firestore document ID
 */
function sanitizeUnitKey(key: string): string {
    return key.replace(/[\/\.\#\$\[\]]/g, '_');
}

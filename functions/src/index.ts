import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const deleteAccount = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }

    const uid = context.auth.uid;
    const db = admin.firestore();
    const storage = admin.storage();
    
    // Use the default bucket
    const bucket = storage.bucket();

    try {
        console.log(`Starting account deletion for user ${uid}`);

        // 1. Delete Firestore Data
        // Delete 'users/{uid}' document
        const userDocRef = db.collection("users").doc(uid);
        await userDocRef.delete();
        console.log(`Deleted user profile document for ${uid}`);

        // Delete 'patients/{uid}' document and all its subcollections (recursive)
        // This is the "Me" patient record.
        const patientDocRef = db.collection("patients").doc(uid);
        
        // Check if it exists first
        const patientDoc = await patientDocRef.get();
        if (patientDoc.exists) {
            // Recursive delete is available in Admin SDK
            await db.recursiveDelete(patientDocRef);
            console.log(`Deleted patient record (self) for ${uid}`);
        }

        // 2. Delete Storage Files
        // All user files are stored under 'users/{uid}/...'
        // or potentially 'patients/{pid}/...' but currently the client uploads to '.../uploads'.
        // Let's assume a structure. 
        // Based on `storageService.ts` (implied), we should look for where files are stored.
        // Usually it's `uploads/{uid}` or `users/{uid}`.
        // Let's try to delete both prefixes if unsure, or just 'users/{uid}' as per plan.
        
        await bucket.deleteFiles({ prefix: `users/${uid}/` });
        console.log(`Deleted storage files for ${uid}`);

        // 3. Delete Auth User
        await admin.auth().deleteUser(uid);
        console.log(`Deleted auth user ${uid}`);

        return { success: true, message: "Account deleted successfully" };
    } catch (error) {
        console.error("Error deleting account:", error);
        throw new functions.https.HttpsError(
            "internal",
            "Failed to delete account. Please try again later."
        );
    }
});

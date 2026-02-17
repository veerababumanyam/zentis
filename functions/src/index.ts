import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

export const deleteAccount = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }

    const uid = request.auth.uid;
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
        try {
            await bucket.deleteFiles({ prefix: `users/${uid}/` });
            console.log(`Deleted storage files for ${uid}`);
        } catch (e) {
            console.warn(`Error deleting storage files for ${uid} (might be empty):`, e);
        }

        // 3. Delete Auth User
        await admin.auth().deleteUser(uid);
        console.log(`Deleted auth user ${uid}`);

        return { success: true, message: "Account deleted successfully" };
    } catch (error) {
        console.error("Error deleting account:", error);
        throw new HttpsError(
            "internal",
            "Failed to delete account. Please try again later."
        );
    }
});

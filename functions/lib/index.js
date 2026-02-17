"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
admin.initializeApp();
exports.deleteAccount = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "The function must be called while authenticated.");
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
        }
        catch (e) {
            console.warn(`Error deleting storage files for ${uid} (might be empty):`, e);
        }
        // 3. Delete Auth User
        await admin.auth().deleteUser(uid);
        console.log(`Deleted auth user ${uid}`);
        return { success: true, message: "Account deleted successfully" };
    }
    catch (error) {
        console.error("Error deleting account:", error);
        throw new https_1.HttpsError("internal", "Failed to delete account. Please try again later.");
    }
});
//# sourceMappingURL=index.js.map
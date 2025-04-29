const admin = require("firebase-admin");
const serviceAccount = require("../firebase-key.json"); // Unduh dari Firebase Console

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

module.exports = { db };

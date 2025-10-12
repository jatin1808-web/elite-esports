// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCyQhuhHfY_eDTxaRslWmB-1nkATvf7qfg",
    authDomain: "elite-esports-846904616419.firebaseapp.com",
    projectId: "elite-esports-846904616419",
    storageBucket: "elite-esports-846904616419.appspot.com",
    messagingSenderId: "846904616419",
    appId: "1:846904616419:web:71f29ce3191d18914cacd6"
};

// Initialize Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Firebase instances
const auth = firebase.auth();
const db = firebase.firestore();

// Export for use in other files
window.auth = auth;
window.db = db;
// 🔥 Firebase Configuration - UPDATED WITH YOUR CREDENTIALS
const firebaseConfig = {
    apiKey: "AIzaSyCyQhuhHfY_eDTxaRslWmB-1nkATvf7qfg",
    authDomain: "elite-esports-846904616419.firebaseapp.com",
    projectId: "elite-esports-846904616419",
    storageBucket: "elite-esports-846904616419.appspot.com",
    messagingSenderId: "846904616419",
    appId: "1:846904616419:web:71f29ce3191d18914cacd6"
};

// Initialize Firebase
let auth, db;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    db = firebase.firestore();
    console.log("Firebase initialized successfully!");
} catch (error) {
    console.error("Firebase initialization error:", error);
    alert("Firebase configuration error: " + error.message);
}
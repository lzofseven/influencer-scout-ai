import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDgBKNXlW5nA-clBjUBzlnDFSV-SqLCXaM",
    authDomain: "influencer-pro-2025-lohan.firebaseapp.com",
    projectId: "influencer-pro-2025-lohan",
    storageBucket: "influencer-pro-2025-lohan.firebasestorage.app",
    messagingSenderId: "544323840063",
    appId: "1:544323840063:web:352a316c09636b0e38308a"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDdO0OUFx2QIe74IdfN1CTXwWxQqoIzuHs",
  authDomain: "song-request-ddc2e.firebaseapp.com",
  projectId: "song-request-ddc2e",
  storageBucket: "song-request-ddc2e.firebasestorage.app",
  messagingSenderId: "498812073299",
  appId: "1:498812073299:web:b5ced546f838983cb21da6",
  measurementId: "G-8X16XBXZ1C",
};

// Only initialize once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export services
export const db = getFirestore(app);
export const functions = getFunctions(app);
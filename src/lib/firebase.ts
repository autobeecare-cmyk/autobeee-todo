// src/lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCZMfIl46ea7C_1U_8XEmjpeImg4-so9tk",
  authDomain: "sourabhzssc.firebaseapp.com",
  projectId: "sourabhzssc",
  storageBucket: "sourabhzssc.firebasestorage.app",
  messagingSenderId: "31742915782",
  appId: "1:31742915782:web:29fa2b94b6d146aea6d3c7"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

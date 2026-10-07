import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAMkpj9tFps526mL6hO-ciePWrTdx_NK9Q",
  authDomain: "youcontrol-1d60a.firebaseapp.com",
  projectId: "youcontrol-1d60a",
  storageBucket: "youcontrol-1d60a.firebasestorage.app",
  messagingSenderId: "812100760013",
  appId: "1:812100760013:web:7574906aa285555faf5484"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Helper para obtener colecciones del usuario logueado
export const getUserCollection = (subColeccion) => {
    const user = auth.currentUser;
    if (!user) return null;
    return collection(db, "usuarios", user.uid, subColeccion);
};
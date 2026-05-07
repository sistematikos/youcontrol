import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

// Función para obtener la ruta del usuario actual
export const getUserRef = (folder) => {
    const user = auth.currentUser;
    return user ? collection(db, "usuarios", user.uid, folder) : null;
};
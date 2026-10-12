import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración por defecto (Base de datos principal)
const firebaseConfig = {
    apiKey: "AIzaSyAMkpj9tFps526mL6hO-ciePWrTdx_NK9Q", 
    authDomain: "youcontrol-1d60a.firebaseapp.com",
    projectId: "youcontrol-1d60a",
    storageBucket: "youcontrol-1d60a.firebasestorage.app",
    messagingSenderId: "812100760013",
    appId: "1:812100760013:web:7574906aa285555faf5484"
};

// Inicialización estándar y segura
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

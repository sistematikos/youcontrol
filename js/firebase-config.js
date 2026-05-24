/**
 * YOU CONTROL - Configuración de Firebase
 * Asegúrate de que este archivo esté dentro de la carpeta /js
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAMkpj9tFps526mL6hO-ciePWrTdx_NK9Q",
  authDomain: "youcontrol-1d60a.firebaseapp.com",
  projectId: "youcontrol-1d60a",
  storageBucket: "youcontrol-1d60a.firebasestorage.app",
  messagingSenderId: "812100760013",
  appId: "1:812100760013:web:7574906aa285555faf5484"
};

// Inicializar la aplicación
const app = initializeApp(firebaseConfig);

// Inicializar Firestore con persistencia optimizada para web
export const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

console.log("Firebase inicializado correctamente.");

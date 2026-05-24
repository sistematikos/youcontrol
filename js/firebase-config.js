// Importamos las funciones necesarias usando la misma versión de CDN que en pos-core.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración de tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyAMkpj9tFps526mL6hO-ciePWrTdx_NK9Q",
  authDomain: "youcontrol-1d60a.firebaseapp.com",
  projectId: "youcontrol-1d60a",
  storageBucket: "youcontrol-1d60a.firebasestorage.app",
  messagingSenderId: "812100760013",
  appId: "1:812100760013:web:7574906aa285555faf5484"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// EXPORTAR la base de datos para que pos-core.js pueda leerla
export const db = getFirestore(app);

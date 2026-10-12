import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Configuración por defecto (Base de datos madre / principal compartida)
const defaultConfig = {
    apiKey: "AIzaSyAMkpj9tFps526mL6hO-ciePWrTdx_NK9Q", 
    authDomain: "youcontrol-1d60a.firebaseapp.com",
    projectId: "youcontrol-1d60a",
    storageBucket: "youcontrol-1d60a.firebasestorage.app",
    messagingSenderId: "812100760013",
    appId: "1:812100760013:web:7574906aa285555faf5484"
};

// Verificar si la empresa actual tiene un tenant/base de datos independiente guardado en localStorage
const empresaID = localStorage.getItem('youcontrol_empresa_id');
let activeConfig = defaultConfig;

if (empresaID) {
    const tenantDataString = localStorage.getItem(`youcontrol_tenant_${empresaID}`);
    if (tenantDataString) {
        try {
            const tenantData = JSON.parse(tenantDataString);
            if (tenantData.firebaseConfig && tenantData.firebaseConfig.apiKey) {
                activeConfig = tenantData.firebaseConfig;
                console.log("🔌 Conectado a Firebase Independiente (Tenant):", empresaID);
            }
        } catch (e) {
            console.error("Error al leer configuración tenant:", e);
        }
    }
}

// Inicializar Firebase de manera segura (evitando duplicar instancias si ya está activa)
const apps = getApps();
const app = apps.length === 0 ? initializeApp(activeConfig) : apps[0];
const db = getFirestore(app);

export { db };

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración por defecto (Base de datos principal)
const defaultConfig = {
    apiKey: "AIzaSyAMkpj9tFps526mL6hO-ciePWrTdx_NK9Q", 
    authDomain: "youcontrol-1d60a.firebaseapp.com",
    projectId: "youcontrol-1d60a",
    storageBucket: "youcontrol-1d60a.firebasestorage.app",
    messagingSenderId: "812100760013",
    appId: "1:812100760013:web:7574906aa285555faf5484"
};

const empresaID = (localStorage.getItem('youcontrol_empresa_id') || '').trim();
let activeConfig = defaultConfig;

// Si existe configuración de tenant guardada en el cliente, usamos esa
if (empresaID) {
    const tenantData = localStorage.getItem(`youcontrol_tenant_${empresaID}`);
    if (tenantData) {
        try {
            const parsed = JSON.parse(tenantData);
            if (parsed.firebaseConfig && parsed.firebaseConfig.apiKey) {
                activeConfig = parsed.firebaseConfig;
                console.log("🔌 Conectado a base de datos independiente de la empresa:", empresaID);
            }
        } catch (e) {
            console.error("Error al decodificar credenciales tenant:", e);
        }
    }
}

// Inicializar la app evitando colisiones de instancias
const appName = empresaID ? `app_${empresaID}` : '[DEFAULT]';
const currentApps = getApps();
let app;

const appExistente = currentApps.find(a => a.name === appName);
if (appExistente) {
    app = appExistente;
} else {
    app = initializeApp(activeConfig, appName);
}

const db = getFirestore(app);

export { db };

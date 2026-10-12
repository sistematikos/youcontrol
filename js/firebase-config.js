import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración por defecto (Base de datos principal para la data vieja)
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

// Leer de forma 100% síncrona si esta empresa tiene una base de datos independiente guardada
if (empresaID) {
    const tenantConfigStr = localStorage.getItem(`youcontrol_tenant_config_${empresaID}`);
    if (tenantConfigStr) {
        try {
            const parsedConfig = JSON.parse(tenantConfigStr);
            if (parsedConfig && parsedConfig.apiKey) {
                activeConfig = parsedConfig;
                console.log("🔌 Usando base de datos independiente (Tenant) para:", empresaID);
            }
        } catch (e) {
            console.error("Error leyendo configuración tenant:", e);
        }
    }
}

// Inicialización segura sin colisiones
const appName = empresaID ? `app_${empresaID}` : '[DEFAULT]';
const existingApps = getApps();
let app = existingApps.find(a => a.name === appName);

if (!app) {
    app = initializeApp(activeConfig, appName);
}

const db = getFirestore(app);

export { db };

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración por defecto (Proyecto Principal / Maestro)
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

// Función para inicializar app segura
function obtenerDbPersonalizada(configParaUsar, identificadorApp) {
    const existingApps = getApps();
    let app = existingApps.find(a => a.name === identificadorApp);
    if (!app) {
        app = initializeApp(configParaUsar, identificadorApp);
    }
    return getFirestore(app);
}

let db;

// Si hay una empresa activa, revisamos su configuración
if (empresaID) {
    const cacheKey = `youcontrol_tenant_config_${empresaID}`;
    let tenantConfigStr = localStorage.getItem(cacheKey);

    if (tenantConfigStr) {
        // 1. Si ya está en caché local, la usamos de inmediato
        try {
            activeConfig = JSON.parse(tenantConfigStr);
            console.log("🔌 Usando configuración independiente desde caché para:", empresaID);
            db = obtenerDbPersonalizada(activeConfig, `app_${empresaID}`);
        } catch (e) {
            console.error("Error leyendo caché tenant:", e);
        }
    } else {
        // 2. Si NO está en caché, inicializamos temporalmente el proyecto principal para consultarla en la nube
        const mainApp = getApps().find(a => a.name === '[DEFAULT]') || initializeApp(defaultConfig, '[DEFAULT]');
        const mainDb = getFirestore(mainApp);

        // Consultamos de forma asíncrona la colección empresas_config de tu Panel Maestro
        try {
            const docSnap = await getDoc(doc(mainDb, "empresas_config", empresaID));
            if (docSnap.exists() && docSnap.data().firebaseConfig) {
                activeConfig = docSnap.data().firebaseConfig;
                // Guardamos en caché local para que las próximas cargas sean instantáneas
                localStorage.setItem(cacheKey, JSON.stringify(activeConfig));
                console.log("☁️ Configuración independiente descargada de la nube y guardada en caché para:", empresaID);
            }
        } catch (e) {
            console.error("Error consultando configuración en la nube:", e);
        }
        
        db = obtenerDbPersonalizada(activeConfig, empresaID ? `app_${empresaID}` : '[DEFAULT]');
    }
} else {
    db = obtenerDbPersonalizada(defaultConfig, '[DEFAULT]');
}

export { db };

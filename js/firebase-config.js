import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración por defecto (Base de datos principal / Maestra)
const defaultConfig = {
    apiKey: "AIzaSyAMkpj9tFps526mL6hO-ciePWrTdx_NK9Q", 
    authDomain: "youcontrol-1d60a.firebaseapp.com",
    projectId: "youcontrol-1d60a",
    storageBucket: "youcontrol-1d60a.firebasestorage.app",
    messagingSenderId: "812100760013",
    appId: "1:812100760013:web:7574906aa285555faf5484"
};

// 1. Inicializamos siempre la principal para consultas maestras o licencias si se requiere
const mainApp = getApps().length === 0 ? initializeApp(defaultConfig, "main") : getApps()[0];
const dbMain = getFirestore(mainApp);

// Objeto 'db' dinámico para las operaciones del sistema
let db = dbMain;

// Función autoejecutable para verificar si la empresa actual tiene base de datos propia configurada
async function inicializarConexionTenant() {
    const empresaID = (localStorage.getItem('youcontrol_empresa_id') || '').trim();
    if (!empresaID) return;

    try {
        // Consultamos la config en la base maestra
        const docSnap = await getDoc(doc(dbMain, "empresas_config", empresaID));
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Si la empresa tiene su propio firebaseConfig registrado
            if (data.firebaseConfig && data.firebaseConfig.apiKey) {
                const tenantAppName = `tenant_${empresaID}`;
                const existingApps = getApps();
                let tenantApp = existingApps.find(a => a.name === tenantAppName);
                
                if (!tenantApp) {
                    tenantApp = initializeApp(data.firebaseConfig, tenantAppName);
                }
                db = getFirestore(tenantApp);
                console.log("🔌 Conectado exitosamente a la base de datos independiente de la empresa:", empresaID);
            }
        }
    } catch (e) {
        console.error("Error al cargar la configuración de la base de datos independiente:", e);
    }
}

// Ejecutamos la verificación de forma transparente
await inicializarConexionTenant();

export { db };

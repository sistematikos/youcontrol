import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAMkpj9tFps526mL6hO-ciePWrTdx_NK9Q", 
    authDomain: "youcontrol-1d60a.firebaseapp.com",
    projectId: "youcontrol-1d60a",
    storageBucket: "youcontrol-1d60a.firebasestorage.app",
    messagingSenderId: "812100760013",
    appId: "1:812100760013:web:7574906aa285555faf5484"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function llenarFormulario(id, data, licenciaData = null) {
    document.getElementById('empresaID').value = id;
    document.getElementById('nombreEmpresa').value = data.nombre || data.cliente || "";
    document.getElementById('rif').value = data.rif || "";
    document.getElementById('dir').value = data.direccion || "";
    document.getElementById('tel').value = data.telefono || "";
    document.getElementById('email').value = data.email || "";
    
    const limiteEquipos = licenciaData?.limite || data.limite_equipos || 3;
    document.getElementById('limite').value = limiteEquipos;

    // Rellenar credenciales de Firebase personalizadas si existen
    const fbConfig = data.firebaseConfig || {};
    document.getElementById('fbApiKey').value = fbConfig.apiKey || "";
    document.getElementById('fbProjectId').value = fbConfig.projectId || "";
    document.getElementById('fbStorageBucket').value = fbConfig.storageBucket || "";
    document.getElementById('fbAppId').value = fbConfig.appId || "";

    const logoUrl = `https://raw.githubusercontent.com/sistematikos/youcontrol/main/img/${id}.png`;
    const imgElement = document.getElementById('previewLogo');
    imgElement.style.display = 'block';
    imgElement.src = logoUrl;

    const tokenData = {
        n: data.nombre || data.cliente,
        rif: data.rif || "",
        l: parseInt(limiteEquipos),
        activation_id: id
    };
    const tokenBase64 = btoa(JSON.stringify(tokenData));
    document.getElementById('tokenResult').value = tokenBase64;
    document.getElementById('resultBox').style.display = 'block';

    document.getElementById('status').innerText = "✅ Datos y licencia cargados correctamente.";
}

// Botón Nuevo Registro
document.getElementById('btnNuevo').addEventListener('click', () => {
    document.getElementById('empresaID').value = "";
    document.getElementById('nombreEmpresa').value = "";
    document.getElementById('rif').value = "";
    document.getElementById('dir').value = "";
    document.getElementById('tel').value = "";
    document.getElementById('email').value = "";
    document.getElementById('fbApiKey').value = "";
    document.getElementById('fbProjectId').value = "";
    document.getElementById('fbStorageBucket').value = "";
    document.getElementById('fbAppId').value = "";
    document.getElementById('previewLogo').style.display = 'none';
    document.getElementById('resultBox').style.display = 'none';
    document.getElementById('status').innerText = "✨ Escriba el ID de activación y sus datos.";
});

// Botón Buscar
document.getElementById('btnBuscar').addEventListener('click', async () => {
    const busqueda = document.getElementById('busquedaInput').value.trim();
    if (!busqueda) return alert("Escribe un ID para buscar.");
    
    try {
        const docEmpresa = await getDoc(doc(db, "empresas_config", busqueda));
        const docLicencia = await getDoc(doc(db, "licencias", busqueda));

        if (docEmpresa.exists() || docLicencia.exists()) {
            const dataEmpresa = docEmpresa.exists() ? docEmpresa.data() : {};
            const dataLicencia = docLicencia.exists() ? docLicencia.data() : {};
            
            const dataFinal = { ...dataLicencia, ...dataEmpresa };
            llenarFormulario(busqueda, dataFinal, dataLicencia);
        } else {
            alert("No se encontró ningún registro con ese ID.");
        }
    } catch (e) {
        alert("Error en la búsqueda: " + e.message);
    }
});

// Botón Guardar en Firebase (Dual: empresas_config + licencias)
document.getElementById('btnGuardar').addEventListener('click', async () => {
    const id = document.getElementById('empresaID').value.trim();
    if (!id) return alert("El ID de activación / empresa es obligatorio.");

    const nombre = document.getElementById('nombreEmpresa').value.trim();
    if (!nombre) return alert("El nombre de la empresa es obligatorio.");

    const limite = parseInt(document.getElementById('limite').value);
    const rif = document.getElementById('rif').value.trim();

    // Capturar datos de Firebase independiente (si se llenaron)
    const apiKey = document.getElementById('fbApiKey').value.trim();
    const projectId = document.getElementById('fbProjectId').value.trim();
    const storageBucket = document.getElementById('fbStorageBucket').value.trim();
    const appId = document.getElementById('fbAppId').value.trim();

    let firebaseConfigPersonalizada = null;
    if (apiKey && projectId) {
        firebaseConfigPersonalizada = {
            apiKey: apiKey,
            authDomain: `${projectId}.firebaseapp.com`,
            projectId: projectId,
            storageBucket: storageBucket || `${projectId}.firebasestorage.app`,
            messagingSenderId: "812100760013",
            appId: appId || "1:812100760013:web:custom"
        };
    }

    const tokenData = {
        n: nombre,
        rif: rif,
        l: limite,
        activation_id: id
    };
    const tokenBase64 = btoa(JSON.stringify(tokenData));

    const datosEmpresa = {
        nombre: nombre,
        rif: rif,
        direccion: document.getElementById('dir').value.trim(),
        telefono: document.getElementById('tel').value.trim(),
        email: document.getElementById('email').value.trim(),
        limite_equipos: limite,
        licencia_token: tokenBase64,
        logoUrl: `https://raw.githubusercontent.com/sistematikos/youcontrol/main/img/${id}.png`,
        firebaseConfig: firebaseConfigPersonalizada,
        timestamp: new Date().toISOString()
    };

    try {
        // 1. Guardar en empresas_config (Base de datos principal)
        await setDoc(doc(db, "empresas_config", id), datosEmpresa, { merge: true });

        // 2. Guardar en licencias (Base de datos principal)
        const licenciaRef = doc(db, "licencias", id);
        const licenciaSnap = await getDoc(licenciaRef);
        
        if (!licenciaSnap.exists()) {
            await setDoc(licenciaRef, {
                cliente: nombre,
                limite: limite,
                equipos: [],
                fecha_registro: new Date().toISOString()
            }, { merge: true });
        } else {
            await setDoc(licenciaRef, {
                cliente: nombre,
                limite: limite
            }, { merge: true });
        }

        document.getElementById('tokenResult').value = tokenBase64;
        document.getElementById('resultBox').style.display = 'block';
        document.getElementById('status').innerText = "🚀 ¡Guardado con éxito en Firebase (Empresas y Licencias)!";
    } catch (e) { 
        alert("Error al guardar: " + e.message); 
    }
});

window.copiarToken = function() {
    const copyText = document.getElementById("tokenResult");
    copyText.select();
    document.execCommand("copy");
    alert("¡Código de licencia copiado al portapapeles!");
}

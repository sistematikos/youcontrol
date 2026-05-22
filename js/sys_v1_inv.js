/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Gestión de Inventario General (sys_v1_inv.js)
 * Estructura: usuarios -> [ID_LARGO] -> colecciones
 */

import { db } from './firebase-config.js'; 
import { 
    collection, onSnapshot, doc, getDoc, setDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- SEGURIDAD Y RUTA DINÁMICA ---
const getEmpresaId = () => {
    const id = localStorage.getItem('youcontrol_empresa_id');
    if (!id) {
        console.error("Acceso denegado: No se ha detectado una empresa activa.");
        window.location.href = "index.html"; // Redirige al inicio si no hay ID
        return null;
    }
    return id;
};

const USER_ID = getEmpresaId();

// Detener ejecución si no hay ID
if (!USER_ID) throw new Error("No se pudo inicializar el inventario: ID de empresa ausente.");

console.log("Sistema operando para empresa ID:", USER_ID);

// Estado Global
let listaProductos = [];
let tasaActual = 1.00;

// ... [Mantén tus variables del DOM constantes aquí] ...

// ==========================================
// 1. INICIALIZACIÓN DINÁMICA
// ==========================================
async function inicializarInventario() {
    mostrarStatusBar("⏳ Cargando datos de empresa...", "loading");
    
    try {
        // Ruta: usuarios -> [ID_LARGO] -> configuracion -> tasa
        const tasaDocRef = doc(db, "usuarios", USER_ID, "configuracion", "tasa");
        const tasaSnap = await getDoc(tasaDocRef);
        
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
            if (tasaInput) tasaInput.value = tasaActual.toFixed(2);
        }

        // Ruta: usuarios -> [ID_LARGO] -> productos
        const productosCollection = collection(db, "usuarios", USER_ID, "productos");
        
        onSnapshot(productosCollection, (snapshot) => {
            listaProductos = [];
            cuerpoTabla.innerHTML = '';
            snapshot.forEach(doc => {
                listaProductos.push({ id: doc.id, ...doc.data() });
            });
            renderizarTabla(listaProductos);
            mostrarStatusBar("✅ Sincronizado: Empresa " + USER_ID, "success");
        });

    } catch (e) {
        console.error("Error al cargar:", e);
        mostrarStatusBar("❌ Error al conectar con la base de datos.", "loading");
    }
}

document.addEventListener('DOMContentLoaded', inicializarInventario);

// ==========================================
// CRUD DINÁMICO
// ==========================================
window.guardarCambiosModal = async function() {
    const idDoc = formId.value.trim() || formSku.value.trim() || formBarras.value.trim() || Date.now().toString();
    
    // RUTA: usuarios -> [ID_LARGO] -> productos -> [ID_PRODUCTO]
    const docRef = doc(db, "usuarios", USER_ID, "productos", idDoc);
    
    const productoData = {
        sku: formSku.value.trim(),
        barras: formBarras.value.trim(),
        nombre: formNombre.value.trim(),
        costo: parseFloat(formCosto.value) || 0,
        ganancia: parseFloat(formGanancia.value) || 0,
        precio: parseFloat(formPrecio.value) || 0,
        stock: parseInt(formStock.value) || 0,
        ultima_actualizacion: new Date().toISOString().split('T')[0]
    };

    try {
        await setDoc(docRef, productoData, { merge: true });
        window.cerrarModal();
        mostrarStatusBar("✅ Producto guardado.", "success");
    } catch (e) {
        alert("Error al guardar: " + e.message);
    }
};

window.eliminarProducto = async function(id, nombre) {
    if (confirm(`¿Eliminar ${nombre}?`)) {
        try {
            // RUTA: usuarios -> [ID_LARGO] -> productos -> [ID]
            await deleteDoc(doc(db, "usuarios", USER_ID, "productos", id));
            mostrarStatusBar("✅ Producto eliminado.", "success");
        } catch (e) { alert("Error al eliminar."); }
    }
};

// ... [Mantén tus funciones de UI: cerrarModal, mostrarStatusBar, etc.]

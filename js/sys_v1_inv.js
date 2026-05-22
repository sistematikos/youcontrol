/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Gestión de Inventario (sys_v1_inv.js)
 * Ruta: usuarios -> [ID_LARGO] -> productos
 */

import { db } from './firebase-config.js'; 
import { 
    collection, onSnapshot, doc, getDoc, setDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Función central de seguridad para obtener la ruta
const getEmpresaId = () => {
    const id = localStorage.getItem('youcontrol_empresa_id');
    if (!id) {
        console.error("No se detectó empresa activa.");
        return null;
    }
    return id;
};

const USER_ID = getEmpresaId();

// Estado Global
let listaProductos = [];
let tasaActual = 1.00;

// Elementos DOM (Asegúrate de que existan en tu HTML)
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const tasaInput = document.getElementById('tasaCambio');
const statusBar = document.getElementById('status-bar-inv');

// ==========================================
// INICIALIZACIÓN DINÁMICA
// ==========================================
async function inicializarInventario() {
    if (!USER_ID) {
        mostrarStatusBar("❌ Error: No hay empresa seleccionada.", "error");
        return;
    }
    
    console.log("Inventario cargando para ruta:", `usuarios/${USER_ID}/productos`);
    
    try {
        // Carga de tasa
        const tasaDocRef = doc(db, "usuarios", USER_ID, "configuracion", "tasa");
        const tasaSnap = await getDoc(tasaDocRef);
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
            if (tasaInput) tasaInput.value = tasaActual.toFixed(2);
        }

        // Carga de productos (Ruta absoluta)
        const productosCollection = collection(db, "usuarios", USER_ID, "productos");
        
        onSnapshot(productosCollection, (snapshot) => {
            listaProductos = [];
            cuerpoTabla.innerHTML = '';
            
            snapshot.forEach(doc => {
                listaProductos.push({ id: doc.id, ...doc.data() });
            });
            
            renderizarTabla(listaProductos);
            mostrarStatusBar("✅ Inventario sincronizado.", "success");
        });

    } catch (e) {
        console.error("Error al cargar inventario:", e);
        mostrarStatusBar("❌ Error de conexión: " + e.message, "error");
    }
}

// ==========================================
// GUARDAR / ELIMINAR (CRUD DINÁMICO)
// ==========================================
window.guardarCambiosModal = async function() {
    if (!USER_ID) return;
    
    const idDoc = formId.value.trim() || Date.now().toString();
    const docRef = doc(db, "usuarios", USER_ID, "productos", idDoc);
    
    const productoData = {
        sku: formSku.value.trim(),
        barras: formBarras.value.trim(),
        nombre: formNombre.value.trim(),
        costo: parseFloat(formCosto.value) || 0,
        ganancia: parseFloat(formGanancia.value) || 0,
        precio: parseFloat(formPrecio.value) || 0,
        stock: parseInt(formStock.value) || 0
    };

    await setDoc(docRef, productoData, { merge: true });
    window.cerrarModal();
};

window.eliminarProducto = async function(id) {
    if (confirm("¿Eliminar este producto?")) {
        await deleteDoc(doc(db, "usuarios", USER_ID, "productos", id));
    }
};

document.addEventListener('DOMContentLoaded', inicializarInventario);

// Funciones auxiliares de UI (Mantener igual)
function mostrarStatusBar(msg, type) { if(statusBar) statusBar.innerText = msg; }

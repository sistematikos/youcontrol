/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Gestión de Inventario General (sys_v1_inv.js)
 * Dinámico: La ruta se construye según el ID del usuario en sesión.
 */

import { db } from './firebase-config.js'; 
import { 
    collection, onSnapshot, doc, getDoc, setDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// OBTENCIÓN DINÁMICA: Lee el ID guardado al iniciar sesión
const USER_ID = localStorage.getItem('youcontrol_empresa_id');

// Validación básica de seguridad
if (!USER_ID) {
    console.error("No se encontró ID de empresa. Redirigiendo a inicio...");
    // window.location.href = "login.html"; // Descomenta esto si quieres forzar redirección
}

console.log("Sistema operando para empresa ID:", USER_ID);

// Estado Global
let listaProductos = [];
let tasaActual = 1.00;

// Enlaces del DOM
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const tasaInput = document.getElementById('tasaCambio');
const buscadorInput = document.getElementById('buscador');
const statusBar = document.getElementById('status-bar-inv');

// Enlaces del Formulario Modal
const modal = document.getElementById('modalProducto');
const formId = document.getElementById('form-id');
const formBarras = document.getElementById('form-barras');
const formSku = document.getElementById('form-sku');
const formNombre = document.getElementById('form-nombre');
const formCosto = document.getElementById('form-costo');
const formGanancia = document.getElementById('form-ganancia');
const formPrecio = document.getElementById('form-precio');
const formStock = document.getElementById('form-stock');

// ==========================================
// 1. INICIALIZACIÓN DINÁMICA
// ==========================================
async function inicializarInventario() {
    if (!USER_ID) return;
    
    mostrarStatusBar("⏳ Cargando datos de empresa...", "loading");
    
    try {
        // La ruta es: usuarios -> [ID_DINAMICO] -> configuracion -> tasa
        const tasaDocRef = doc(db, "usuarios", USER_ID, "configuracion", "tasa");
        const tasaSnap = await getDoc(tasaDocRef);
        
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
            if (tasaInput) tasaInput.value = tasaActual.toFixed(2);
        }

        // La ruta es: usuarios -> [ID_DINAMICO] -> productos
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
    if (!USER_ID) return;
    
    const idDoc = formId.value.trim() || formSku.value.trim() || formBarras.value.trim() || Date.now().toString();
    
    // RUTA DINÁMICA: Siempre utiliza el USER_ID capturado de la sesión
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
        mostrarStatusBar("✅ Producto guardado en: " + USER_ID, "success");
    } catch (e) {
        alert("Error al guardar: " + e.message);
    }
};

window.eliminarProducto = async function(id, nombre) {
    if (confirm(`¿Eliminar ${nombre}?`)) {
        try {
            await deleteDoc(doc(db, "usuarios", USER_ID, "productos", id));
            mostrarStatusBar("✅ Producto eliminado.", "success");
        } catch (e) { alert("Error al eliminar."); }
    }
};

// ==========================================
// VENTANAS Y ESTADOS (MANTENER)
// ==========================================
window.cerrarModal = function() { modal.style.display = 'none'; };

function mostrarStatusBar(mensaje, tipo) {
    if (!statusBar) return;
    statusBar.innerText = mensaje;
    statusBar.style.display = 'block';
    if (tipo === 'success') setTimeout(ocultarStatusBar, 3000);
}

function ocultarStatusBar() { if (statusBar) statusBar.style.display = 'none'; }

// ... (El resto de tus funciones como renderizarTabla y filtrarProductos se mantienen iguales)

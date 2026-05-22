/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Gestión de Inventario (sys_v1_inv.js)
 * Estructura de trabajo: usuarios -> [ID_LARGO] -> productos
 */

import { db } from './firebase-config.js'; 
import { 
    collection, onSnapshot, doc, getDoc, setDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- MOTOR DE DETECCIÓN DINÁMICA ---
// Busca el ID en el navegador; si no existe, usa el de tu base de datos
const getEmpresaId = () => {
    const idGuardado = localStorage.getItem('youcontrol_empresa_id');
    const idRespaldo = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; // ID de tu base actual
    return idGuardado || idRespaldo;
};

const USER_ID = getEmpresaId();
console.log("Sistema operando para ruta: usuarios/" + USER_ID);

// Estado Global
let listaProductos = [];
let tasaActual = 1.00;

// Elementos del DOM (Asegúrate de tener estos IDs en tu HTML)
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const tasaInput = document.getElementById('tasaCambio');
const statusBar = document.getElementById('status-bar-inv');
const modal = document.getElementById('modalProducto');
const formId = document.getElementById('form-id');
const formSku = document.getElementById('form-sku');
const formBarras = document.getElementById('form-barras');
const formNombre = document.getElementById('form-nombre');
const formCosto = document.getElementById('form-costo');
const formGanancia = document.getElementById('form-ganancia');
const formPrecio = document.getElementById('form-precio');
const formStock = document.getElementById('form-stock');

// ==========================================
// 1. INICIALIZACIÓN Y LECTURA
// ==========================================
async function inicializarInventario() {
    mostrarStatusBar("⏳ Cargando datos...", "loading");
    
    try {
        // Carga de tasa
        const tasaDocRef = doc(db, "usuarios", USER_ID, "configuracion", "tasa");
        const tasaSnap = await getDoc(tasaDocRef);
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
            if (tasaInput) tasaInput.value = tasaActual.toFixed(2);
        }

        // Carga de productos (Ruta absoluta dinámica)
        const productosCollection = collection(db, "usuarios", USER_ID, "productos");
        
        onSnapshot(productosCollection, (snapshot) => {
            listaProductos = [];
            if (cuerpoTabla) cuerpoTabla.innerHTML = '';
            
            snapshot.forEach(doc => {
                listaProductos.push({ id: doc.id, ...doc.data() });
            });
            
            renderizarTabla(listaProductos);
            mostrarStatusBar("✅ Inventario sincronizado.", "success");
        });

    } catch (e) {
        console.error("Error al cargar:", e);
        mostrarStatusBar("❌ Error de conexión.", "error");
    }
}

// ==========================================
// 2. FUNCIONES DE UI Y TABLA
// ==========================================
function renderizarTabla(productos) {
    if (!cuerpoTabla) return;
    cuerpoTabla.innerHTML = productos.map(p => `
        <tr>
            <td>${p.barras || ''}</td>
            <td>${p.sku || ''}</td>
            <td>${p.nombre || ''}</td>
            <td>$ ${parseFloat(p.costo || 0).toFixed(2)}</td>
            <td>${p.ganancia || 0}%</td>
            <td>$ ${parseFloat(p.precio || 0).toFixed(2)}</td>
            <td>${(parseFloat(p.precio || 0) * tasaActual).toFixed(2)} Bs</td>
            <td>${p.stock || 0}</td>
            <td>
                <button onclick="window.eliminarProducto('${p.id}', '${p.nombre}')">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

function mostrarStatusBar(msg, tipo) { 
    if (statusBar) {
        statusBar.innerText = msg;
        statusBar.style.display = 'block';
    }
}

// ==========================================
// 3. CRUD (GUARDAR Y ELIMINAR)
// ==========================================
window.guardarCambiosModal = async function() {
    const idDoc = formId.value.trim() || formSku.value.trim() || Date.now().toString();
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
    if (modal) modal.style.display = 'none';
    mostrarStatusBar("✅ Guardado con éxito.", "success");
};

window.eliminarProducto = async function(id, nombre) {
    if (confirm(`¿Eliminar ${nombre}?`)) {
        await deleteDoc(doc(db, "usuarios", USER_ID, "productos", id));
    }
};

// ==========================================
// INICIO
// ==========================================
document.addEventListener('DOMContentLoaded', inicializarInventario);

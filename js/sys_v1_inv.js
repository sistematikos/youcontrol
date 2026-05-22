/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Gestión de Inventario (sys_v1_inv.js)
 * Versión con Diagnóstico Visual para PWA
 */

import { db } from './firebase-config.js'; 
import { 
    collection, onSnapshot, doc, getDoc, setDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- MOTOR DE DETECCIÓN DINÁMICA ---
const getEmpresaId = () => {
    // Intenta leer el ID guardado. Si no existe, usa el respaldo.
    const idGuardado = localStorage.getItem('youcontrol_empresa_id');
    const idRespaldo = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; 
    return idGuardado || idRespaldo;
};

const USER_ID = getEmpresaId();

// --- ELEMENTOS DEL DOM ---
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const statusBar = document.getElementById('status-bar-inv');

// --- STATUS BAR MEJORADO PARA PWA ---
function mostrarStatusBar(msg, tipo) { 
    if (statusBar) {
        statusBar.innerText = msg;
        statusBar.style.display = 'block';
        // Colores para diferenciar errores
        statusBar.style.backgroundColor = (tipo === 'error') ? '#f8d7da' : '#d4edda';
        statusBar.style.color = (tipo === 'error') ? '#721c24' : '#155724';
    }
}

// ==========================================
// INICIALIZACIÓN CON DIAGNÓSTICO
// ==========================================
async function inicializarInventario() {
    mostrarStatusBar("Conectando a ruta: usuarios/" + USER_ID + "/productos", "loading");
    
    try {
        const productosCollection = collection(db, "usuarios", USER_ID, "productos");
        
        onSnapshot(productosCollection, (snapshot) => {
            if (snapshot.empty) {
                mostrarStatusBar("Aviso: La ruta está vacía (0 productos).", "error");
            } else {
                mostrarStatusBar("¡Conexión exitosa! Productos: " + snapshot.size, "success");
            }
            
            let listaProductos = [];
            snapshot.forEach(doc => {
                listaProductos.push({ id: doc.id, ...doc.data() });
            });
            renderizarTabla(listaProductos);
        }, (error) => {
            mostrarStatusBar("Error Firebase: " + error.message, "error");
        });

    } catch (e) {
        mostrarStatusBar("Error crítico: " + e.message, "error");
    }
}

// ==========================================
// FUNCIONES DE UI
// ==========================================
function renderizarTabla(productos) {
    if (!cuerpoTabla) return;
    cuerpoTabla.innerHTML = productos.map(p => `
        <tr>
            <td>${p.barras || 'N/A'}</td>
            <td>${p.sku || 'N/A'}</td>
            <td>${p.nombre || 'Sin nombre'}</td>
            <td>$ ${parseFloat(p.costo || 0).toFixed(2)}</td>
            <td>${p.ganancia || 0}%</td>
            <td>$ ${parseFloat(p.precio || 0).toFixed(2)}</td>
            <td>${p.stock || 0}</td>
            <td>
                <button onclick="window.eliminarProducto('${p.id}', '${p.nombre}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// ==========================================
// CRUD
// ==========================================
window.eliminarProducto = async function(id, nombre) {
    if (confirm(`¿Eliminar ${nombre}?`)) {
        try {
            await deleteDoc(doc(db, "usuarios", USER_ID, "productos", id));
            mostrarStatusBar("Producto eliminado con éxito.", "success");
        } catch (e) {
            mostrarStatusBar("Error al eliminar: " + e.message, "error");
        }
    }
};

document.addEventListener('DOMContentLoaded', inicializarInventario);

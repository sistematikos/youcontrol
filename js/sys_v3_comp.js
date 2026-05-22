/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Integrado de Entrada de Mercancía Masiva (sys_v3_comp.js)
 * Sincronizado dinámicamente con Firestore según el usuario logueado
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, doc, getDoc, writeBatch 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- MOTOR DE DETECCIÓN DINÁMICA ---
const getEmpresaId = () => {
    // Busca el ID guardado en la sesión del navegador
    const idGuardado = localStorage.getItem('youcontrol_empresa_id');
    // Respaldo de seguridad en caso de fallo
    const idRespaldo = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; 
    return idGuardado || idRespaldo;
};

const USER_ID = getEmpresaId();

let productosLocales = [];
let listaCompraActual = []; 
let tasaActual = 1.00;
let indexFocus = -1;

// Vinculaciones del DOM
const buscador = document.getElementById('buscador-dinamico');
const dropdown = document.getElementById('dropdown-resultados');
const txtTasa = document.getElementById('txt-tasa');
const inputSku = document.getElementById('comp-sku');
const inputBarras = document.getElementById('comp-barras');
const inputNombre = document.getElementById('comp-nombre');
const inputCosto = document.getElementById('comp-costo');
const inputGanancia = document.getElementById('comp-ganancia');
const inputPrecio = document.getElementById('comp-precio');
const inputPrecioBs = document.getElementById('comp-precio-bs');
const inputStockViejo = document.getElementById('comp-stock-viejo');
const inputCantidad = document.getElementById('comp-cantidad');
const inputFecha = document.getElementById('comp-fecha');
const statusBar = document.getElementById('status-bar-comp');
const tablaCompra = document.getElementById('tabla-items-compra'); 

// Mensajes de Alerta
function mostrarEstado(mensaje, tipo) {
    if (!statusBar) return;
    statusBar.className = `status-${tipo}`;
    statusBar.innerText = mensaje;
    statusBar.style.display = 'block';
    statusBar.style.backgroundColor = (tipo === 'error') ? '#f8d7da' : '#d4edda';
    if (tipo === 'success') {
        setTimeout(() => { statusBar.style.display = 'none'; }, 3000);
    }
}

// ==========================================
// 1. INICIALIZACIÓN DINÁMICA
// ==========================================
async function inicializarEntradaMercancia() {
    mostrarEstado("⏳ Conectando con usuario: " + USER_ID, "loading");
    try {
        const tasaSnap = await getDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"));
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
            if (txtTasa) txtTasa.innerText = tasaActual.toFixed(2).replace('.', ',') + " Bs.";
        }

        onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
            productosLocales = [];
            snapshot.forEach(doc => {
                productosLocales.push({ id: doc.id, ...doc.data() });
            });
            mostrarEstado("✅ Inventario cargado.", "success");
        });

    } catch (e) {
        mostrarEstado("❌ Error de conexión: " + e.message, "error");
    }
}

// ==========================================
// 2. PROCESAMIENTO (BATCH) CON RUTA DINÁMICA
// ==========================================
window.procesarCompraCompleta = async () => {
    if (listaCompraActual.length === 0) {
        mostrarEstado("❌ No hay artículos en lista.", "error");
        return;
    }

    mostrarEstado("⏳ Guardando en Firestore...", "loading");
    const batch = writeBatch(db);

    try {
        listaCompraActual.forEach(item => {
            const prodExistente = productosLocales.find(p => (item.sku && p.sku === item.sku) || (item.barras && p.barras === item.barras));
            const idDocumento = prodExistente ? prodExistente.id : (item.sku || item.barras || doc(collection(db, "temp")).id);

            // RUTA DINÁMICA: Siempre usa USER_ID
            const docRef = doc(db, "usuarios", USER_ID, "productos", idDocumento);
            
            const payload = {
                sku: item.sku,
                barras: item.barras,
                nombre: item.nombre,
                costo: item.costo,
                ganancia: item.ganancia,
                precio: item.precio,
                stock: item.nuevoStockTotal,
                ultima_actualizacion: inputFecha.value
            };

            batch.set(docRef, payload, { merge: true });
        });

        await batch.commit();
        mostrarEstado(`✅ Compra guardada: ${listaCompraActual.length} ítems.`, "success");
        listaCompraActual = [];
        actualizarTablaInterfaz();
        limpiarCamposFicha();
    } catch (e) {
        mostrarEstado("❌ Error al guardar: " + e.message, "error");
    }
};

// --- MANTENIMIENTO: Asegura que estas funciones existan para que el resto del código no falle ---
document.addEventListener('DOMContentLoaded', () => {
    inicializarEntradaMercancia();
    // ... el resto de tus eventos de buscador y teclado aquí ...
});

// Nota: Mantén debajo de esto todas tus funciones de UI existentes (renderizarDropdown, etc.)

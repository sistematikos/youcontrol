/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas (pos-core.js)
 * Adaptación Multi-Empresa: Rutas dinámicas basadas en ID de localStorage.
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, query, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Función centralizada para obtener el ID de la empresa activa
const getEmpresaId = () => {
    const id = localStorage.getItem('youcontrol_empresa_id');
    if (!id) {
        console.error("Acceso denegado: No se ha detectado una empresa activa.");
        window.location.href = "index.html"; 
    }
    return id;
};

// Función de utilidad para construir rutas dinámicas
const getCollectionRef = (coleccion) => {
    const id = getEmpresaId();
    return collection(db, "usuarios", id, coleccion);
};

let productosMaster = [];
let clientesMaster = []; 
let carrito = [];
let itemSeleccionadoIndex = -1;
let tasaActual = 1;
let proximoNumeroFacturaStr = "000001";

// ==========================================
// 1. INICIALIZACIÓN, TASA Y FACTURA
// ==========================================
async function cargarTasa() {
    try {
        const id = getEmpresaId();
        const tasaRef = doc(db, "usuarios", id, "configuracion", "tasa");
        const tasaSnap = await getDoc(tasaRef);
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1;
            const txtTasa = document.getElementById('txt-tasa');
            if (txtTasa) txtTasa.innerText = tasaActual.toFixed(2).replace('.', ',');
            window.actualizarCarritoUI();
        }
    } catch (e) { console.error("Error cargando tasa:", e); }
}

function escucharUltimaFactura() {
    const ventsRef = getCollectionRef("ventas");
    const q = query(ventsRef, orderBy("fecha", "desc"), limit(1));
    
    onSnapshot(q, (snapshot) => {
        let ultimoNumero = 0;
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.nro_factura) {
                const limpio = data.nro_factura.replace(/\D/g, "");
                const num = parseInt(limpio);
                if (!isNaN(num) && num > ultimoNumero) ultimoNumero = num;
            }
        });
        proximoNumeroFacturaStr = String(ultimoNumero + 1).padStart(6, '0');
        const lblBadge = document.getElementById('lbl-nro-factura');
        if (lblBadge) lblBadge.innerText = proximoNumeroFacturaStr;
    });
}

function inicializarClientes() {
    onSnapshot(getCollectionRef("clientes"), (snapshot) => {
        clientesMaster = [];
        snapshot.forEach(docSnap => {
            clientesMaster.push({ id: docSnap.id, ...docSnap.data() });
        });
        clientesMaster.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        poblarSelectorClientes();
    });
}

// ==========================================
// 2. MOTORES DE BÚSQUEDA (DINÁMICOS)
// ==========================================
// (Se mantienen las funciones de búsqueda existentes, 
// ellas ya consumen los arrays que alimentamos con las nuevas rutas)

function inicializarProductos() {
    onSnapshot(getCollectionRef("productos"), (snapshot) => {
        productosMaster = [];
        snapshot.forEach(doc => productosMaster.push({ id: doc.id, ...doc.data() }));
    });
}

// ==========================================
// 3. PERSISTENCIA Y CARRO
// ==========================================
window.registrarVenta = async () => {
    const btn = document.getElementById('btnConfirmarVenta');
    if (!btn || btn.disabled) return;
    
    try {
        // Guarda la venta en la colección dinámica de la empresa actual
        await addDoc(getCollectionRef("ventas"), {
            fecha: serverTimestamp(),
            nro_factura: proximoNumeroFacturaStr,
            total_usd: window.totalVentaUSD,
            tasa: tasaActual,
            items: carrito
        });
        alert("✅ Venta registrada: " + proximoNumeroFacturaStr);
        carrito = [];
        window.actualizarCarritoUI();
        document.getElementById('modalPago').style.display = 'none';
    } catch (e) { alert("Error: " + e.message); }
};

// ==========================================
// INICIALIZACIÓN GLOBAL
// ==========================================
cargarTasa();
escucharUltimaFactura();
inicializarClientes();
inicializarProductos();
// ... resto de inicializaciones

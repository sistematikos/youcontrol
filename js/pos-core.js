/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas (pos-core.js)
 * Adaptación Multi-Empresa: Rutas dinámicas 100% basadas en el ID de sesión.
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, query, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- SEGURIDAD Y OBTENCIÓN DINÁMICA ---
const USER_ID = localStorage.getItem('youcontrol_empresa_id');

if (!USER_ID) {
    console.error("Acceso denegado: No se ha detectado una empresa activa.");
    alert("Error de sesión: Por favor, ingrese nuevamente al sistema.");
    window.location.href = "index.html"; 
}

console.log("Sistema operando para empresa ID:", USER_ID);

let productosMaster = [];
let clientesMaster = []; 
let carrito = [];
let itemSeleccionadoIndex = -1;
let tasaActual = 1;
let proximoNumeroFacturaStr = "000001";

window.clientesMaster = [];
let indexFocoCliente = -1;
let indexFocoProducto = -1;

// ==========================================
// 1. INICIALIZACIÓN, TASA Y FACTURA AUTOMÁTICA
// ==========================================
async function cargarTasa() {
    try {
        const tasaRef = doc(db, "usuarios", USER_ID, "configuracion", "tasa");
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
    const ventsRef = collection(db, "usuarios", USER_ID, "ventas");
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
    const clientesRef = collection(db, "usuarios", USER_ID, "clientes");
    onSnapshot(clientesRef, (snapshot) => {
        clientesMaster = [];
        snapshot.forEach(docSnap => {
            clientesMaster.push({ id: docSnap.id, ...docSnap.data() });
        });
        clientesMaster.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        window.clientesMaster = clientesMaster;
        poblarSelectorClientes();
    });
}

// ==========================================
// 2. MOTORES DE BÚSQUEDA Y CARRO
// ==========================================
function inicializarProductos() {
    const productosRef = collection(db, "usuarios", USER_ID, "productos");
    onSnapshot(productosRef, (snapshot) => {
        productosMaster = [];
        snapshot.forEach(doc => productosMaster.push({ id: doc.id, ...doc.data() }));
    });
}

window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    if (item) item.cantidad++; else carrito.push({ ...p, cantidad: 1 });
    window.actualizarCarritoUI();
};

// ==========================================
// 3. REGISTRO DE VENTAS (DINÁMICO)
// ==========================================
window.registrarVenta = async () => {
    const btn = document.getElementById('btnConfirmarVenta');
    if (!btn || btn.disabled) return;
    
    try {
        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), {
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

/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas (pos-core.js)
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

if (!USER_ID) { window.location.href = "index.html"; }

let productosMaster = [];
let clientesMaster = []; 
let carrito = [];
let proximoNumeroFacturaStr = "000001";
let tasaActual = 1.0; 

// ==========================================
// 1. CARGA DE CONFIGURACIÓN Y DATOS
// ==========================================
async function cargarConfiguracionGlobal() {
    try {
        const snap = await getDoc(doc(db, "usuarios", USER_ID));
        if (snap.exists()) {
            tasaActual = snap.data().tasa_bcv || 1.0;
            const txtTasa = document.getElementById('txt-tasa');
            if (txtTasa) txtTasa.innerText = tasaActual.toLocaleString('es-VE', {minimumFractionDigits: 2});
        }
    } catch (e) { console.error("Config:", e); }
}

function inicializarClientes() {
    onSnapshot(collection(db, "usuarios", USER_ID, "clientes"), (snap) => {
        clientesMaster = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });
}

function inicializarProductos() {
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
        productosMaster = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });
}

// ==========================================
// 2. BUSCADORES Y SELECCIÓN
// ==========================================
window.buscarProducto = (t) => {
    const c = t.toLowerCase().trim();
    return !c ? [] : productosMaster.filter(p => (p.id?.toLowerCase().includes(c) || p.nombre?.toLowerCase().includes(c)));
};

window.buscarCliente = (t) => {
    const c = t.toLowerCase().trim();
    return !c ? [] : clientesMaster.filter(cl => (cl.id?.toLowerCase().includes(c) || cl.nombre?.toLowerCase().includes(c)));
};

window.seleccionarCliente = (id, nombre) => {
    document.getElementById('buscar-cliente-pos').value = nombre;
    document.getElementById('resultados-cliente-pos').style.display = 'none';
    window.clienteSeleccionadoID = id;
    document.getElementById('buscar-producto-pos')?.focus();
};

window.seleccionarProducto = (id) => {
    window.agregarCarrito(id);
    document.getElementById('buscar-producto-pos').value = '';
    document.getElementById('resultados-producto-pos').style.display = 'none';
    document.getElementById('buscar-producto-pos').focus();
};

// ==========================================
// 3. CARRITO Y COMANDOS (F4, F5, F6)
// ==========================================
window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    if (item) item.cantidad++; else carrito.push({ ...p, cantidad: 1 });
    window.actualizarCarritoUI();
};

window.ejecutarF4 = () => { // Cambiar cantidad
    if (carrito.length === 0) return;
    const item = carrito[carrito.length - 1];
    const nuevaCant = prompt(`Cantidad para ${item.nombre}:`, item.cantidad);
    if (nuevaCant && !isNaN(nuevaCant)) { item.cantidad = parseInt(nuevaCant); window.actualizarCarritoUI(); }
};

window.ejecutarF5 = () => { // Cambiar precio
    if (carrito.length === 0) return;
    const item = carrito[carrito.length - 1];
    const nuevoPrecio = prompt(`Precio para ${item.nombre} ($):`, item.precio);
    if (nuevoPrecio && !isNaN(nuevoPrecio)) { item.precio = parseFloat(nuevoPrecio); window.actualizarCarritoUI(); }
};

window.ejecutarF6 = () => { if (carrito.length > 0) { carrito.pop(); window.actualizarCarritoUI(); } };

// ==========================================
// 4. MODAL PAGOS Y REGISTRO VENTA
// ==========================================
window.abrirModalCobro = () => {
    if (carrito.length === 0) return alert("Carrito vacío");
    const modal = document.getElementById('modalPago');
    if (modal) {
        document.getElementById('totalModalUSD').innerText = `$ ${window.totalVentaUSD.toFixed(2)}`;
        document.getElementById('totalModalBS').innerText = `${(window.totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
        modal.style.display = 'flex';
    }
};

window.registrarVenta = async () => {
    try {
        const ventaData = {
            cliente_id: window.clienteSeleccionadoID || "anonimo",
            items: carrito,
            total_usd: window.totalVentaUSD,
            tasa_aplicada: tasaActual,
            pagos: {
                punto_bs: parseFloat(document.getElementById('in-punto-bs')?.value) || 0,
                pago_movil_bs: parseFloat(document.getElementById('in-pagomovil-bs')?.value) || 0,
                efectivo_bs: parseFloat(document.getElementById('in-efectivo-bs')?.value) || 0,
                divisas_usd: parseFloat(document.getElementById('in-divisas-usd')?.value) || 0
            },
            fecha: serverTimestamp(),
            nro_factura: proximoNumeroFacturaStr
        };

        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), ventaData);
        alert("✅ Venta registrada: " + proximoNumeroFacturaStr);
        
        // Limpieza
        carrito = [];
        window.clienteSeleccionadoID = null;
        proximoNumeroFacturaStr = (parseInt(proximoNumeroFacturaStr) + 1).toString().padStart(6, '0');
        document.getElementById('modalPago').style.display = 'none';
        window.actualizarCarritoUI();
    } catch (e) { alert("Error: " + e.message); }
};

// ==========================================
// 5. INICIALIZACIÓN Y UI
// ==========================================
window.actualizarCarritoUI = () => {
    const cont = document.getElementById('lista-carrito');
    const total = carrito.reduce((sum, i) => sum + (i.cantidad * i.precio), 0);
    window.totalVentaUSD = total;
    if(cont) cont.innerHTML = carrito.map(i => `<div>${i.nombre} ($${i.precio}) x ${i.cantidad}</div>`).join('');
    document.getElementById('total-usd').innerText = `$ ${total.toFixed(2)}`;
};

document.addEventListener('keydown', (e) => {
    const cmds = { 'F4': window.ejecutarF4, 'F5': window.ejecutarF5, 'F6': window.ejecutarF6, 'F9': window.abrirModalCobro };
    if (cmds[e.key]) { e.preventDefault(); cmds[e.key](); }
});

document.addEventListener('DOMContentLoaded', () => {
    cargarConfiguracionGlobal();
    inicializarClientes();
    inicializarProductos();
});

/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas (pos-core.js)
 */

import { 
    collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc,
    query, orderBy, limit, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
if (!USER_ID) window.location.href = "index.html"; 

// Variables de estado
let productosMaster = [];
let clientesMaster = []; 
let carrito = [];
let proximoNumeroFacturaStr = "000001";
let tasaActual = 1.0; 
let formatoFactura = "ticket";

window.indiceProd = -1;
window.indiceClie = -1;

// ==========================================
// 1. LÓGICA DE FACTURACIÓN Y CONFIGURACIÓN
// ==========================================
async function obtenerUltimoNumeroFactura() {
    try {
        const q = query(collection(db, "usuarios", USER_ID, "ventas"), orderBy("fecha", "desc"), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const ultimoNro = parseInt(snap.docs[0].data().nro_factura) || 0;
            proximoNumeroFacturaStr = (ultimoNro + 1).toString().padStart(6, '0');
        }
        const lbl = document.getElementById('lbl-nro-factura');
        if (lbl) lbl.innerText = proximoNumeroFacturaStr;
    } catch (e) { console.error("Error factura:", e); }
}

async function cargarConfiguracionGlobal() {
    try {
        const snap = await getDoc(doc(db, "usuarios", USER_ID));
        if (snap.exists()) {
            tasaActual = snap.data().tasa_bcv || 1.0;
            formatoFactura = snap.data().formato_factura || "ticket";
            const spanTasa = document.getElementById('txt-tasa');
            if (spanTasa) spanTasa.innerText = tasaActual.toLocaleString('es-VE', {minimumFractionDigits: 2});
        }
    } catch (e) { console.error("Error config:", e); }
}

// ==========================================
// 2. REGISTRAR VENTA (CON NOMBRE DE CLIENTE)
// ==========================================
window.registrarVenta = async () => {
    const nombreCliente = document.getElementById('buscar-cliente-pos')?.value || "Cliente Genérico";
    
    if (carrito.length === 0) { alert("El carrito está vacío."); return; }

    try {
        const ventaData = {
            cliente_id: window.clienteSeleccionadoID || "anonimo",
            nombre_cliente: nombreCliente,
            nro_factura: proximoNumeroFacturaStr,
            items: carrito,
            total_usd: window.totalVentaUSD,
            tasa_aplicada: tasaActual,
            formato: formatoFactura,
            pagos: {
                punto_bs: parseFloat(document.getElementById('in-punto-bs')?.value) || 0,
                pago_movil_bs: parseFloat(document.getElementById('in-pagomovil-bs')?.value) || 0,
                efectivo_bs: parseFloat(document.getElementById('in-efectivo-bs')?.value) || 0,
                divisas_usd: parseFloat(document.getElementById('in-divisas-usd')?.value) || 0
            },
            fecha: serverTimestamp()
        };

        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), ventaData);
        alert("✅ Venta registrada: " + proximoNumeroFacturaStr);

        // Limpieza de interfaz
        carrito = [];
        window.clienteSeleccionadoID = null;
        document.getElementById('buscar-cliente-pos').value = '';
        document.getElementById('modalPago').style.display = 'none';
        ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = "0";
        });

        window.actualizarCarritoUI();
        
        // Sincronizar número de factura
        await obtenerUltimoNumeroFactura();

    } catch (error) {
        alert("Error al guardar: " + error.message);
    }
};

// ==========================================
// 3. FUNCIONES AUXILIARES (Buscadores, UI, Navegación)
// ==========================================
function inicializarClientes() {
    onSnapshot(collection(db, "usuarios", USER_ID, "clientes"), (snap) => {
        clientesMaster = [];
        snap.forEach(d => clientesMaster.push({ id: d.id, ...d.data() }));
    });
}

function inicializarProductos() {
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
        productosMaster = [];
        snap.forEach(d => productosMaster.push({ id: d.id, ...d.data() }));
    });
}

window.buscarProducto = (texto) => productosMaster.filter(p => (p.nombre||'').toLowerCase().includes(texto.toLowerCase()));
window.buscarCliente = (texto) => clientesMaster.filter(c => (c.nombre||'').toLowerCase().includes(texto.toLowerCase()));

window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    if (item) item.cantidad++; else carrito.push({ ...p, cantidad: 1 });
    window.actualizarCarritoUI();
};

window.actualizarCarritoUI = () => {
    const container = document.getElementById('lista-carrito');
    if (!container) return;
    container.innerHTML = carrito.map(i => `<div style="padding:10px; border-bottom:1px solid #eee;"><strong>${i.nombre}</strong> x ${i.cantidad} = $${(i.cantidad*i.precio).toFixed(2)}</div>`).join('');
    const total = carrito.reduce((s, i) => s + (i.cantidad * i.precio), 0);
    window.totalVentaUSD = total;
    if(document.getElementById('total-usd')) document.getElementById('total-usd').innerText = `$ ${total.toFixed(2)}`;
};

// ==========================================
// 4. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    await cargarConfiguracionGlobal();
    await obtenerUltimoNumeroFactura();
    inicializarClientes();
    inicializarProductos();
});

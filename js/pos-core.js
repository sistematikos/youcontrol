/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas (pos-core.js)
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

if (!USER_ID) {
    window.location.href = "index.html"; 
}

let productosMaster = [];
let clientesMaster = []; 
let carrito = [];
let proximoNumeroFacturaStr = "000001";
let tasaActual = 1.0; 
let formatoFactura = "ticket";

window.indiceProd = -1;
window.indiceClie = -1;

// ==========================================
// 1. CARGA DE DATOS Y CONFIGURACIÓN
// ==========================================
async function cargarConfiguracionGlobal() {
    try {
        const userDocRef = doc(db, "usuarios", USER_ID);
        const snapConfig = await getDoc(userDocRef);
        if (snapConfig.exists()) {
            const data = snapConfig.data();
            tasaActual = data.tasa_bcv || 1.0;
            formatoFactura = data.formato_factura || "ticket";
            const spanTasa = document.getElementById('txt-tasa');
            if (spanTasa) spanTasa.innerText = tasaActual.toLocaleString('es-VE', {minimumFractionDigits: 2});
        }
    } catch (e) { console.error("Error al cargar configuración:", e); }
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
// 2. MOTORES DE BÚSQUEDA Y SELECCIÓN
// ==========================================
window.buscarProducto = (texto) => {
    const criterio = texto.toLowerCase().trim();
    return !criterio ? [] : productosMaster.filter(p => (p.id?.toLowerCase().includes(criterio) || p.nombre?.toLowerCase().includes(criterio) || p.barras?.toLowerCase().includes(criterio)));
};

window.buscarCliente = (texto) => {
    const criterio = texto.toLowerCase().trim();
    return !criterio ? [] : clientesMaster.filter(c => (c.id?.toLowerCase().includes(criterio) || c.nombre?.toLowerCase().includes(criterio)));
};

window.seleccionarCliente = (id, nombre) => {
    const inputCliente = document.getElementById('buscar-cliente-pos');
    if (inputCliente) inputCliente.value = nombre;
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
// 3. CARRITO Y REGISTRO DE VENTA
// ==========================================
window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    if (item) item.cantidad++; else carrito.push({ ...p, cantidad: 1 });
    window.actualizarCarritoUI();
};

window.registrarVenta = async () => {
    if (carrito.length === 0) return alert("El carrito está vacío.");

    try {
        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), {
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
        });

        alert("✅ Venta registrada: N° " + proximoNumeroFacturaStr);
        
        // Limpieza
        carrito = [];
        window.clienteSeleccionadoID = null;
        window.actualizarCarritoUI();
        document.getElementById('modalPago').style.display = 'none';
        document.getElementById('buscar-cliente-pos').value = '';
        
        // Siguiente factura
        proximoNumeroFacturaStr = (parseInt(proximoNumeroFacturaStr) + 1).toString().padStart(6, '0');
        
        ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = "0";
        });
    } catch (e) { alert("Error al guardar: " + e.message); }
};

// ==========================================
// 4. UI Y BUSCADORES
// ==========================================
function initBuscadores() {
    document.getElementById('buscar-cliente-pos')?.addEventListener('input', (e) => {
        const res = window.buscarCliente(e.target.value);
        const div = document.getElementById('resultados-cliente-pos');
        div.style.display = res.length ? 'block' : 'none';
        div.innerHTML = res.map(c => `<div class="resultado-item" onclick="window.seleccionarCliente('${c.id}', '${c.nombre}')">${c.id} - ${c.nombre}</div>`).join('');
    });

    document.getElementById('buscar-producto-pos')?.addEventListener('input', (e) => {
        const res = window.buscarProducto(e.target.value);
        const div = document.getElementById('resultados-producto-pos');
        div.style.display = res.length ? 'block' : 'none';
        div.innerHTML = res.map(p => `<div class="resultado-item" onclick="window.seleccionarProducto('${p.id}')">${p.nombre} - $${p.precio}</div>`).join('');
    });
}

window.actualizarCarritoUI = () => {
    const cont = document.getElementById('lista-carrito');
    if (!cont) return;
    const totalUSD = carrito.reduce((sum, item) => sum + (item.cantidad * (item.precio || 0)), 0);
    window.totalVentaUSD = totalUSD;
    document.getElementById('total-usd').innerText = `$ ${totalUSD.toFixed(2)}`;
    cont.innerHTML = carrito.map(item => `<div>${item.nombre} - ${item.cantidad}</div>`).join('');
};

document.addEventListener('DOMContentLoaded', () => {
    cargarConfiguracionGlobal().then(() => {
        inicializarClientes();
        inicializarProductos();
        initBuscadores();
    });
});

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
// 1. CARGA Y CONFIGURACIÓN
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
    onSnapshot(collection(db, "usuarios", USER_ID, "clientes"), (snapshot) => {
        clientesMaster = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    });
}

function inicializarProductos() {
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
        productosMaster = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    });
}

// ==========================================
// 2. MOTORES DE BÚSQUEDA Y CARRITO
// ==========================================
window.buscarProducto = (texto) => {
    const crit = texto.toLowerCase().trim();
    return !crit ? [] : productosMaster.filter(p => (p.id+p.nombre+p.barras).toLowerCase().includes(crit));
};

window.buscarCliente = (texto) => {
    const crit = texto.toLowerCase().trim();
    return !crit ? [] : clientesMaster.filter(c => (c.id+c.nombre).toLowerCase().includes(crit));
};

window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    item ? item.cantidad++ : carrito.push({ ...p, cantidad: 1 });
    window.actualizarCarritoUI();
};

// ==========================================
// 3. UI Y LOGICA DE VENTAS
// ==========================================
window.actualizarCarritoUI = () => {
    const cont = document.getElementById('lista-carrito');
    if (!cont) return;
    cont.innerHTML = carrito.map(item => `
        <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
            <div><strong>${item.nombre}</strong><br><small>${item.cantidad} x $${item.precio || 0}</small></div>
            <div>$${(item.cantidad * (item.precio || 0)).toFixed(2)}</div>
        </div>`).join('');
    
    window.totalVentaUSD = carrito.reduce((sum, item) => sum + (item.cantidad * (item.precio || 0)), 0);
    if(document.getElementById('total-usd')) document.getElementById('total-usd').innerText = `$ ${window.totalVentaUSD.toFixed(2)}`;
    if(document.getElementById('total-bs')) document.getElementById('total-bs').innerText = `${(window.totalVentaUSD * tasaActual).toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.`;
};

window.registrarVenta = async () => {
    try {
        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), {
            fecha: serverTimestamp(),
            nro_factura: proximoNumeroFacturaStr,
            total_usd: window.totalVentaUSD,
            tasa: tasaActual,
            items: carrito
        });
        alert("✅ Venta registrada correctamente.");
        carrito = [];
        window.actualizarCarritoUI();
        document.getElementById('modalPago').style.display = 'none';
        proximoNumeroFacturaStr = (parseInt(proximoNumeroFacturaStr) + 1).toString().padStart(6, '0');
    } catch (e) { alert("Error al guardar: " + e.message); }
};

// ==========================================
// 4. INICIALIZACIÓN DE EVENTOS (DOM)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // --- Buscadores ---
    const inputCliente = document.getElementById('buscar-cliente-pos');
    inputCliente?.addEventListener('input', (e) => {
        const res = window.buscarCliente(e.target.value);
        const divRes = document.getElementById('resultados-cliente-pos');
        if (res.length > 0 && e.target.value.trim() !== "") {
            divRes.style.display = 'block';
            divRes.innerHTML = res.map(c => `<div class="resultado-item" style="padding: 10px; cursor: pointer;" onclick="window.seleccionarCliente('${c.id}', '${c.nombre.replace(/'/g, "\\'")}')"><strong>${c.id}</strong> - ${c.nombre}</div>`).join('');
        } else { divRes.style.display = 'none'; }
    });

    const inputProd = document.getElementById('buscar-producto-pos');
    inputProd?.addEventListener('input', (e) => {
        const res = window.buscarProducto(e.target.value);
        const divRes = document.getElementById('resultados-producto-pos');
        if (res.length > 0 && e.target.value.trim() !== "") {
            divRes.style.display = 'block';
            divRes.innerHTML = res.map(p => `<div class="resultado-item" style="padding: 10px; cursor: pointer;" onclick="window.seleccionarProducto('${p.id}')"><strong>${p.nombre}</strong> - $${p.precio}</div>`).join('');
        } else { divRes.style.display = 'none'; }
    });

    // --- Pagos ---
    const camposBs = ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs'];
    const inputDivisas = document.getElementById('in-divisas-usd');

    camposBs.forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            const el = document.getElementById(id);
            const totalBs = (window.totalVentaUSD || 0) * tasaActual;
            const sumOtrosBs = camposBs.filter(c => c !== id).reduce((acc, cId) => acc + (parseFloat(document.getElementById(cId)?.value) || 0), 0);
            const valDiv = (parseFloat(inputDivisas?.value) || 0) * tasaActual;
            el.value = (Math.max(0, totalBs - sumOtrosBs - valDiv)).toFixed(2);
        });
    });

    inputDivisas?.addEventListener('input', function() {
        const totalBs = (window.totalVentaUSD || 0) * tasaActual;
        const valDiv = (parseFloat(this.value) || 0) * tasaActual;
        const sumPM = (parseFloat(document.getElementById('in-punto-bs')?.value) || 0) + (parseFloat(document.getElementById('in-pagomovil-bs')?.value) || 0);
        document.getElementById('in-efectivo-bs').value = (Math.max(0, totalBs - valDiv - sumPM)).toFixed(2);
    });

    // --- Teclado (F4, F5, F6, F9) ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F5') {
            e.preventDefault();
            const modal = document.getElementById('modalPago');
            if (modal && window.getComputedStyle(modal).display !== 'none') {
                if (confirm("¿Refrescar? Se perderá el carrito.")) window.location.reload();
            } else { window.ejecutarF5(); }
        }
        if (['F4','F6','F9'].includes(e.key)) {
            e.preventDefault();
            if(e.key === 'F4') window.ejecutarF4();
            if(e.key === 'F6') window.ejecutarF6();
            if(e.key === 'F9') window.abrirModalCobro();
        }
    }, true);
});

// --- Funciones de soporte ---
window.seleccionarProducto = (id) => {
    window.agregarCarrito(id);
    document.getElementById('buscar-producto-pos').value = '';
    document.getElementById('resultados-producto-pos').style.display = 'none';
};

window.ejecutarF4 = () => { if(carrito.length) { let c = prompt("Cantidad:", carrito[carrito.length-1].cantidad); if(c) { carrito[carrito.length-1].cantidad = parseInt(c); window.actualizarCarritoUI(); } } };
window.ejecutarF5 = () => { if(carrito.length) { let p = prompt("Precio ($):", carrito[carrito.length-1].precio); if(p) { carrito[carrito.length-1].precio = parseFloat(p); window.actualizarCarritoUI(); } } };
window.ejecutarF6 = () => { if(carrito.length) { carrito.pop(); window.actualizarCarritoUI(); } };
window.abrirModalCobro = () => { if(carrito.length) document.getElementById('modalPago').style.display = 'flex'; };

cargarConfiguracionGlobal().then(() => { inicializarClientes(); inicializarProductos(); });

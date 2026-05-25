/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas (pos-core.js)
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
if (!USER_ID) window.location.href = "index.html"; 

// Variables de Estado
let productosMaster = [];
let clientesMaster = []; 
let carrito = [];
let proximoNumeroFacturaStr = "000001";
let tasaActual = 1.0; 

// ==========================================
// 1. CARGA DE DATOS (FIREBASE)
// ==========================================
async function initDatos() {
    const snap = await getDoc(doc(db, "usuarios", USER_ID));
    if (snap.exists()) {
        tasaActual = snap.data().tasa_bcv || 1.0;
        document.getElementById('txt-tasa')?.innerText = tasaActual.toLocaleString('es-VE', {minimumFractionDigits: 2});
    }

    onSnapshot(collection(db, "usuarios", USER_ID, "clientes"), (s) => {
        clientesMaster = s.docs.map(d => ({ id: d.id, ...d.data() }));
    });
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (s) => {
        productosMaster = s.docs.map(d => ({ id: d.id, ...d.data() }));
    });
}

// ==========================================
// 2. MOTORES DE BÚSQUEDA
// ==========================================
window.buscarProducto = (texto) => {
    const c = texto.toLowerCase().trim();
    return !c ? [] : productosMaster.filter(p => (p.nombre+p.id+p.barras).toLowerCase().includes(c));
};

window.buscarCliente = (texto) => {
    const c = texto.toLowerCase().trim();
    return !c ? [] : clientesMaster.filter(cl => (cl.nombre+cl.id).toLowerCase().includes(c));
};

// ==========================================
// 3. LÓGICA DE CARRITO Y VENTAS
// ==========================================
window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    item ? item.cantidad++ : carrito.push({ ...p, cantidad: 1 });
    window.actualizarCarritoUI();
};

window.actualizarCarritoUI = () => {
    const cont = document.getElementById('lista-carrito');
    if (!cont) return;
    cont.innerHTML = carrito.map(i => `
        <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
            <div><strong>${i.nombre}</strong><br><small>${i.cantidad} x $${i.precio || 0}</small></div>
            <div>$${(i.cantidad * (i.precio || 0)).toFixed(2)}</div>
        </div>`).join('');
    
    window.totalVentaUSD = carrito.reduce((s, i) => s + (i.cantidad * (i.precio || 0)), 0);
    document.getElementById('total-usd').innerText = `$ ${window.totalVentaUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(window.totalVentaUSD * tasaActual).toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.`;
};

// ==========================================
// 4. INTEGRACIÓN UI (LISTENERS Y EVENTOS)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initDatos();

    // Listener Buscador Producto
    document.getElementById('buscar-producto-pos')?.addEventListener('input', (e) => {
        const res = window.buscarProducto(e.target.value);
        const div = document.getElementById('resultados-producto-pos');
        if (res.length > 0 && e.target.value.trim() !== "") {
            div.style.display = 'block';
            div.innerHTML = res.map(p => `<div class="resultado-item" style="padding:10px; cursor:pointer;" onclick="window.seleccionarProducto('${p.id}')"><strong>${p.nombre}</strong></div>`).join('');
        } else { div.style.display = 'none'; }
    });

    // Listener Buscador Cliente
    document.getElementById('buscar-cliente-pos')?.addEventListener('input', (e) => {
        const res = window.buscarCliente(e.target.value);
        const div = document.getElementById('resultados-cliente-pos');
        if (res.length > 0 && e.target.value.trim() !== "") {
            div.style.display = 'block';
            div.innerHTML = res.map(c => `<div class="resultado-item" style="padding:10px; cursor:pointer;" onclick="window.seleccionarCliente('${c.id}', '${c.nombre.replace(/'/g, "\\'")}')"><strong>${c.nombre}</strong></div>`).join('');
        } else { div.style.display = 'none'; }
    });

    // Listener Teclado Global (Atajos)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F9') { e.preventDefault(); window.abrirModalCobro(); }
        if (e.key === 'F6') { e.preventDefault(); window.ejecutarF6(); }
    }, true);
});

// Funciones de Selección
window.seleccionarProducto = (id) => {
    window.agregarCarrito(id);
    document.getElementById('buscar-producto-pos').value = '';
    document.getElementById('resultados-producto-pos').style.display = 'none';
};

window.seleccionarCliente = (id, nombre) => {
    document.getElementById('buscar-cliente-pos').value = nombre;
    window.clienteSeleccionadoID = id;
    document.getElementById('resultados-cliente-pos').style.display = 'none';
};

window.abrirModalCobro = () => {
    if (carrito.length > 0) document.getElementById('modalPago').style.display = 'flex';
};

window.ejecutarF6 = () => { if(carrito.length > 0) { carrito.pop(); window.actualizarCarritoUI(); } };

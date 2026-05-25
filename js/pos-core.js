/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas (pos-core.js)
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
if (!USER_ID) window.location.href = "index.html"; 

let productosMaster = [];
let clientesMaster = []; 
let carrito = [];
let tasaActual = 1.0; 

// ==========================================
// 1. CARGA DE DATOS (FIREBASE)
// ==========================================
async function initDatos() {
    try {
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
    } catch (e) { console.error("Error iniciando datos:", e); }
}

// ==========================================
// 2. LÓGICA DE CARRITO Y BÚSQUEDA
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
    document.getElementById('total-usd')?.innerText = `$ ${window.totalVentaUSD.toFixed(2)}`;
    document.getElementById('total-bs')?.innerText = `${(window.totalVentaUSD * tasaActual).toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.`;
};

// ==========================================
// 3. EVENTOS (DOM)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initDatos();

    // Buscador Producto
    document.getElementById('buscar-producto-pos')?.addEventListener('input', (e) => {
        const c = e.target.value.toLowerCase().trim();
        const res = !c ? [] : productosMaster.filter(p => (p.nombre+p.id+p.barras).toLowerCase().includes(c));
        const div = document.getElementById('resultados-producto-pos');
        if (res.length > 0 && c !== "") {
            div.style.display = 'block';
            div.innerHTML = res.map(p => `<div class="resultado-item" style="padding:10px; cursor:pointer;" onclick="window.seleccionarProducto('${p.id}')"><strong>${p.nombre}</strong></div>`).join('');
        } else { div.style.display = 'none'; }
    });

    // Buscador Cliente
    document.getElementById('buscar-cliente-pos')?.addEventListener('input', (e) => {
        const c = e.target.value.toLowerCase().trim();
        const res = !c ? [] : clientesMaster.filter(cl => (cl.nombre+cl.id).toLowerCase().includes(c));
        const div = document.getElementById('resultados-cliente-pos');
        if (res.length > 0 && c !== "") {
            div.style.display = 'block';
            div.innerHTML = res.map(cl => `<div class="resultado-item" style="padding:10px; cursor:pointer;" onclick="window.seleccionarCliente('${cl.id}', '${cl.nombre.replace(/'/g, "\\'")}')"><strong>${cl.nombre}</strong></div>`).join('');
        } else { div.style.display = 'none'; }
    });
});

// ==========================================
// 4. FUNCIONES GLOBALES DE UI
// ==========================================
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

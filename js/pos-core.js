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
    // Configuración
    const snap = await getDoc(doc(db, "usuarios", USER_ID));
    if (snap.exists()) {
        tasaActual = snap.data().tasa_bcv || 1.0;
        document.getElementById('txt-tasa')?.innerText = tasaActual.toLocaleString('es-VE', {minimumFractionDigits: 2});
    }

    // Datos en tiempo real
    onSnapshot(collection(db, "usuarios", USER_ID, "clientes"), (s) => {
        clientesMaster = s.docs.map(d => ({ id: d.id, ...d.data() }));
    });
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (s) => {
        productosMaster = s.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log("Productos cargados:", productosMaster.length);
    });
}

// ==========================================
// 2. LÓGICA DE CARRITO Y BÚSQUEDA
// ==========================================
window.agregarCarrito = (id) => {
    console.log("Intentando añadir ID:", id);
    console.log("Array productosMaster:", productosMaster);
    
    const p = productosMaster.find(x => x.id === id);
    if (!p) {
        alert("Error: Producto no encontrado en memoria.");
        return;
    }
    
    const item = carrito.find(c => c.id === id);
    item ? item.cantidad++ : carrito.push({ ...p, cantidad: 1 });
    window.actualizarCarritoUI();
};

window.buscarProducto = (texto) => {
    const c = texto.toLowerCase().trim();
    return !c ? [] : productosMaster.filter(p => (p.nombre+p.id+p.barras).toLowerCase().includes(c));
};

// ==========================================
// 3. UI Y PAGOS
// ==========================================
window.actualizarCarritoUI = () => {
    const cont = document.getElementById('lista-carrito');
    if (!cont) return;
    cont.innerHTML = carrito.map(i => `<div>${i.nombre} - $${i.precio} (x${i.cantidad})</div>`).join('');
    
    window.totalVentaUSD = carrito.reduce((s, i) => s + (i.cantidad * i.precio), 0);
    document.getElementById('total-usd').innerText = `$ ${window.totalVentaUSD.toFixed(2)}`;
};

// ==========================================
// 4. INICIALIZACIÓN (LISTENER ÚNICO)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initDatos();

    // Listener Buscador Producto
    document.getElementById('buscar-producto-pos')?.addEventListener('input', (e) => {
        const res = window.buscarProducto(e.target.value);
        const div = document.getElementById('resultados-producto-pos');
        if (res.length > 0 && e.target.value.trim() !== "") {
            div.style.display = 'block';
            div.innerHTML = res.map(p => `
                <div class="resultado-item" style="padding:10px; cursor:pointer;" 
                     onclick="window.seleccionarProducto('${p.id}')">
                     ${p.nombre} - $${p.precio}
                </div>`).join('');
        } else { div.style.display = 'none'; }
    });
});

window.seleccionarProducto = (id) => {
    window.agregarCarrito(id);
    document.getElementById('buscar-producto-pos').value = '';
    document.getElementById('resultados-producto-pos').style.display = 'none';
};

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
    } catch (e) { console.error("Error cargando datos:", e); }
}

// ==========================================
// 2. LÓGICA DE BÚSQUEDA Y PAGOS (EL NÚCLEO)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initDatos();

    // BUSCADOR PRODUCTOS
    document.getElementById('buscar-producto-pos')?.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        const res = !val ? [] : productosMaster.filter(p => (p.nombre+p.id+p.barras).toLowerCase().includes(val));
        const div = document.getElementById('resultados-producto-pos');
        if (res.length > 0) {
            div.style.display = 'block';
            div.innerHTML = res.map(p => `<div class="resultado-item" style="padding:10px; cursor:pointer;" onclick="window.seleccionarProducto('${p.id}')"><strong>${p.nombre}</strong></div>`).join('');
        } else { div.style.display = 'none'; }
    });

    // BUSCADOR CLIENTES
    document.getElementById('buscar-cliente-pos')?.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        const res = !val ? [] : clientesMaster.filter(cl => (cl.nombre+cl.id).toLowerCase().includes(val));
        const div = document.getElementById('resultados-cliente-pos');
        if (res.length > 0) {
            div.style.display = 'block';
            div.innerHTML = res.map(cl => `<div class="resultado-item" style="padding:10px; cursor:pointer;" onclick="window.seleccionarCliente('${cl.id}', '${cl.nombre.replace(/'/g, "\\'")}')"><strong>${cl.nombre}</strong></div>`).join('');
        } else { div.style.display = 'none'; }
    });

    // LÓGICA DE PAGOS (LA QUE FUNCIONABA)
    const camposBs = ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs'];
    const inputDivisas = document.getElementById('in-divisas-usd');

    camposBs.forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            const el = document.getElementById(id);
            const totalBs = (window.totalVentaUSD || 0) * tasaActual;
            const valorDivisasBs = (parseFloat(inputDivisas?.value) || 0) * tasaActual;
            const sumOtrosBs = camposBs.filter(c => c !== id).reduce((acc, cId) => acc + (parseFloat(document.getElementById(cId)?.value) || 0), 0);
            const pendiente = totalBs - sumOtrosBs - valorDivisasBs;
            el.value = (pendiente > 0 ? pendiente : 0).toFixed(2);
        });
    });

    inputDivisas?.addEventListener('input', function() {
        const totalBs = (window.totalVentaUSD || 0) * tasaActual;
        const valorDivisasBs = (parseFloat(this.value) || 0) * tasaActual;
        const sumPuntoMovil = (parseFloat(document.getElementById('in-punto-bs')?.value) || 0) + (parseFloat(document.getElementById('in-pagomovil-bs')?.value) || 0);
        const resto = totalBs - valorDivisasBs - sumPuntoMovil;
        document.getElementById('in-efectivo-bs').value = (resto > 0 ? resto : 0).toFixed(2);
    });
});

// ==========================================
// 3. FUNCIONES GLOBALES
// ==========================================
window.seleccionarProducto = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    item ? item.cantidad++ : carrito.push({ ...p, cantidad: 1 });
    window.actualizarCarritoUI();
    document.getElementById('buscar-producto-pos').value = '';
    document.getElementById('resultados-producto-pos').style.display = 'none';
};

window.seleccionarCliente = (id, nombre) => {
    document.getElementById('buscar-cliente-pos').value = nombre;
    window.clienteSeleccionadoID = id;
    document.getElementById('resultados-cliente-pos').style.display = 'none';
};

window.actualizarCarritoUI = () => {
    const cont = document.getElementById('lista-carrito');
    if (!cont) return;
    cont.innerHTML = carrito.map(i => `<div>${i.nombre} - $${i.precio}</div>`).join('');
    window.totalVentaUSD = carrito.reduce((s, i) => s + (i.cantidad * i.precio), 0);
    document.getElementById('total-usd').innerText = `$ ${window.totalVentaUSD.toFixed(2)}`;
};

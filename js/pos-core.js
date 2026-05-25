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

// --- CARGA DE DATOS ---
async function cargarConfiguracionGlobal() {
    try {
        const snap = await getDoc(doc(db, "usuarios", USER_ID));
        if (snap.exists()) {
            tasaActual = snap.data().tasa_bcv || 1.0;
            document.getElementById('txt-tasa').innerText = tasaActual.toLocaleString('es-VE', {minimumFractionDigits: 2});
        }
    } catch (e) { console.error(e); }
}

function inicializarClientes() {
    onSnapshot(collection(db, "usuarios", USER_ID, "clientes"), (s) => {
        clientesMaster = [];
        s.forEach(d => clientesMaster.push({ id: d.id, ...d.data() }));
    });
}

function inicializarProductos() {
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (s) => {
        productosMaster = [];
        s.forEach(d => productosMaster.push({ id: d.id, ...d.data() }));
    });
}

// --- BUSCADORES (Corregidos) ---
window.buscarProducto = (texto) => {
    const crit = texto.toLowerCase().trim();
    return !crit ? [] : productosMaster.filter(p => 
        (p.id||'').toLowerCase().includes(crit) || (p.nombre||'').toLowerCase().includes(crit)
    );
};

window.buscarCliente = (texto) => {
    const crit = texto.toLowerCase().trim();
    return !crit ? [] : clientesMaster.filter(c => 
        (c.id||'').toLowerCase().includes(crit) || (c.nombre||'').toLowerCase().includes(crit)
    );
};

// --- LOGICA UI ---
document.addEventListener('DOMContentLoaded', () => {
    cargarConfiguracionGlobal().then(() => {
        inicializarClientes();
        inicializarProductos();
    });

    document.getElementById('buscar-producto-pos').addEventListener('input', (e) => {
        const res = window.buscarProducto(e.target.value);
        const div = document.getElementById('resultados-producto-pos');
        if(res.length > 0 && e.target.value.trim() !== "") {
            div.style.display = 'block';
            div.innerHTML = res.map(p => `<div class="resultado-item" onclick="window.seleccionarProducto('${p.id}')">${p.nombre}</div>`).join('');
        } else { div.style.display = 'none'; }
    });
});

window.seleccionarProducto = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if(p) {
        carrito.push({...p, cantidad: 1});
        window.actualizarCarritoUI();
        document.getElementById('buscar-producto-pos').value = '';
        document.getElementById('resultados-producto-pos').style.display = 'none';
    }
};

window.actualizarCarritoUI = () => {
    const cont = document.getElementById('lista-carrito');
    cont.innerHTML = carrito.map(i => `<div>${i.nombre} - $${i.precio}</div>`).join('');
};

/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Integrado de Entrada de Mercancía (sys_v3_comp.js)
 * Versión Corregida con UI y Funcionalidad Integrada
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, doc, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- MOTOR DE DETECCIÓN DINÁMICA ---
const USER_ID = localStorage.getItem('youcontrol_empresa_id') || "sUhfZI9Fy3M9UlInTYw2wFWZmB12";

let productosLocales = [];
let tasaActual = 1.00;
let listaCompra = []; // Lista temporal en memoria

// Vinculaciones del DOM
const buscador = document.getElementById('buscador-dinamico');
const dropdown = document.getElementById('dropdown-resultados');
const tablaItems = document.getElementById('tabla-items-compra');
const statusBar = document.getElementById('status-bar-comp');

// Inputs
const inputs = {
    sku: document.getElementById('comp-sku'),
    barras: document.getElementById('comp-barras'),
    nombre: document.getElementById('comp-nombre'),
    costo: document.getElementById('comp-costo'),
    ganancia: document.getElementById('comp-ganancia'),
    precio: document.getElementById('comp-precio'),
    precioBs: document.getElementById('comp-precio-bs'),
    stockViejo: document.getElementById('comp-stock-viejo'),
    cantidad: document.getElementById('comp-cantidad')
};

function mostrarEstado(msg, tipo) {
    if (!statusBar) return;
    statusBar.innerText = msg;
    statusBar.style.display = 'block';
    statusBar.style.backgroundColor = (tipo === 'error') ? '#fee2e2' : '#dcfce7';
}

// ==========================================
// 1. INICIALIZACIÓN Y LÓGICA DE BUSQUEDA
// ==========================================
async function inicializar() {
    const tasaSnap = await getDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"));
    if (tasaSnap.exists()) tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;

    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
        productosLocales = [];
        snap.forEach(d => productosLocales.push({ id: d.id, ...d.data() }));
    });
}

// BUSCADOR
if (buscador) {
    buscador.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        if (!val) { dropdown.style.display = 'none'; return; }
        const filtrados = productosLocales.filter(p => 
            (p.nombre || '').toLowerCase().includes(val) || 
            (p.sku || '').toLowerCase().includes(val)
        );
        
        dropdown.innerHTML = filtrados.map(p => `
            <div class="search-item" onclick="window.seleccionarProducto('${p.id}')">
                ${p.nombre} (Stock: ${p.stock})
            </div>
        `).join('') || `<div class="search-item" onclick="window.prepararNuevoProducto('${val}')">Crear: ${val}</div>`;
        dropdown.style.display = 'block';
    });
}

// ==========================================
// 2. FUNCIONES DE INTERFAZ (EXPUESTAS A WINDOW)
// ==========================================
window.seleccionarProducto = (id) => {
    const p = productosLocales.find(x => x.id === id);
    if (!p) return;
    inputs.sku.value = p.sku || '';
    inputs.nombre.value = p.nombre || '';
    inputs.costo.value = p.costo || 0;
    inputs.ganancia.value = p.ganancia || 0;
    inputs.precio.value = p.precio || 0;
    inputs.stockViejo.value = p.stock || 0;
    dropdown.style.display = 'none';
};

window.prepararNuevoProducto = (val) => {
    inputs.nombre.value = val;
    inputs.sku.value = '';
    inputs.stockViejo.value = '0';
    dropdown.style.display = 'none';
};

window.agregarALista = () => {
    if (!inputs.nombre.value) { mostrarEstado("Nombre requerido", "error"); return; }
    
    const item = {
        nombre: inputs.nombre.value,
        sku: inputs.sku.value,
        cantidad: parseInt(inputs.cantidad.value) || 0,
        costo: parseFloat(inputs.costo.value) || 0,
        precio: parseFloat(inputs.precio.value) || 0
    };
    
    listaCompra.push(item);
    renderizarTabla();
    limpiarFormulario();
};

function renderizarTabla() {
    if (!tablaItems) return;
    tablaItems.innerHTML = listaCompra.map((item, i) => `
        <tr>
            <td>${item.nombre}</td>
            <td>${item.cantidad}</td>
            <td>$${item.precio}</td>
            <td><button onclick="listaCompra.splice(${i},1); renderizarTabla()">X</button></td>
        </tr>
    `).join('');
}

// ==========================================
// 3. GUARDADO EN FIRESTORE
// ==========================================
window.procesarIngresoMercancia = async () => {
    if (listaCompra.length === 0) { mostrarEstado("Lista vacía", "error"); return; }

    try {
        for (const item of listaCompra) {
            const id = doc(collection(db, "temp")).id; // Genera ID nuevo si no existe
            await setDoc(doc(db, "usuarios", USER_ID, "productos", id), {
                nombre: item.nombre,
                sku: item.sku,
                costo: item.costo,
                precio: item.precio,
                stock: item.cantidad // Ajustar según lógica de stock actual
            }, { merge: true });
        }
        mostrarEstado("✅ Éxito", "success");
        listaCompra = [];
        renderizarTabla();
    } catch (e) {
        mostrarEstado("Error: " + e.message, "error");
    }
};

function limpiarFormulario() {
    inputs.nombre.value = '';
    inputs.cantidad.value = '0';
}

document.addEventListener('DOMContentLoaded', inicializar);

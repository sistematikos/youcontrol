/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Entrada de Mercancía (Multi-Empresa)
 * Sincronizado automáticamente con: usuarios/[ID_EMPRESA]/productos/
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- DINAMISMO: Obtiene el ID desde el navegador del usuario ---
const USER_ID = localStorage.getItem('youcontrol_empresa_id'); 
let productosLocales = [];
let tasaActual = 1.00;
let listaCompra = [];

// Elementos DOM
const el = {
    buscador: document.getElementById('buscador-dinamico'),
    dropdown: document.getElementById('dropdown-resultados'),
    tabla: document.getElementById('tabla-items-compra'),
    statusBar: document.getElementById('status-bar-comp'),
    sku: document.getElementById('comp-sku'),
    nombre: document.getElementById('comp-nombre'),
    costo: document.getElementById('comp-costo'),
    ganancia: document.getElementById('comp-ganancia'),
    precio: document.getElementById('comp-precio'),
    precioBs: document.getElementById('comp-precio-bs'),
    stockViejo: document.getElementById('comp-stock-viejo'),
    cantidad: document.getElementById('comp-cantidad')
};

async function inicializar() {
    if (!USER_ID) {
        alert("Error: No se encontró ID de empresa. Inicie sesión nuevamente.");
        return;
    }

    try {
        const tasaSnap = await getDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"));
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
            document.getElementById('txt-tasa').innerText = tasaActual.toFixed(2).replace('.', ',') + " Bs.";
        }
        
        onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
            productosLocales = [];
            snap.forEach(d => productosLocales.push({ id: d.id, ...d.data() }));
        });
    } catch (e) { console.error("Error de carga:", e); }
}

// Lógica de Precios
window.calcularPrecios = () => {
    const c = parseFloat(el.costo.value) || 0;
    const g = parseFloat(el.ganancia.value) || 0;
    const p = c + (c * (g / 100));
    el.precio.value = p.toFixed(2);
    el.precioBs.value = (p * tasaActual).toFixed(2).replace('.', ',') + " Bs.";
};

// Buscador
el.buscador.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    const filtrados = productosLocales.filter(p => p.nombre?.toLowerCase().includes(val));
    el.dropdown.innerHTML = filtrados.map(p => `
        <div class="search-item" onclick="window.cargarProducto('${p.id}')">${p.nombre}</div>
    `).join('');
    el.dropdown.style.display = filtrados.length ? 'block' : 'none';
});

window.cargarProducto = (id) => {
    const p = productosLocales.find(x => x.id === id);
    el.sku.value = p.sku; el.nombre.value = p.nombre; el.costo.value = p.costo;
    el.ganancia.value = p.ganancia; el.precio.value = p.precio; el.stockViejo.value = p.stock;
    el.dropdown.style.display = 'none';
    window.calcularPrecios();
};

// Lista
window.agregarALista = () => {
    listaCompra.push({
        sku: el.sku.value || "S/SKU", nombre: el.nombre.value, 
        cant: el.cantidad.value, precio: el.precio.value
    });
    
    el.tabla.innerHTML = listaCompra.map((item, i) => `
        <tr><td>${item.sku}</td><td>${item.nombre}</td><td>${item.cant}</td><td>$${item.precio}</td>
        <td><button onclick="listaCompra.splice(${i},1); renderizarTabla()">X</button></td></tr>
    `).join('');
};

window.renderizarTabla = () => {
    el.tabla.innerHTML = listaCompra.map((item, i) => `
        <tr><td>${item.sku}</td><td>${item.nombre}</td><td>${item.cant}</td><td>$${item.precio}</td>
        <td><button onclick="listaCompra.splice(${i},1); window.renderizarTabla()">X</button></td></tr>
    `).join('');
};

// Guardado Dinámico
window.procesarIngreso = async () => {
    if (listaCompra.length === 0) return alert("La lista está vacía");
    
    for (const item of listaCompra) {
        // Guarda en la ruta dinámica del usuario logueado
        await setDoc(doc(db, "usuarios", USER_ID, "productos", item.sku || "prod_" + Date.now()), item, { merge: true });
    }
    alert("Entrada guardada en tu inventario.");
    listaCompra = [];
    window.renderizarTabla();
};

el.costo.addEventListener('input', window.calcularPrecios);
el.ganancia.addEventListener('input', window.calcularPrecios);
document.addEventListener('DOMContentLoaded', inicializar);

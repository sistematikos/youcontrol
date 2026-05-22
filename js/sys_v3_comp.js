/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Integrado de Entrada de Mercancía (sys_v3_comp.js)
 * Versión Corregida: Integración total con botones y cálculos
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURACIÓN DINÁMICA ---
const USER_ID = localStorage.getItem('youcontrol_empresa_id') || "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let productosLocales = [];
let tasaActual = 1.00;
let listaTemporal = []; // Para la lista de la derecha

// --- ELEMENTOS DOM ---
const el = {
    buscador: document.getElementById('buscador-dinamico'),
    dropdown: document.getElementById('dropdown-resultados'),
    tabla: document.getElementById('tabla-items-compra'),
    costo: document.getElementById('comp-costo'),
    ganancia: document.getElementById('comp-ganancia'),
    precio: document.getElementById('comp-precio'),
    precioBs: document.getElementById('comp-precio-bs'),
    nombre: document.getElementById('comp-nombre'),
    sku: document.getElementById('comp-sku'),
    barras: document.getElementById('comp-barras'),
    cantidad: document.getElementById('comp-cantidad'),
    stockViejo: document.getElementById('comp-stock-viejo')
};

// --- 1. INICIALIZACIÓN ---
async function inicializar() {
    const tasaSnap = await getDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"));
    if (tasaSnap.exists()) tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;

    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
        productosLocales = [];
        snap.forEach(d => productosLocales.push({ id: d.id, ...d.data() }));
    });
}

// --- 2. CÁLCULOS (Exponer a ventana) ---
window.calcularPrecios = () => {
    const c = parseFloat(el.costo.value) || 0;
    const g = parseFloat(el.ganancia.value) || 0;
    const p = c + (c * (g / 100));
    el.precio.value = p.toFixed(2);
    el.precioBs.value = (p * tasaActual).toFixed(2).replace('.', ',') + " Bs.";
};

// --- 3. BUSCADOR Y SELECCIÓN ---
el.buscador.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    if (!val) { el.dropdown.style.display = 'none'; return; }
    
    const filtrados = productosLocales.filter(p => 
        p.nombre?.toLowerCase().includes(val) || p.sku?.toLowerCase().includes(val)
    );

    el.dropdown.innerHTML = filtrados.map(p => `
        <div class="search-item" onclick="window.cargarProducto('${p.id}')">${p.nombre}</div>
    `).join('') || `<div class="search-item" onclick="window.nuevoProducto('${val}')">Crear: ${val}</div>`;
    el.dropdown.style.display = 'block';
});

window.cargarProducto = (id) => {
    const p = productosLocales.find(x => x.id === id);
    el.nombre.value = p.nombre; el.sku.value = p.sku; el.costo.value = p.costo;
    el.ganancia.value = p.ganancia; el.precio.value = p.precio; el.stockViejo.value = p.stock;
    el.dropdown.style.display = 'none';
    window.calcularPrecios();
};

window.nuevoProducto = (val) => {
    el.nombre.value = val; el.costo.value = '0'; el.ganancia.value = '0';
    el.precio.value = '0'; el.stockViejo.value = '0';
    el.dropdown.style.display = 'none';
};

// --- 4. LISTA Y GUARDADO ---
window.agregarALista = () => {
    const item = {
        nombre: el.nombre.value,
        sku: el.sku.value,
        cant: el.cantidad.value,
        precio: el.precio.value,
        costo: el.costo.value,
        stockViejo: el.stockViejo.value
    };
    listaTemporal.push(item);
    
    el.tabla.innerHTML += `<tr>
        <td>${item.sku}</td><td>${item.nombre}</td><td>${item.cant}</td><td>$${item.precio}</td>
        <td><button onclick="this.parentElement.parentElement.remove()">X</button></td>
    </tr>`;
};

window.procesarIngreso = async () => {
    for (const item of listaTemporal) {
        const id = doc(collection(db, "temp")).id;
        await setDoc(doc(db, "usuarios", USER_ID, "productos", id), {
            nombre: item.nombre, sku: item.sku,
            costo: parseFloat(item.costo), precio: parseFloat(item.precio),
            stock: parseInt(item.stockViejo) + parseInt(item.cant)
        }, { merge: true });
    }
    alert("Procesado con éxito");
    listaTemporal = [];
    el.tabla.innerHTML = "";
};

// Eventos de cálculo
el.costo.addEventListener('input', window.calcularPrecios);
el.ganancia.addEventListener('input', window.calcularPrecios);

document.addEventListener('DOMContentLoaded', inicializar);

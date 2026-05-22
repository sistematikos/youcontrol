/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Entrada de Mercancía (sys_v3_comp.js)
 * Corrección de eventos y cálculos en tiempo real
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURACIÓN DINÁMICA ---
const USER_ID = localStorage.getItem('youcontrol_empresa_id') || "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let productosLocales = [];
let tasaActual = 1.00;

// --- ELEMENTOS DEL DOM ---
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

// --- 2. CÁLCULOS AUTOMÁTICOS ---
window.calcularPrecios = () => {
    const costo = parseFloat(el.costo.value) || 0;
    const ganancia = parseFloat(el.ganancia.value) || 0;
    const pUsd = costo + (costo * (ganancia / 100));
    el.precio.value = pUsd.toFixed(2);
    el.precioBs.value = (pUsd * tasaActual).toFixed(2) + " Bs.";
};

// --- 3. BUSCADOR Y SELECCIÓN ---
if (el.buscador) {
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
}

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
    const fila = `<tr>
        <td>${el.sku.value || 'N/A'}</td>
        <td>${el.nombre.value}</td>
        <td>${el.cantidad.value}</td>
        <td>$${el.precio.value}</td>
        <td><button onclick="this.parentElement.parentElement.remove()">X</button></td>
    </tr>`;
    el.tabla.innerHTML += fila;
};

window.procesarIngreso = async () => {
    const id = doc(collection(db, "temp")).id;
    await setDoc(doc(db, "usuarios", USER_ID, "productos", id), {
        nombre: el.nombre.value,
        sku: el.sku.value,
        costo: parseFloat(el.costo.value),
        precio: parseFloat(el.precio.value),
        stock: parseInt(el.stockViejo.value) + parseInt(el.cantidad.value)
    }, { merge: true });
    alert("Producto guardado correctamente");
};

// Eventos para calculos en tiempo real
el.costo.addEventListener('input', window.calcularPrecios);
el.ganancia.addEventListener('input', window.calcularPrecios);

document.addEventListener('DOMContentLoaded', inicializar);

/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Integrado de Entrada de Mercancía (sys_v3_comp.js)
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id'); 

let productosLocales = [];
let listaTemporal = []; 
let tasaActual = 1.00;

// Vinculaciones del DOM
const buscador = document.getElementById('buscador-dinamico');
const dropdown = document.getElementById('dropdown-resultados');
const aviso = document.getElementById('aviso-no-registrado'); // ID nuevo
const txtTasa = document.getElementById('txt-tasa');
const inputSku = document.getElementById('comp-sku');
const inputBarras = document.getElementById('comp-barras');
const inputNombre = document.getElementById('comp-nombre');
const inputCosto = document.getElementById('comp-costo');
const inputGanancia = document.getElementById('comp-ganancia');
const inputPrecio = document.getElementById('comp-precio');
const inputPrecioBs = document.getElementById('comp-precio-bs');
const inputStockViejo = document.getElementById('comp-stock-viejo');
const inputCantidad = document.getElementById('comp-cantidad');
const inputFecha = document.getElementById('comp-fecha');
const statusBar = document.getElementById('status-bar-comp');

function mostrarEstado(mensaje, tipo) {
    if (!statusBar) return;
    statusBar.className = `status-${tipo}`;
    statusBar.innerText = mensaje;
    statusBar.style.display = 'block';
    if (tipo === 'success') setTimeout(() => { statusBar.style.display = 'none'; }, 3000);
}

// 1. INICIALIZACIÓN
async function inicializarEntradaMercancia() {
    if (!USER_ID) return;
    
    try {
        const userSnap = await getDoc(doc(db, "usuarios", USER_ID));
        if (userSnap.exists() && userSnap.data().tasa_bcv) {
            tasaActual = parseFloat(userSnap.data().tasa_bcv) || 1.00;
        }

        onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
            productosLocales = [];
            snapshot.forEach(doc => productosLocales.push({ id: doc.id, ...doc.data() }));
        });
    } catch (e) {
        console.error("Error al cargar datos:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    if (inputFecha) inputFecha.value = hoy;

    if (inputCosto) inputCosto.addEventListener('input', window.calcularPreciosCompra);
    if (inputGanancia) inputGanancia.addEventListener('input', window.calcularPreciosCompra);
    if (inputPrecio) inputPrecio.addEventListener('input', window.calcularGananciaCompra);

    inicializarEntradaMercancia();
});

// 2. BUSCADOR (Evento Enter y Teclado)
buscador.addEventListener('input', (e) => {
    const criterio = e.target.value.trim().toLowerCase();
    if (!criterio) { dropdown.style.display = 'none'; return; }
    const filtrados = productosLocales.filter(p => 
        (p.barras || '').toLowerCase().includes(criterio) || 
        (p.sku || '').toLowerCase().includes(criterio) || 
        (p.nombre || '').toLowerCase().includes(criterio)
    );
    renderizarDropdown(filtrados);
});

buscador.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const criterio = buscador.value.trim();
        const producto = productosLocales.find(p => p.sku === criterio || p.barras === criterio);
        
        if (!producto) {
            aviso.style.display = 'block';
            inputSku.value = criterio;
            buscador.value = '';
            inputNombre.focus();
        } else {
            aviso.style.display = 'none';
            seleccionarProducto(producto);
        }
    }
});

function renderizarDropdown(productos) {
    dropdown.innerHTML = '';
    productos.forEach(p => {
        const item = document.createElement('div');
        item.className = 'search-item';
        item.innerHTML = `<div>${p.nombre}</div><small>SKU: ${p.sku}</small>`;
        item.onclick = () => { aviso.style.display = 'none'; seleccionarProducto(p); };
        dropdown.appendChild(item);
    });
    dropdown.style.display = 'block';
}

function seleccionarProducto(producto) {
    inputSku.value = producto.sku || ''; inputBarras.value = producto.barras || '';
    inputNombre.value = producto.nombre || ''; inputCosto.value = (producto.costo || 0).toFixed(2);
    inputGanancia.value = (producto.ganancia || 0).toFixed(1); inputPrecio.value = (producto.precio || 0).toFixed(2);
    inputStockViejo.value = producto.stock || 0;
    dropdown.style.display = 'none'; 
    window.calcularPreciosCompra();
}

// 3. MATEMÁTICA
window.calcularPreciosCompra = () => {
    const costo = parseFloat(inputCosto.value) || 0;
    const ganancia = parseFloat(inputGanancia.value) || 0;
    const precioUsd = costo + (costo * (ganancia / 100));
    inputPrecio.value = precioUsd.toFixed(2);
    inputPrecioBs.value = (precioUsd * tasaActual).toFixed(2).replace('.', ',') + " Bs.";
};

window.calcularGananciaCompra = () => {
    const costo = parseFloat(inputCosto.value) || 0;
    const precio = parseFloat(inputPrecio.value) || 0;
    if (costo > 0) inputGanancia.value = (((precio - costo) / costo) * 100).toFixed(1);
    inputPrecioBs.value = (precio * tasaActual).toFixed(2).replace('.', ',') + " Bs.";
};

window.calcularDesdeBs = () => {
    const valorBs = parseFloat(inputPrecioBs.value.replace(',', '.')) || 0;
    if (tasaActual > 0 && valorBs > 0) {
        const precioUsd = valorBs / tasaActual;
        inputPrecio.value = precioUsd.toFixed(2);
        const costo = parseFloat(inputCosto.value) || 0;
        if (costo > 0) inputGanancia.value = (((precioUsd - costo) / costo) * 100).toFixed(1);
    } else if (valorBs === 0) { inputPrecio.value = ''; }
};

// 4. LÓGICA DE LISTA
window.agregarALista = function() {
    const sku = inputSku.value.trim();
    const nombre = inputNombre.value.trim();
    const cant = parseInt(inputCantidad.value) || 0;
    const precio = parseFloat(inputPrecio.value) || 0;

    if (!nombre || cant <= 0 || !sku) return mostrarEstado("❌ Datos incompletos", "loading");

    listaTemporal.push({ sku, nombre, cant, precio, barras: inputBarras.value, costo: inputCosto.value, ganancia: inputGanancia.value });
    renderizarTabla();
    limpiarFormulario();
};

function renderizarTabla() {
    const tbody = document.getElementById('tabla-items-compra');
    tbody.innerHTML = listaTemporal.map((item, index) => `
        <tr><td>${item.sku}</td><td>${item.nombre}</td><td>${item.cant}</td><td>$${item.precio}</td>
        <td><button onclick="window.eliminarDeLista(${index})" style="color:red; cursor:pointer; background:none; border:none;">X</button></td></tr>
    `).join('');
}

window.eliminarDeLista = (index) => { listaTemporal.splice(index, 1); renderizarTabla(); };

window.procesarIngresoMercancia = async () => {
    if (listaTemporal.length === 0) return mostrarEstado("⚠️ Lista vacía", "loading");
    for (const item of listaTemporal) {
        await setDoc(doc(db, "usuarios", USER_ID, "productos", item.sku), {
            sku: item.sku, nombre: item.nombre, costo: parseFloat(item.costo),
            ganancia: parseFloat(item.ganancia), precio: parseFloat(item.precio),
            stock: (productosLocales.find(p=>p.sku===item.sku)?.stock || 0) + item.

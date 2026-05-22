/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Integrado de Entrada de Mercancía (sys_v3_comp.js)
 * Sincronizado al 100% con Cloud Firestore de Inventario Pro
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, doc, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CAMBIO DINÁMICO: Obtiene el ID automáticamente ---
const USER_ID = localStorage.getItem('youcontrol_empresa_id'); 

let productosLocales = [];
let listaTemporal = []; // NUEVA LISTA TEMPORAL
let tasaActual = 1.00;

// Vinculaciones del DOM
const buscador = document.getElementById('buscador-dinamico');
const dropdown = document.getElementById('dropdown-resultados');
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

// Mensajes de Alerta
function mostrarEstado(mensaje, tipo) {
    if (!statusBar) return;
    statusBar.className = `status-${tipo}`;
    statusBar.innerText = mensaje;
    statusBar.style.display = 'block';
    if (tipo === 'success') {
        setTimeout(() => { statusBar.style.display = 'none'; }, 3000);
    }
}

// ==========================================
// 1. INICIALIZACIÓN Y ESCUCHA FIRESTORE
// ==========================================
async function inicializarEntradaMercancia() {
    if (!USER_ID) {
        mostrarEstado("❌ Error: No se detectó ID de empresa.", "loading");
        return;
    }
    
    mostrarEstado("⏳ Conectando con el inventario...", "loading");
    try {
        const tasaSnap = await getDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"));
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
            if (txtTasa) {
                txtTasa.innerText = tasaActual.toFixed(2).replace('.', ',') + " Bs.";
            }
        }

        onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
            productosLocales = [];
            snapshot.forEach(doc => {
                productosLocales.push({ id: doc.id, ...doc.data() });
            });
            mostrarEstado("✅ Inventario sincronizado.", "success");
        });

    } catch (e) {
        console.error("Error al enlazar Firestore:", e);
        mostrarEstado("❌ Error de comunicación con la DB.", "loading");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    if (inputFecha) inputFecha.value = hoy;

    if (inputCosto) inputCosto.addEventListener('input', window.calcularPreciosCompra);
    if (inputGanancia) inputGanancia.addEventListener('input', window.calcularPreciosCompra);
    if (inputPrecio) inputPrecio.addEventListener('input', window.calcularGananciaCompra);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'F9') {
            e.preventDefault();
            window.procesarIngresoMercancia();
        }
    });

    inicializarEntradaMercancia();
    if (buscador) buscador.focus();
});

// ==========================================
// 2. BUSCADOR Y SELECCIÓN
// ==========================================
if (buscador) {
    buscador.addEventListener('input', (e) => {
        const criterio = e.target.value.trim().toLowerCase();
        if (!criterio) {
            dropdown.style.display = 'none';
            return;
        }
        const filtrados = productosLocales.filter(p => {
            const barras = (p.barras || '').toLowerCase();
            const sku = (p.sku || '').toLowerCase();
            const nombre = (p.nombre || '').toLowerCase();
            return barras.includes(criterio) || sku.includes(criterio) || nombre.includes(criterio);
        });
        renderizarDropdown(filtrados, e.target.value);
    });
}

function renderizarDropdown(productos, textoBuscado) {
    if (!dropdown) return;
    dropdown.innerHTML = '';
    if (productos.length === 0) {
        dropdown.innerHTML = `<div class="no-products-alert" onclick="window.prepararNuevoProducto('${textoBuscado}')">
            <i class="fas fa-plus-circle"></i> Producto no existe. ¿Crearlo?</div>`;
    } else {
        productos.forEach(p => {
            const item = document.createElement('div');
            item.className = 'search-item';
            item.innerHTML = `<div class="item-info"><span class="item-name">${p.nombre}</span>
                <span class="item-meta">SKU: ${p.sku}</span></div><span class="item-stock">Stock: ${p.stock || 0}</span>`;
            item.onclick = () => seleccionarProducto(p);
            dropdown.appendChild(item);
        });
    }
    dropdown.style.display = 'block';
}

function seleccionarProducto(producto) {
    inputSku.value = producto.sku || '';
    inputBarras.value = producto.barras || '';
    inputNombre.value = producto.nombre || '';
    inputCosto.value = (producto.costo || 0).toFixed(2);
    inputGanancia.value = (producto.ganancia || 0).toFixed(1);
    inputPrecio.value = (producto.precio || 0).toFixed(2);
    inputStockViejo.value = producto.stock || 0;
    inputCantidad.value = '0';
    inputCantidad.focus();
    dropdown.style.display = 'none';
    if (buscador) buscador.value = '';
    window.calcularPreciosCompra();
}

window.prepararNuevoProducto = function(textoBuscado) {
    inputSku.value = textoBuscado.toUpperCase();
    inputNombre.value = textoBuscado;
    inputCantidad.value = '1';
    dropdown.style.display = 'none';
    inputSku.focus();
};

document.addEventListener('click', (e) => {
    if (dropdown && !e.target.closest('.search-wrapper')) dropdown.style.display = 'none';
});

// ==========================================
// 3. MATEMÁTICA Y LISTA TEMPORAL
// ==========================================
window.calcularPreciosCompra = function() {
    const costo = parseFloat(inputCosto.value) || 0;
    const ganancia = parseFloat(inputGanancia.value) || 0;
    const precioUsd = costo + (costo * (ganancia / 100));
    inputPrecio.value = precioUsd.toFixed(2);
    inputPrecioBs.value = (precioUsd * tasaActual).toFixed(2).replace('.', ',') + " Bs.";
};

window.calcularGananciaCompra = function() {
    const costo = parseFloat(inputCosto.value) || 0;
    const precio = parseFloat(inputPrecio.value) || 0;
    if (costo > 0) inputGanancia.value = (((precio - costo) / costo) * 100).toFixed(1);
    inputPrecioBs.value = (precio * tasaActual).toFixed(2).replace('.', ',') + " Bs.";
};

window.agregarALista = function() {
    const sku = inputSku.value.trim();
    const nombre = inputNombre.value.trim();
    const cantidad = parseInt(inputCantidad.value) || 0;
    const precio = parseFloat(inputPrecio.value) || 0;
    const stockViejo = parseInt(inputStockViejo.value) || 0;

    if (!sku || !nombre || cantidad <= 0) return mostrarEstado("❌ SKU, nombre y cantidad obligatorios", "loading");

    listaTemporal.push({ 
        sku, nombre, cantidad, precio, stockViejo,
        barras: inputBarras.value,
        costo: inputCosto.value,
        ganancia: inputGanancia.value
    });

    renderizarTabla();
    limpiarFormulario();
};

function renderizarTabla() {
    const tbody = document.getElementById('tabla-items-compra');
    if (!tbody) return;
    tbody.innerHTML = listaTemporal.map((item, index) => `
        <tr>
            <td>${item.sku}</td><td>${item.nombre}</td><td>${item.cantidad}</td><td>$${item.precio}</td>
            <td><button onclick="window.eliminar

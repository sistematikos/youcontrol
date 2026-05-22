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

// ==========================================
// 1. INICIALIZACIÓN
// ==========================================
async function inicializar() {
    if (!USER_ID) return;
    
    // Cargar Tasa
    const tasaSnap = await getDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"));
    if (tasaSnap.exists()) tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;

    // Escuchar Inventario
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
        productosLocales = [];
        snapshot.forEach(doc => productosLocales.push({ id: doc.id, ...doc.data() }));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    inicializar();
    if (inputFecha) inputFecha.value = new Date().toISOString().split('T')[0];
});

// ==========================================
// 2. LÓGICA DE LISTA (EXPUESTA A WINDOW)
// ==========================================

window.agregarALista = function() {
    const sku = inputSku.value.trim();
    const nombre = inputNombre.value.trim();
    const cantidad = parseInt(inputCantidad.value) || 0;
    const precio = parseFloat(inputPrecio.value) || 0;

    if (!sku || !nombre || cantidad <= 0) return alert("Completa los datos correctamente.");

    listaTemporal.push({ 
        sku, nombre, cantidad, precio,
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
            <td><button onclick="window.eliminarDeLista(${index})" style="color:red; cursor:pointer; background:none; border:none;">X</button></td>
        </tr>
    `).join('');
}

window.eliminarDeLista = function(index) {
    listaTemporal.splice(index, 1);
    renderizarTabla();
};

window.procesarIngresoMercancia = async function() {
    if (listaTemporal.length === 0) return alert("La lista está vacía.");

    mostrarEstado("⏳ Guardando...", "loading");
    try {
        for (const item of listaTemporal) {
            const prodExistente = productosLocales.find(p => p.sku === item.sku);
            const idDoc = prodExistente ? prodExistente.id : ("prod_" + item.sku);
            const stockActual = prodExistente ? (parseInt(prodExistente.stock) || 0) : 0;

            await setDoc(doc(db, "usuarios", USER_ID, "productos", idDoc), {
                sku: item.sku, barras: item.barras, nombre: item.nombre,
                costo: parseFloat(item.costo), ganancia: parseFloat(item.ganancia),
                precio: parseFloat(item.precio), stock: stockActual + item.cantidad,
                ultima_actualizacion: inputFecha.value
            }, { merge: true });
        }
        mostrarEstado("✅ Éxito.", "success");
        listaTemporal = [];
        renderizarTabla();
    } catch (e) {
        alert("Error al guardar.");
    }
};

function limpiarFormulario() {
    inputSku.value = ''; inputBarras.value = ''; inputNombre.value = '';
    inputCosto.value = '0.00'; inputGanancia.value = '0.0'; inputPrecio.value = '0.00';
    inputStockViejo.value = '0'; inputCantidad.value = '0';
    if (buscador) { buscador.value = ''; buscador.focus(); }
}

// Cálculos automáticos
window.calcularPreciosCompra = function() {
    const c = parseFloat(inputCosto.value) || 0;
    const g = parseFloat(inputGanancia.value) || 0;
    inputPrecio.value = (c + (c * (g / 100))).toFixed(2);
};
if (inputCosto) inputCosto.addEventListener('input', window.calcularPreciosCompra);
if (inputGanancia) inputGanancia.addEventListener('input', window.calcularPreciosCompra);

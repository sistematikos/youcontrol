/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Integrado de Entrada de Mercancía (sys_v3_comp.js)
 * Sincronizado dinámicamente con Firestore según ID de usuario
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, doc, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- MOTOR DE DETECCIÓN DINÁMICA ---
const getEmpresaId = () => {
    const idGuardado = localStorage.getItem('youcontrol_empresa_id');
    const idRespaldo = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; 
    return idGuardado || idRespaldo;
};

const USER_ID = getEmpresaId();
let productosLocales = [];
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
    statusBar.style.backgroundColor = (tipo === 'error') ? '#f8d7da' : '#d4edda';
    if (tipo === 'success') {
        setTimeout(() => { statusBar.style.display = 'none'; }, 3000);
    }
}

// ==========================================
// 1. INICIALIZACIÓN Y ESCUCHA FIRESTORE
// ==========================================
async function inicializarEntradaMercancia() {
    mostrarEstado("⏳ Conectando con usuario: " + USER_ID, "loading");
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
        mostrarEstado("❌ Error de comunicación: " + e.message, "error");
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
// 2. BUSCADOR DINÁMICO PREDICTIVO
// ==========================================
if (buscador) {
    buscador.addEventListener('input', (e) => {
        const criterio = e.target.value.trim().toLowerCase();
        if (!criterio) { dropdown.style.display = 'none'; return; }
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
        dropdown.innerHTML = `<div class="no-products-alert" onclick="window.prepararNuevoProducto('${textoBuscado}')"><i class="fas fa-plus-circle"></i> Crear nuevo producto</div>`;
    } else {
        productos.forEach(p => {
            const item = document.createElement('div');
            item.className = 'search-item';
            item.innerHTML = `<div><span>${p.nombre || 'Sin nombre'}</span><br><small>SKU: ${p.sku || 'N/A'}</small></div><span>Stock: ${p.stock || 0}</span>`;
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
    dropdown.style.display = 'none';
    if (buscador) buscador.value = '';
    window.calcularPreciosCompra();
}

// ==========================================
// 3. MATEMÁTICA Y CONVERSIÓN
// ==========================================
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

// ==========================================
// 4. PROCESAR ENTRADA CON RUTA DINÁMICA
// ==========================================
window.procesarIngresoMercancia = async () => {
    const sku = inputSku.value.trim();
    const barras = inputBarras.value.trim();
    const nombre = inputNombre.value.trim();
    const cantidadEntrante = parseInt(inputCantidad.value) || 0;
    const stockViejo = parseInt(inputStockViejo.value) || 0;

    if (!nombre) { mostrarEstado("❌ La descripción es obligatoria.", "error"); return; }
    if (cantidadEntrante <= 0) { mostrarEstado("❌ Ingrese cantidad válida.", "error"); return; }

    mostrarEstado("⏳ Registrando en: " + USER_ID, "loading");

    const datos = {
        sku: sku,
        barras: barras,
        nombre: nombre,
        costo: parseFloat(inputCosto.value) || 0,
        ganancia: parseFloat(inputGanancia.value) || 0,
        precio: parseFloat(inputPrecio.value) || 0,
        stock: stockViejo + cantidadEntrante,
        ultima_actualizacion: inputFecha.value
    };

    try {
        const prodExistente = productosLocales.find(p => p.sku === sku || (barras && p.barras === barras));
        const idDocumento = prodExistente ? prodExistente.id : (sku || barras || doc(collection(db, "temp")).id);

        // Escritura en la RUTA DINÁMICA correcta
        await setDoc(doc(db, "usuarios", USER_ID, "productos", idDocumento), datos, { merge: true });
        
        mostrarEstado(`✅ Entrada exitosa.`, "success");
        limpiarFormulario();
    } catch (e) {
        mostrarEstado("❌ Error al guardar: " + e.message, "error");
    }
};

function limpiarFormulario() {
    inputSku.value = ''; inputBarras.value = ''; inputNombre.value = '';
    inputCosto.value = '0.00'; inputGanancia.value = '0.0'; inputPrecio.value = '0.00';
    inputStockViejo.value = '0'; inputCantidad.value = '0';
    if (buscador) buscador.value = '';
}

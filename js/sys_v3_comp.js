/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Integrado de Entrada de Mercancía (sys_v3_comp.js)
 * Sincronizado al 100% con Cloud Firestore de Inventario Pro
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, doc, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id'); 

let productosLocales = [];
let listaTemporal = []; 
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
// 1. INICIALIZACIÓN
// ==========================================
async function inicializarEntradaMercancia() {
    if (!USER_ID) {
        mostrarEstado("❌ Error: No se detectó ID de empresa.", "loading");
        return;
    }
    
    mostrarEstado("⏳ Conectando con el inventario...", "loading");
    try {
        // CORRECCIÓN: Buscamos en el documento del usuario, no en la subcolección 'configuracion'
        const userSnap = await getDoc(doc(db, "usuarios", USER_ID));
        
        if (userSnap.exists() && userSnap.data().tasa_bcv) {
            tasaActual = parseFloat(userSnap.data().tasa_bcv) || 1.00;
            if (txtTasa) txtTasa.innerText = tasaActual.toFixed(2).replace('.', ',') + " Bs.";
        } else {
            console.warn("Tasa no encontrada en el perfil, usando valor por defecto.");
        }

        onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
            productosLocales = [];
            snapshot.forEach(doc => productosLocales.push({ id: doc.id, ...doc.data() }));
            mostrarEstado("✅ Inventario sincronizado.", "success");
        });
    } catch (e) {
        console.error("Error al cargar datos:", e);
        mostrarEstado("❌ Error de comunicación con la DB.", "loading");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    if (inputFecha) inputFecha.value = hoy;

    if (inputCosto) inputCosto.addEventListener('input', window.calcularPreciosCompra);
    if (inputGanancia) inputGanancia.addEventListener('input', window.calcularPreciosCompra);
    if (inputPrecio) inputPrecio.addEventListener('input', window.calcularGananciaCompra);

    inicializarEntradaMercancia();
    if (buscador) buscador.focus();
});

// ==========================================
// 2. BUSCADOR Y SELECCIÓN
// ==========================================
if (buscador) {
    buscador.addEventListener('input', (e) => {
        const criterio = e.target.value.trim().toLowerCase();
        if (!criterio) { dropdown.style.display = 'none'; return; }
        const filtrados = productosLocales.filter(p => {
            return (p.barras || '').toLowerCase().includes(criterio) || 
                   (p.sku || '').toLowerCase().includes(criterio) || 
                   (p.nombre || '').toLowerCase().includes(criterio);
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
            item.innerHTML = `<div class="item-info"><span class="item-name">${p.nombre}</span><span class="item-meta">SKU: ${p.sku}</span></div>`;
            item.onclick = () => seleccionarProducto(p);
            dropdown.appendChild(item);
        });
    }
    dropdown.style.display = 'block';
}

function seleccionarProducto(producto) {
    inputSku.value = producto.sku || ''; inputBarras.value = producto.barras || '';
    inputNombre.value = producto.nombre || ''; inputCosto.value = (producto.costo || 0).toFixed(2);
    inputGanancia.value = (producto.ganancia || 0).toFixed(1); inputPrecio.value = (producto.precio || 0).toFixed(2);
    inputStockViejo.value = producto.stock || 0; inputCantidad.value = '0';
    dropdown.style.display = 'none'; window.calcularPreciosCompra();
}

window.prepararNuevoProducto = (texto) => { inputSku.value = texto.toUpperCase(); inputNombre.value = texto; dropdown.style.display = 'none'; };

// ==========================================
// 3. MATEMÁTICA
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

window.calcularDesdeBs = () => {
    const inputPrecioBs = document.getElementById('comp-precio-bs');
    const inputPrecio = document.getElementById('comp-precio');
    const inputCosto = document.getElementById('comp-costo');
    const inputGanancia = document.getElementById('comp-ganancia');

    const valorBs = parseFloat(inputPrecioBs.value.replace(',', '.')) || 0;
    
    if (tasaActual > 0) {
        const precioUsd = valorBs / tasaActual;
        inputPrecio.value = precioUsd.toFixed(2);
        
        // Calcular ganancia inversa si existe costo
        const costo = parseFloat(inputCosto.value) || 0;
        if (costo > 0) {
            inputGanancia.value = (((precioUsd - costo) / costo) * 100).toFixed(1);
        }
    }
};

// ==========================================
// 4. LÓGICA DE LISTA
// ==========================================
window.agregarALista = function() {
    const sku = inputSku.value.trim();
    const nombre = inputNombre.value.trim();
    const cant = parseInt(inputCantidad.value) || 0;
    const precio = parseFloat(inputPrecio.value) || 0;

    if (!nombre || cant <= 0 || !sku) return mostrarEstado("❌ Datos incompletos o falta SKU", "loading");

    listaTemporal.push({ sku, nombre, cant, precio, barras: inputBarras.value, costo: inputCosto.value, ganancia: inputGanancia.value });
    renderizarTabla();
    limpiarFormulario();
};

function renderizarTabla() {
    const tbody = document.getElementById('tabla-items-compra');
    if (!tbody) return;
    tbody.innerHTML = listaTemporal.map((item, index) => `
        <tr>
            <td>${item.sku}</td><td>${item.nombre}</td><td>${item.cant}</td><td>$${item.precio}</td>
            <td><button onclick="window.eliminarDeLista(${index})" style="color:red; cursor:pointer; background:none; border:none;">X</button></td>
        </tr>
    `).join('');
}

window.eliminarDeLista = (index) => { listaTemporal.splice(index, 1); renderizarTabla(); };

window.procesarIngresoMercancia = async () => {
    if (listaTemporal.length === 0) return mostrarEstado("⚠️ Lista vacía", "loading");
    
    mostrarEstado("⏳ Procesando...", "loading");
    try {
        for (const item of listaTemporal) {
            // MODIFICACIÓN: El ID del documento será directamente el SKU, sin prefijo.
            const idDoc = item.sku; 
            const prodExistente = productosLocales.find(p => p.sku === item.sku);
            const stockActual = prodExistente ? (parseInt(prodExistente.stock) || 0) : 0;

            await setDoc(doc(db, "usuarios", USER_ID, "productos", idDoc), {
                sku: item.sku, barras: item.barras, nombre: item.nombre,
                costo: parseFloat(item.costo), ganancia: parseFloat(item.ganancia),
                precio: parseFloat(item.precio), stock: stockActual + item.cant,
                ultima_actualizacion: inputFecha.value
            }, { merge: true });
        }
        mostrarEstado("✅ Entrada exitosa", "success");
        listaTemporal = []; renderizarTabla();
    } catch (e) {
        mostrarEstado("❌ Error al guardar", "loading");
    }
};

function limpiarFormulario() {
    inputSku.value = ''; inputBarras.value = ''; inputNombre.value = '';
    inputCosto.value = '0.00'; inputGanancia.value = '0.0'; inputPrecio.value = '0.00';
    inputStockViejo.value = '0'; inputCantidad.value = '0';
    if (buscador) { buscador.value = ''; buscador.focus(); }
}

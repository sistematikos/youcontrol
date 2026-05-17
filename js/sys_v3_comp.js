/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Integrado de Entrada de Mercancía (sys_v3_comp.js)
 * Sincronizado al 100% con Cloud Firestore de Inventario Pro
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, doc, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
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

// Mensajes de Alerta (Misma estética You Control)
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
    mostrarEstado("⏳ Conectando con el inventario...", "loading");
    try {
        // Leer la tasa exacta desde tu configuración de Firestore
        const tasaSnap = await getDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"));
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
            if (txtTasa) {
                txtTasa.innerText = tasaActual.toFixed(2).replace('.', ',') + " Bs.";
            }
        }

        // Escucha en tiempo real de la colección exacta de tus productos
        onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
            productosLocales = [];
            snapshot.forEach(doc => {
                productosLocales.push({ id: doc.id, ...doc.data() });
            });
            mostrarEstado("✅ Inventario sincronizado y listo.", "success");
        });

    } catch (e) {
        console.error("Error al enlazar Firestore en módulo compras:", e);
        mostrarEstado("❌ Error de comunicación con la base de datos.", "loading");
    }
}

// Inicializadores de interfaz
document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    if (inputFecha) inputFecha.value = hoy;

    if (inputCosto) inputCosto.addEventListener('input', window.calcularPreciosCompra);
    if (inputGanancia) inputGanancia.addEventListener('input', window.calcularPreciosCompra);
    if (inputPrecio) inputPrecio.addEventListener('input', window.calcularGananciaCompra);

    // Atajo F9 para procesar la entrada
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
        
        if (!criterio) {
            dropdown.style.display = 'none';
            return;
        }

        // Filtro cruzado sobre los mismos campos de tu tabla
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
        dropdown.innerHTML = `
            <div class="no-products-alert" onclick="window.prepararNuevoProducto('${textoBuscado}')">
                <i class="fas fa-plus-circle"></i> El producto no existe en la DB. ¿Deseas crearlo?
            </div>
        `;
    } else {
        productos.forEach(p => {
            const item = document.createElement('div');
            item.className = 'search-item';
            item.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${p.nombre || 'Sin descripción'}</span>
                    <span class="item-meta">SKU: ${p.sku || 'N/A'} | Barras: ${p.barras || 'Sin código'}</span>
                </div>
                <span class="item-stock">Stock: ${p.stock || 0}</span>
            `;
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
    inputCantidad.select();

    dropdown.style.display = 'none';
    if (buscador) buscador.value = '';
    
    window.calcularPreciosCompra();
}

window.prepararNuevoProducto = function(textoBuscado) {
    const esNumero = !isNaN(textoBuscado) && textoBuscado.length > 4;

    inputSku.value = esNumero ? '' : textoBuscado.toUpperCase().substring(0, 7);
    inputBarras.value = esNumero ? textoBuscado : '';
    inputNombre.value = esNumero ? '' : textoBuscado;
    
    inputCosto.value = '0.00';
    inputGanancia.value = '0.0';
    inputPrecio.value = '0.00';
    inputPrecioBs.value = '0,00 Bs.';
    inputStockViejo.value = '0';
    inputCantidad.value = '1';
    
    dropdown.style.display = 'none';
    if (buscador) buscador.value = '';
    
    inputSku.focus();
};

// Ocultar dropdown si se hace click fuera
document.addEventListener('click', (e) => {
    if (dropdown && !e.target.closest('.search-wrapper')) {
        dropdown.style.display = 'none';
    }
});

// ==========================================
// 3. MATEMÁTICA Y CONVERSIÓN DE PRECIOS
// ==========================================
window.calcularPreciosCompra = function() {
    const costo = parseFloat(inputCosto.value) || 0;
    const ganancia = parseFloat(inputGanancia.value) || 0;
    const precioUsd = costo + (costo * (ganancia / 100));
    
    inputPrecio.value = precioUsd.toFixed(2);
    const precioBs = precioUsd * tasaActual;
    inputPrecioBs.value = precioBs.toFixed(2).replace('.', ',') + " Bs.";
};

window.calcularGananciaCompra = function() {
    const costo = parseFloat(inputCosto.value) || 0;
    const precio = parseFloat(inputPrecio.value) || 0;
    
    if (costo > 0) {
        const porcentaje = ((precio - costo) / costo) * 100;
        inputGanancia.value = porcentaje.toFixed(1);
    }
    const precioBs = precio * tasaActual;
    inputPrecioBs.value = precioBs.toFixed(2).replace('.', ',') + " Bs.";
};

// ==========================================
// 4. PROCESAR ENTRADA (SETDOC EN FIRESTORE)
// ==========================================
window.procesarIngresoMercancia = async () => {
    const sku = inputSku.value.trim();
    const nombre = inputNombre.value.trim();
    const barras = inputBarras.value.trim();
    const cantidadEntrante = parseInt(inputCantidad.value) || 0;
    const stockViejo = parseInt(inputStockViejo.value) || 0;

    if (!nombre) { 
        mostrarEstado("❌ La descripción del producto es obligatoria.", "loading"); 
        return; 
    }
    if (cantidadEntrante <= 0) {
        mostrarEstado("❌ Ingrese una cantidad entrante mayor a cero.", "loading");
        inputCantidad.focus();
        return;
    }

    mostrarEstado("⏳ Registrando entrada en Firestore...", "loading");

    const nuevoStockTotal = stockViejo + cantidadEntrante;

    const datos = {
        sku: sku,
        barras: barras,
        nombre: nombre,
        costo: parseFloat(inputCosto.value) || 0,
        ganancia: parseFloat(inputGanancia.value) || 0,
        precio: parseFloat(inputPrecio.value) || 0,
        stock: nuevoStockTotal,
        ultima_actualizacion: inputFecha.value
    };

    try {
        // Determinamos el ID del documento usando tu misma regla exacta de sys_v1_inv
        // Busca si ya existía por id analizando el array de productosLocales
        const prodExistente = productosLocales.find(p => p.sku === sku || (barras && p.barras === barras));
        const idDocumento = prodExistente ? prodExistente.id : (sku || barras || doc(collection(db, "temp")).id);

        // Escritura limpia y directa en tu colección real de usuarios
        await setDoc(doc(db, "usuarios", USER_ID, "productos", idDocumento), datos, { merge: true });
        
        mostrarEstado(`✅ Entrada exitosa. Nuevo Stock: ${nuevoStockTotal}`, "success");
        limpiarFormulario();
    } catch (e) {
        console.error("Error al asentar la entrada:", e);
        mostrarEstado("❌ Error crítico: No se pudo actualizar el inventario.", "loading");
    }
};

function limpiarFormulario() {
    inputSku.value = '';
    inputBarras.value = '';
    inputNombre.value = '';
    inputCosto.value = '0.00';
    inputGanancia.value = '0.0';
    inputPrecio.value = '0.00';
    inputPrecioBs.value = '0,00 Bs.';
    inputStockViejo.value = '0';
    inputCantidad.value = '0';
    if (buscador) {
        buscador.value = '';
        buscador.focus();
    }
}

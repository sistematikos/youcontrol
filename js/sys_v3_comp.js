/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Integrado de Entrada de Mercancía Masiva (sys_v3_comp.js)
 * Sincronizado al 100% con Cloud Firestore de Inventario Pro
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, doc, getDoc, writeBatch 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let productosLocales = [];
let listaCompraActual = []; // Estructura en memoria para acumular los ítems de la compra
let tasaActual = 1.00;

// Variables de control para la navegación con teclado
let indexFocus = -1;

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

// Contenedor visual para la lista de productos precargados
const tablaCompra = document.getElementById('tabla-items-compra'); 

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
            mostrarEstado("✅ Inventario sincronizado y listo.", "success");
        });

    } catch (e) {
        console.error("Error al enlazar Firestore en módulo compras:", e);
        mostrarEstado("❌ Error de comunicación con la base de datos.", "loading");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date().toISOString().split('T')[0];
    if (inputFecha) inputFecha.value = hoy;

    if (inputCosto) inputCosto.addEventListener('input', window.calcularPreciosCompra);
    if (inputGanancia) inputGanancia.addEventListener('input', window.calcularPreciosCompra);
    if (inputPrecio) inputPrecio.addEventListener('input', window.calcularGananciaCompra);

    // Atajos de teclado del módulo
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F9') {
            e.preventDefault();
            window.procesarCompraCompleta();
        }
        
        // Ejecutar agregarItem solo si no estamos navegando en el dropdown predictivo
        if (e.key === 'Enter' && document.activeElement === inputCantidad) {
            e.preventDefault();
            window.agregarItemALista();
        }
    });

    inicializarEntradaMercancia();
    if (buscador) buscador.focus();
});

// ==========================================
// 2. BUSCADOR DINÁMICO PREDICTIVO Y NAVEGACIÓN
// ==========================================
if (buscador) {
    buscador.addEventListener('input', (e) => {
        const criterio = e.target.value.trim().toLowerCase();
        indexFocus = -1; // Resetear foco al escribir
        
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

    // Escuchador exclusivo para las flechas y Enter dentro del buscador
    buscador.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.search-item');
        
        if (dropdown.style.display === 'none' || items.length === 0) {
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            indexFocus++;
            if (indexFocus >= items.length) indexFocus = 0;
            actualizarFocoItems(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            indexFocus--;
            if (indexFocus < 0) indexFocus = items.length - 1;
            actualizarFocoItems(items);
        } else if (e.key === 'Enter') {
            if (indexFocus > -1 && items[indexFocus]) {
                e.preventDefault();
                items[indexFocus].click(); // Ejecuta la selección
                indexFocus = -1;
            }
        }
    });
}

function actualizarFocoItems(items) {
    items.forEach((item, index) => {
        if (index === indexFocus) {
            item.style.backgroundColor = '#F1F5F9'; // Resaltado visual
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.style.backgroundColor = '#FFFFFF';
        }
    });
}

function renderizarDropdown(productos, textoBuscado) {
    if (!dropdown) return;
    dropdown.innerHTML = '';
    
    if (productos.length === 0) {
        dropdown.innerHTML = `
            <div class="no-products-alert" onclick="window.prepararNuevoProducto('${textoBuscado}')">
                <i class="fas fa-plus-circle"></i> El producto no existe en la DB. ¿Deseas crearlo en esta compra?
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
                <span class="item-stock">Stock Actual: ${p.stock || 0}</span>
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
    
    inputCantidad.value = '1';
    inputCantidad.focus();
    inputCantidad.select();

    dropdown.style.display = 'none';
    if (buscador) buscador.value = '';
    indexFocus = -1;
    
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
    indexFocus = -1;
    
    inputSku.focus();
};

document.addEventListener('click', (e) => {
    if (dropdown && !e.target.closest('.search-wrapper')) {
        dropdown.style.display = 'none';
        indexFocus = -1;
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
// 4. GESTIÓN DE LA LISTA EN MEMORIA (CARRITO)
// ==========================================
window.agregarItemALista = () => {
    const sku = inputSku.value.trim();
    const nombre = inputNombre.value.trim();
    const barras = inputBarras.value.trim();
    const cantidadEntrante = parseInt(inputCantidad.value) || 0;
    const stockViejo = parseInt(inputStockViejo.value) || 0;

    if (!nombre) { 
        mostrarEstado("❌ El campo descripción es requerido.", "loading"); 
        return; 
    }
    if (cantidadEntrante <= 0) {
        mostrarEstado("❌ Cantidad debe ser mayor a cero.", "loading");
        inputCantidad.focus();
        return;
    }

    // Verificar si el artículo ya se encuentra listado en esta sesión de carga
    const indexExistente = listaCompraActual.findIndex(item => (sku && item.sku === sku) || (barras && item.barras === barras));

    const itemDatos = {
        sku: sku,
        barras: barras,
        nombre: nombre,
        costo: parseFloat(inputCosto.value) || 0,
        ganancia: parseFloat(inputGanancia.value) || 0,
        precio: parseFloat(inputPrecio.value) || 0,
        stockViejo: stockViejo,
        amount: cantidadEntrante,
        cantidad: cantidadEntrante,
        nuevoStockTotal: stockViejo + cantidadEntrante
    };

    if (indexExistente > -1) {
        // Si ya está en la lista, actualizamos valores sumando las cantidades
        listaCompraActual[indexExistente].cantidad += itemDatos.cantidad;
        listaCompraActual[indexExistente].nuevoStockTotal = listaCompraActual[indexExistente].stockViejo + listaCompraActual[indexExistente].cantidad;
        listaCompraActual[indexExistente].costo = itemDatos.costo;
        listaCompraActual[indexExistente].precio = itemDatos.precio;
    } else {
        listaCompraActual.push(itemDatos);
    }

    actualizarTablaInterfaz();
    limpiarCamposFicha();
};

window.eliminarItemDeLista = (index) => {
    listaCompraActual.splice(index, 1);
    actualizarTablaInterfaz();
};

function actualizarTablaInterfaz() {
    if (!tablaCompra) return;
    tablaCompra.innerHTML = '';

    if (listaCompraActual.length === 0) {
        tablaCompra.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">No hay artículos agregados a la entrada.</td></tr>`;
        return;
    }

    listaCompraActual.forEach((item, index) => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td><b>${item.sku || 'N/A'}</b><br><small style="color:var(--text-muted);">${item.barras || ''}</small></td>
            <td>${item.nombre}</td>
            <td style="text-align: center;">${item.cantidad}</td>
            <td style="text-align: right;">$ ${item.costo.toFixed(2)}</td>
            <td style="text-align: right;">$ ${item.precio.toFixed(2)}</td>
            <td style="text-align: center;">
                <button class="btn-action-delete" onclick="window.eliminarItemDeLista(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer;">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tablaCompra.appendChild(fila);
    });
}

function limpiarCamposFicha() {
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
    indexFocus = -1;
}

// ==========================================
// 5. ASENTAMIENTO MASIVO EN FIRESTORE (BATCH)
// ==========================================
window.procesarCompraCompleta = async () => {
    if (listaCompraActual.length === 0) {
        mostrarEstado("❌ No hay artículos en la lista para procesar.", "loading");
        return;
    }

    mostrarEstado("⏳ Procesando lote de compras en Firestore...", "loading");
    
    // Instanciamos el Batch para guardar múltiples documentos de forma atómica
    const batch = writeBatch(db);

    try {
        listaCompraActual.forEach(item => {
            // Buscamos si el artículo ya existía previamente en el almacén persistente
            const prodExistente = productosLocales.find(p => (item.sku && p.sku === item.sku) || (item.barras && p.barras === item.barras));
            const idDocumento = prodExistente ? prodExistente.id : (item.sku || item.barras || doc(collection(db, "temp")).id);

            const docRef = doc(db, "usuarios", USER_ID, "productos", idDocumento);
            
            const payload = {
                sku: item.sku,
                barras: item.barras,
                nombre: item.nombre,
                costo: item.costo,
                ganancia: item.ganancia,
                precio: item.precio,
                stock: item.nuevoStockTotal, // Guardamos la sumatoria acumulada final
                ultima_actualizacion: inputFecha.value
            };

            batch.set(docRef, payload, { merge: true });
        });

        // Ejecución definitiva de la transacción por lote en el servidor
        await batch.commit();

        mostrarEstado(`✅ Compra guardada exitosamente. ${listaCompraActual.length} ítems procesados.`, "success");
        listaCompraActual = [];
        actualizarTablaInterfaz();
        limpiarCamposFicha();

    } catch (e) {
        console.error("Error al ejecutar el lote de la compra:", e);
        mostrarEstado("❌ Error crítico: No se pudo asentar la compra masiva.", "loading");
    }
};

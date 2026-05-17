/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo: Entrada de Mercancía (sys_v3_comp.js)
 * Desarrollado por: Frank Hernandez (2026)
 */

// ==========================================
// 1. CONFIGURACIÓN Y CONEXIÓN REAL DE FIREBASE
// ==========================================
// NOTA: Configura aquí las credenciales exactas de tu Base de Datos Firebase
const firebaseConfig = {
    databaseURL: "https://tu-proyecto-firebase.firebaseio.com" 
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();

// Arreglos reactivos en memoria
let listaProductos = [];
let tasaCambio = 1.00; 

// Capturas del DOM
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

// ==========================================
// 2. SINCRONIZACIÓN DE FIREBASE EN TIEMPO REAL
// ==========================================
function iniciarSincronizacion() {
    mostrarMensajeEstado("Conectando al servidor Firebase...", "loading");

    // Escuchar Tasa de Cambio del día
    db.ref('tasas/hoy').on('value', (snapshot) => {
        const val = snapshot.val();
        if (val) {
            tasaCambio = parseFloat(val) || 1.00;
            if (txtTasa) txtTasa.innerText = tasaCambio.toLocaleString('es-VE', { minimumFractionDigits: 2 });
            window.calcularPreciosCompra();
        }
    });

    // Escuchar nodo Oficial de Inventario
    db.ref('inventario').on('value', (snapshot) => {
        const datos = snapshot.val();
        listaProductos = []; // Reseteamos el listado local

        if (datos) {
            Object.keys(datos).forEach(id => {
                const p = datos[id];
                listaProductos.push({
                    keyFirebase: id,
                    sku: p.sku || id,
                    barras: p.barras || '',
                    nombre: p.nombre || p.descripcion || '',
                    costo: parseFloat(p.costo) || 0,
                    ganancia: parseFloat(p.ganancia) || 0,
                    precio: parseFloat(p.precio) || 0,
                    stock: parseInt(p.stock) || 0
                });
            });
        }
        mostrarMensajeEstado("Inventario real sincronizado perfectamente.", "success");
        setTimeout(() => { if(statusBar) statusBar.style.display = 'none'; }, 1500);
    }, (error) => {
        mostrarMensajeEstado("Error al leer Firebase: " + error.message, "error");
    });
}

// Inicializadores principales
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

    iniciarSincronizacion();
    if (buscador) buscador.focus();
});

// ==========================================
// 3. EVENTOS DEL BUSCADOR DINÁMICO
// ==========================================
if (buscador) {
    buscador.addEventListener('input', (e) => {
        const criterio = e.target.value.trim().toLowerCase();
        
        if (!criterio) {
            dropdown.style.display = 'none';
            return;
        }

        const filtrados = listaProductos.filter(p => 
            p.sku.toLowerCase().includes(criterio) || 
            (p.barras && p.barras.toLowerCase().includes(criterio)) || 
            p.nombre.toLowerCase().includes(criterio)
        );

        renderizarDropdown(filtrados, e.target.value);
    });
}

function renderizarDropdown(productos, textoBuscado) {
    if (!dropdown) return;
    dropdown.innerHTML = '';
    
    if (productos.length === 0) {
        dropdown.innerHTML = `
            <div class="no-products-alert" onclick="window.prepararNuevoProducto('${textoBuscado}')">
                <i class="fas fa-plus-circle"></i> El producto no existe. ¿Deseas crearlo?
            </div>
        `;
    } else {
        productos.forEach(p => {
            const item = document.createElement('div');
            item.className = 'search-item';
            item.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${p.nombre}</span>
                    <span class="item-meta">SKU: ${p.sku} | Barras: ${p.barras || 'N/A'}</span>
                </div>
                <span class="item-stock">Stock: ${p.stock}</span>
            `;
            item.onclick = () => seleccionarProducto(p);
            dropdown.appendChild(item);
        });
    }
    dropdown.style.display = 'block';
}

function seleccionarProducto(producto) {
    inputSku.value = producto.sku;
    inputBarras.value = producto.barras || '';
    inputNombre.value = producto.nombre;
    inputCosto.value = parseFloat(producto.costo).toFixed(2);
    inputGanancia.value = parseFloat(producto.ganancia).toFixed(1);
    inputPrecio.value = parseFloat(producto.precio).toFixed(2);
    inputStockViejo.value = producto.stock;
    
    inputCantidad.value = '0';
    inputCantidad.focus();
    inputCantidad.select();

    dropdown.style.display = 'none';
    if (buscador) buscador.value = '';
    
    window.calcularPreciosCompra();
}

window.prepararNuevoProducto = function(textoBuscado) {
    const esNumero = !isNaN(textoBuscado);

    inputSku.value = esNumero ? '' : textoBuscado.toUpperCase().substring(0, 6);
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
    mostrarMensajeEstado("Modo registro de producto nuevo.", "success");
};

document.addEventListener('click', (e) => {
    if (dropdown && !e.target.closest('.search-wrapper')) {
        dropdown.style.display = 'none';
    }
});

// ==========================================
// 4. LÓGICA DE OPERACIONES MATEMÁTICAS
// ==========================================
window.calcularPreciosCompra = function() {
    const costo = parseFloat(inputCosto.value) || 0;
    const ganancia = parseFloat(inputGanancia.value) || 0;
    const precioUsd = costo * (1 + (ganancia / 100));
    
    inputPrecio.value = precioUsd.toFixed(2);
    const precioBs = precioUsd * tasaCambio;
    inputPrecioBs.value = precioBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + " Bs.";
};

window.calcularGananciaCompra = function() {
    const costo = parseFloat(inputCosto.value) || 0;
    const precio = parseFloat(inputPrecio.value) || 0;
    
    if (costo > 0) {
        const porcentaje = ((precio - costo) / costo) * 100;
        inputGanancia.value = porcentaje.toFixed(1);
    }
    const precioBs = precio * tasaCambio;
    inputPrecioBs.value = precioBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + " Bs.";
};

// ==========================================
// 5. ENVÍO DE DATOS SEGURO A FIREBASE DB
// ==========================================
window.procesarIngresoMercancia = function() {
    const sku = inputSku.value.trim();
    const nombre = inputNombre.value.trim();
    const cantidadEntrante = parseInt(inputCantidad.value) || 0;
    const stockViejo = parseInt(inputStockViejo.value) || 0;
    const costo = parseFloat(inputCosto.value) || 0;
    const precio = parseFloat(inputPrecio.value) || 0;
    const ganancia = parseFloat(inputGanancia.value) || 0;
    const barras = inputBarras.value.trim();

    if (!sku || !nombre) {
        mostrarMensajeEstado("Error: El SKU y Nombre del producto son obligatorios.", "error");
        return;
    }
    if (cantidadEntrante <= 0) {
        mostrarMensajeEstado("La cantidad entrante debe ser superior a 0.", "error");
        inputCantidad.focus();
        return;
    }

    const nodoRuta = db.ref('inventario/' + sku);
    const nuevoStockTotal = stockViejo + cantidadEntrante;

    mostrarMensajeEstado("Guardando lote de mercancía...", "loading");

    nodoRuta.set({
        sku: sku,
        barras: barras,
        nombre: nombre,
        costo: costo,
        ganancia: ganancia,
        precio: precio,
        stock: nuevoStockTotal,
        ultima_actualizacion: inputFecha.value
    })
    .then(() => {
        mostrarMensajeEstado(`¡Procesado! Stock total actualizado: ${nuevoStockTotal}`, "success");
        limpiarFormularioCompleto();
    })
    .catch((error) => {
        mostrarMensajeEstado("Error en Firebase: " + error.message, "error");
    });
};

function limpiarFormularioCompleto() {
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

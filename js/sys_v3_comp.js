/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Integrado de Entrada de Mercancía (sys_v3_comp.js)
 * Sincronizado con la raíz real de Inventario Pro
 */

// ==========================================
// 1. CONEXIÓN DIRECTA A FIREBASE INTERNA
// ==========================================
const firebaseConfig = {
    databaseURL: "https://tu-proyecto-firebase.firebaseio.com" // <- Mantén tu URL real aquí
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

let listaProductos = [];
let tasaCambio = 1.00;

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

// Mensajes de alerta en barra superior
function mostrarMensajeEstado(texto, tipo) {
    if (!statusBar) return;
    statusBar.className = '';
    statusBar.innerText = texto;
    statusBar.style.display = 'block';
    if (tipo === 'loading') statusBar.classList.add('status-loading');
    if (tipo === 'success') statusBar.classList.add('status-success');
    if (tipo === 'error') statusBar.classList.add('status-error');
}

// ==========================================
// 2. ESCUCHA ACTIVA DE LA RUTA DEL INVENTARIO
// ==========================================
function iniciarSincronizacion() {
    mostrarMensajeEstado("Cargando base de datos...", "loading");

    // Sincronizar tasa global del sistema
    db.ref('tasaCambio').on('value', (snapshot) => {
        const val = snapshot.val();
        if (val) {
            tasaCambio = parseFloat(val) || 1.00;
        } else {
            tasaCambio = 45.50; // Tasa de respaldo detectada en tus pantallas
        }
        if (txtTasa) txtTasa.innerText = tasaCambio.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + " Bs.";
        window.calcularPreciosCompra();
    });

    // Sincronizar el nodo exacto que usa tu tabla general de Inventario Pro
    db.ref('productos').on('value', (snapshot) => {
        const datos = snapshot.val();
        listaProductos = [];

        if (datos) {
            Object.keys(datos).forEach(id => {
                const p = datos[id];
                // Lectura e indexación cruzada para el buscador predictivo
                listaProductos.push({
                    id: id,
                    barras: p.barras || '',
                    sku: p.sku || '',
                    nombre: p.nombre || p.descripcion || '',
                    costo: parseFloat(p.costo) || 0,
                    ganancia: parseFloat(p.ganancia) || 0,
                    precio: parseFloat(p.precio) || 0,
                    stock: parseInt(p.stock) || 0
                });
            });
        }
        mostrarMensajeEstado("Base de datos en la nube lista.", "success");
        setTimeout(() => { if(statusBar) statusBar.style.display = 'none'; }, 1000);
    }, (error) => {
        mostrarMensajeEstado("Error de sincronización: " + error.message, "error");
    });
}

// Inicializadores al cargar la ventana
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
// 3. CONTROLADOR DEL BUSCADOR INTELIGENTE
// ==========================================
if (buscador) {
    buscador.addEventListener('input', (e) => {
        const criterio = e.target.value.trim().toLowerCase();
        
        if (!criterio) {
            dropdown.style.display = 'none';
            return;
        }

        // Búsqueda cruzada inteligente por Nombre, SKU o Barras
        const filtrados = listaProductos.filter(p => 
            p.nombre.toLowerCase().includes(criterio) || 
            p.sku.toLowerCase().includes(criterio) || 
            p.barras.toLowerCase().includes(criterio)
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
                    <span class="item-meta">SKU: ${p.sku} | Barras: ${p.barras || 'Sin código'}</span>
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
    inputBarras.value = producto.barras;
    inputNombre.value = producto.nombre;
    inputCosto.value = producto.costo.toFixed(2);
    inputGanancia.value = producto.ganancia.toFixed(1);
    inputPrecio.value = producto.precio.toFixed(2);
    inputStockViejo.value = producto.stock;
    
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

document.addEventListener('click', (e) => {
    if (dropdown && !e.target.closest('.search-wrapper')) {
        dropdown.style.display = 'none';
    }
});

// ==========================================
// 4. LÓGICA DE DERIVACIÓN ECONÓMICA
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
// 5. ENVÍO DE ACTUALIZACIÓN COMBINADA A FIREBASE
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
        mostrarMensajeEstado("Error: SKU y Descripción son obligatorios.", "error");
        return;
    }
    if (cantidadEntrante <= 0) {
        mostrarMensajeEstado("Indique una cantidad entrante válida.", "error");
        inputCantidad.focus();
        return;
    }

    // Buscamos si el producto ya existe mediante SKU para heredar la ID estructural correcta
    const productoExistente = listaProductos.find(p => p.sku.toLowerCase() === sku.toLowerCase());
    const idNodo = productoExistente ? productoExistente.id : db.ref('productos').push().key;

    const nuevoStockTotal = stockViejo + cantidadEntrante;
    mostrarMensajeEstado("Guardando modificaciones...", "loading");

    // Escribe directamente en el nodo de productos sincronizado con Inventario Pro
    db.ref('productos/' + idNodo).set({
        sku: sku,
        barras: barras,
        nombre: nombre,
        costo: costo,
        ganancia: ganancia,
        precio: precio,
        stock: nuevoStockTotal,
        actualizado: inputFecha.value
    })
    .then(() => {
        mostrarMensajeEstado(`¡Procesado con éxito! Stock actual: ${nuevoStockTotal}`, "success");
        limpiarFormularioCompleto();
    })
    .catch((error) => {
        mostrarMensajeEstado("Error al guardar: " + error.message, "error");
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

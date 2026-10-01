/**
 * Módulo de Operaciones de Inventario - YOU CONTROL
 */

// Estado global local para el catálogo de productos
let productosBD = [];
let productoSeleccionado = null;

// Elementos DOM
const buscadorInput = document.getElementById('buscador-prod-inv');
const listaResultados = document.getElementById('lista-resultados-inv');

const campoSku = document.getElementById('inv-sku');
const campoNombre = document.getElementById('inv-nombre');
const campoStockActual = document.getElementById('inv-stock-actual');

const campoTipoOp = document.getElementById('inv-tipo-op');
const campoCantidad = document.getElementById('inv-cantidad');
const campoConcepto = document.getElementById('inv-concepto');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    cargarCatalogoProductos();
    configurarBuscador();
    configurarAtajosTeclado();
});

/**
 * Carga la lista de productos desde la fuente de datos (Firestore / Mock)
 */
async function cargarCatalogoProductos() {
    try {
        // Sustituir por la llamada real a tu base de datos / Firestore
        // Ejemplo: const querySnapshot = await getDocs(collection(db, "productos"));
        
        productosBD = [
            { id: "SKU001", sku: "SKU001", nombre: "ACEITE DE MOTOR 20W50", barras: "750123456789", stock: 15 },
            { id: "SKU002", sku: "SKU002", nombre: "FILTRO DE ACEITE UNIVERSAL", barras: "750987654321", stock: 8 },
            { id: "SKU003", sku: "SKU003", nombre: "PASTILLAS DE FRENO DELANTERAS", barras: "750456789012", stock: 22 }
        ];
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

/**
 * Configura los eventos del buscador
 */
function configurarBuscador() {
    if (!buscadorInput || !listaResultados) return;

    // Filtrado en tiempo real
    buscadorInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();

        if (query.length === 0) {
            ocultarResultados();
            return;
        }

        const filtrados = productosBD.filter(p => {
            const sku = (p.sku || p.id || '').toLowerCase();
            const nombre = (p.nombre || '').toLowerCase();
            const barras = (p.barras || '').toLowerCase();

            return sku.includes(query) || nombre.includes(query) || barras.includes(query);
        });

        renderizarResultados(filtrados);
    });

    // Cierre seguro al hacer clic fuera del control
    document.addEventListener('click', (e) => {
        if (!buscadorInput.contains(e.target) && !listaResultados.contains(e.target)) {
            ocultarResultados();
        }
    });
}

/**
 * Muestra el listado flotante de coincidencias
 */
function renderizarResultados(resultados) {
    listaResultados.innerHTML = '';

    if (resultados.length === 0) {
        listaResultados.innerHTML = `
            <div class="item-res-inv" style="cursor: default; color: #94A3B8;">
                <small>No se encontraron coincidencias</small>
            </div>
        `;
        listaResultados.style.display = 'block';
        return;
    }

    resultados.slice(0, 10).forEach(p => {
        const item = document.createElement('div');
        item.className = 'item-res-inv';
        item.innerHTML = `
            <strong>${p.nombre}</strong><br>
            <small>SKU: ${p.sku || p.id} | Stock Actual: ${p.stock ?? 0}</small>
        `;

        // USO CLAVE DE 'pointerdown': Previene el cierre prematuro al perder el foco
        item.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            seleccionarProducto(p);
        });

        listaResultados.appendChild(item);
    });

    listaResultados.style.display = 'block';
}

/**
 * Carga la información del producto seleccionado en el formulario
 */
function seleccionarProducto(producto) {
    productoSeleccionado = producto;

    buscadorInput.value = producto.nombre;
    campoSku.value = producto.sku || producto.id;
    campoNombre.value = producto.nombre;
    campoStockActual.value = producto.stock ?? 0;

    ocultarResultados();
    
    if (campoCantidad) campoCantidad.focus();
}

/**
 * Oculta la lista desplegable de resultados
 */
function ocultarResultados() {
    listaResultados.style.display = 'none';
    listaResultados.innerHTML = '';
}

/**
 * Procesa la actualización del inventario
 */
window.procesarOperacionInventario = async function() {
    if (!productoSeleccionado) {
        alert("Por favor, selecciona un producto primero.");
        buscadorInput.focus();
        return;
    }

    const cantidad = parseFloat(campoCantidad.value);
    const tipoOp = campoTipoOp.value;
    const concepto = campoConcepto.value.trim();

    if (isNaN(cantidad) || cantidad <= 0) {
        alert("Ingresa una cantidad válida mayor a 0.");
        campoCantidad.focus();
        return;
    }

    let nuevoStock = productoSeleccionado.stock;

    if (tipoOp === 'ENTRADA') {
        nuevoStock += cantidad;
    } else if (tipoOp === 'SALIDA') {
        if (cantidad > productoSeleccionado.stock) {
            alert("La cantidad de salida excede el stock actual.");
            return;
        }
        nuevoStock -= cantidad;
    } else if (tipoOp === 'AJUSTE') {
        nuevoStock = cantidad;
    }

    try {
        // Aquí ejecutas la actualización en la BD / Firestore
        productoSeleccionado.stock = nuevoStock;
        campoStockActual.value = nuevoStock;

        alert(`Operación procesada con éxito.\nNuevo stock: ${nuevoStock}`);
        limpiarFormulario();
    } catch (error) {
        console.error("Error al guardar la operación:", error);
        alert("Ocurrió un error al procesar la operación.");
    }
};

/**
 * Restablece el formulario a su estado inicial
 */
function limpiarFormulario() {
    productoSeleccionado = null;
    buscadorInput.value = '';
    campoSku.value = '';
    campoNombre.value = '';
    campoStockActual.value = '0';
    campoCantidad.value = '';
    campoConcepto.value = '';
    ocultarResultados();
}

/**
 * Captura de atajos de teclado (F9 para guardar)
 */
function configurarAtajosTeclado() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F9') {
            e.preventDefault();
            window.procesarOperacionInventario();
        }
    });
}

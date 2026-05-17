/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo: Entrada de Mercancía (sys_v3_comp.js)
 * Desarrollado por: Frank Hernandez (2026)
 */

// ==========================================
// 1. VARIABLES GLOBALES Y SIMULACIÓN DE DATOS
// ==========================================
// NOTA: Reemplaza este array estático con tu llamada a Firebase (db.ref('inventario')) al conectar la BD.
let listaProductos = [
    { sku: "PIÑ-01", barras: "7501000", nombre: "Piña en Rodajas 500g", costo: 1.50, ganancia: 30, precio: 1.95, stock: 12 },
    { sku: "HAR-02", barras: "7502005", nombre: "Harina de Maíz Precocida 1kg", costo: 0.90, ganancia: 20, precio: 1.08, stock: 45 },
    { sku: "AZU-10", barras: "1002003", nombre: "Azúcar Refinada Montalbán 1kg", costo: 1.10, ganancia: 25, precio: 1.38, stock: 5 }
];

let tasaCambio = 45.50; // Ejemplo de tasa base en Bs. (Reemplazar con tu nodo de Firebase de tasas)

// Elementos del DOM
const buscador = document.getElementById('buscador-dinamico');
const dropdown = document.getElementById('dropdown-resultados');
const txtTasa = document.getElementById('txt-tasa');

// Elementos del Formulario
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
// 2. INICIALIZACIÓN DE LA PANTALLA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Establecer fecha de hoy automáticamente
    const hoy = new Date().toISOString().split('T')[0];
    if (inputFecha) inputFecha.value = hoy;

    // Renderizar tasa en la cabecera
    if (txtTasa) txtTasa.innerText = tasaCambio.toLocaleString('es-VE', { minimumFractionDigits: 2 });

    // Escuchadores para cálculos matemáticos automáticos
    if (inputCosto) inputCosto.addEventListener('input', window.calcularPreciosCompra);
    if (inputGanancia) inputGanancia.addEventListener('input', window.calcularPreciosCompra);
    if (inputPrecio) inputPrecio.addEventListener('input', window.calcularGananciaCompra);

    // Atajo de teclado global (F9 para procesar entrada)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F9') {
            e.preventDefault();
            window.procesarIngresoMercancia();
        }
    });

    // Enfocar el buscador dinámico al cargar para agilizar
    if (buscador) buscador.focus();
});

// ==========================================
// 3. LÓGICA DEL BUSCADOR DINÁMICO E INTERACTIVO
// ==========================================
if (buscador) {
    buscador.addEventListener('input', (e) => {
        const criterio = e.target.value.trim().toLowerCase();
        
        if (!criterio) {
            dropdown.style.display = 'none';
            return;
        }

        // Filtro inteligente de coincidencia triple: SKU, Código de barras o Nombre
        const filtrados = listaProductos.filter(p => 
            p.sku.toLowerCase().includes(criterio) || 
            (p.barras && p.barras.toLowerCase().includes(criterio)) || 
            p.nombre.toLowerCase().includes(criterio)
        );

        renderizarDropdown(filtrados, e.target.value);
    });
}

// Renderiza los resultados o la alerta interactiva de "crear nuevo"
function renderizarDropdown(productos, textoBuscado) {
    if (!dropdown) return;
    dropdown.innerHTML = '';
    
    if (productos.length === 0) {
        // Opción interactiva si el producto no existe en el catálogo actual
        dropdown.innerHTML = `
            <div class="no-products-alert" onclick="window.prepararNuevoProducto('${textoBuscado}')">
                <i class="fas fa-plus-circle"></i> El producto no existe. ¿Deseas crearlo?
            </div>
        `;
    } else {
        // Listar coincidencias halladas
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

// Carga los datos del producto existente en el formulario
function seleccionarProducto(producto) {
    inputSku.value = producto.sku;
    inputBarras.value = producto.barras || '';
    inputNombre.value = producto.nombre;
    inputCosto.value = parseFloat(producto.costo).toFixed(2);
    inputGanancia.value = parseFloat(producto.ganancia).toFixed(1);
    inputPrecio.value = parseFloat(producto.precio).toFixed(2);
    inputStockViejo.value = producto.stock;
    
    // Configura e interrumpe la cantidad para que el usuario digite directo
    inputCantidad.value = '0';
    inputCantidad.focus();
    inputCantidad.select();

    dropdown.style.display = 'none';
    if (buscador) buscador.value = '';
    
    window.calcularPreciosCompra();
    mostrarMensajeEstado("Producto seleccionado. Ingrese la cantidad entrante.", "loading");
}

// Prepara los inputs en limpio para registrar un artículo completamente nuevo
window.prepararNuevoProducto = function(textoBuscado) {
    // Detectamos si el usuario escribió números (posible código de barras) o letras (posible nombre)
    const esNumero = !isNaN(textoBuscado);

    inputSku.value = ''; // Se deja en blanco para que asigne su codificación manual o autogenerada
    inputBarras.value = esNumero ? textoBuscado : '';
    inputNombre.value = esNumero ? '' : textoBuscado;
    
    // Valores base en cero
    inputCosto.value = '0.00';
    inputGanancia.value = '0.0';
    inputPrecio.value = '0.00';
    inputPrecioBs.value = '0,00 Bs.';
    inputStockViejo.value = '0';
    inputCantidad.value = '1';
    
    dropdown.style.display = 'none';
    if (buscador) buscador.value = '';
    
    // Enfocar directo en SKU para empezar el registro estructurado
    inputSku.focus();
    mostrarMensajeEstado("Modo de creación activo: Rellene el código SKU y los costos.", "success");
};

// Cerrar el cuadro flotante si el usuario hace clic en otra sección
document.addEventListener('click', (e) => {
    if (dropdown && !e.target.closest('.search-wrapper')) {
        dropdown.style.display = 'none';
    }
});

// ==========================================
// 4. LÓGICA MATEMÁTICA (COSTOS, PRECIOS Y TASA)
// ==========================================

// Calcula el Precio de Venta basado en Costo + % Ganancia
window.calcularPreciosCompra = function() {
    const costo = parseFloat(inputCosto.value) || 0;
    const ganancia = parseFloat(inputGanancia.value) || 0;
    
    // Fórmula estándar: Precio = Costo * (1 + Ganancia / 100)
    const precioUsd = costo * (1 + (ganancia / 100));
    inputPrecio.value = precioUsd.toFixed(2);
    
    // Conversor inmediato a Moneda Nacional (Bolívares)
    const precioBs = precioUsd * tasaCambio;
    inputPrecioBs.value = precioBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + " Bs.";
};

// Recalcula el % de Ganancia si el usuario escribe o fuerza el Precio de Venta final manualmente
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

// Escucha por si se ejecuta la búsqueda clásica presionando Enter
window.buscarProductoCompra = function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const criterio = event.target.value.trim();
        if (!criterio) return;

        const exacto = listaProductos.find(p => 
            p.sku.toLowerCase() === criterio.toLowerCase() || 
            (p.barras && p.barras === criterio)
        );

        if (exacto) {
            seleccionarProducto(exacto);
        } else {
            window.prepararNuevoProducto(criterio);
        }
    }
};

// ==========================================
// 5. ENVIAR Y PROCESAR ENTRADA (GUARDADO)
// ==========================================
window.procesarIngresoMercancia = function() {
    const sku = inputSku.value.trim();
    const nombre = inputNombre.value.trim();
    const cantidad = parseInt(inputCantidad.value) || 0;
    const costo = parseFloat(inputCosto.value) || 0;
    const precio = parseFloat(inputPrecio.value) || 0;

    // Validación estricta de seguridad
    if (!sku || !nombre) {
        mostrarMensajeEstado("ERROR: El SKU y el Nombre del artículo son obligatorios.", "error");
        return;
    }
    if (cantidad <= 0) {
        mostrarMensajeEstado("ERROR: La cantidad entrante debe ser mayor a 0.", "error");
        inputCantidad.focus();
        return;
    }

    mostrarMensajeEstado("Procesando actualización en lote de inventario...", "loading");

    // Aquí ejecutas tu push o update a Firebase. Simulación local:
    const indice = listaProductos.findIndex(p => p.sku.toLowerCase() === sku.toLowerCase());
    
    if (indice !== -1) {
        // Actualizar artículo existente (Suma stock viejo + nuevo entrante)
        listaProductos[indice].stock += cantidad;
        listaProductos[indice].costo = costo;
        listaProductos[indice].precio = precio;
        listaProductos[indice].ganancia = parseFloat(inputGanancia.value) || 0;
        listaProductos[indice].barras = inputBarras.value.trim();
    } else {
        // Dar de alta un artículo nuevo en la base de datos
        listaProductos.push({
            sku: sku,
            barras: inputBarras.value.trim(),
            nombre: nombre,
            costo: costo,
            ganancia: parseFloat(inputGanancia.value) || 0,
            precio: precio,
            stock: cantidad
        });
    }

    // Respuesta Exitosa
    setTimeout(() => {
        mostrarMensajeEstado(`¡ÉXITO! Entrada procesada correctamente para: ${nombre}`, "success");
        limpiarFormularioCompleto();
    }, 800);
};

// Helper visual para la barra de estado superior
function mostrarMensajeEstado(mensaje, tipo) {
    if (!statusBar) return;
    statusBar.className = ''; // Limpiar clases
    statusBar.innerText = mensaje;
    statusBar.style.display = 'block';
    
    if (tipo === 'loading') statusBar.classList.add('status-loading');
    if (tipo === 'success') statusBar.classList.add('status-success');
    if (tipo === 'error') statusBar.classList.add('status-error');
}

// Deja el formulario listo para la próxima lectura del operario
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

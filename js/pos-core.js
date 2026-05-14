import { productosMaster, tasaActual, procesarVentaFirebase } from './pos-db-motor.js';

// Variables de estado global de la aplicación
let carrito = [];
let totalVentaUSD = 0;

/**
 * Escuchadores de eventos para sincronización en tiempo real
 */
document.addEventListener('productosActualizados', () => renderizarProductos(productosMaster));
document.addEventListener('tasaActualizada', () => actualizarTotalesUI());

/**
 * Renderiza la lista de productos en el panel izquierdo
 * @param {Array} lista - Array de productos desde Firebase
 */
function renderizarProductos(lista) {
    const grid = document.getElementById('grid-productos');
    if (!grid) return;
    
    grid.innerHTML = "";
    lista.forEach(p => {
        grid.innerHTML += `
            <div class="product-card" onclick="agregarAlCarrito('${p.id}')">
                <div>
                    <b>${p.nombre}</b><br>
                    <small>Stock: ${p.stock}</small>
                </div>
                <div style="text-align:right;">
                    <b>$${p.precio.toFixed(2)}</b>
                </div>
                <i class="fas fa-plus-circle" style="color:var(--electric-blue); text-align:right;"></i>
            </div>`;
    });
}

/**
 * Agrega un producto al carrito o incrementa su cantidad
 * @param {string} id - ID del producto en Firebase
 */
window.agregarAlCarrito = (id) => {
    const producto = productosMaster.find(x => x.id === id);
    
    if (!producto || producto.stock <= 0) {
        console.warn("Producto sin stock o no encontrado");
        return;
    }

    const itemExistente = carrito.find(c => c.id === id);
    
    if (itemExistente) {
        if (itemExistente.cantidad < producto.stock) {
            itemExistente.cantidad++;
        } else {
            alert("Límite de stock alcanzado");
            return;
        }
    } else {
        carrito.push({ ...producto, cantidad: 1 });
    }

    // Efecto de sonido profesional al agregar
    const beep = document.getElementById('beepSound');
    if (beep) beep.play();

    actualizarTotalesUI();
};

/**
 * Actualiza la interfaz del carrito y los montos totales
 */
function actualizarTotalesUI() {
    const listaHTML = document.getElementById('lista-carrito');
    if (!listaHTML) return;

    listaHTML.innerHTML = "";
    totalVentaUSD = 0;

    carrito.forEach((item, index) => {
        const subtotal = item.precio * item.cantidad;
        totalVentaUSD += subtotal;

        listaHTML.innerHTML += `
            <div class="product-card" style="grid-template-columns: 1fr 80px 30px;">
                <span><b>${item.cantidad}x</b> ${item.nombre}</span>
                <b style="text-align:right;">$${subtotal.toFixed(2)}</b>
                <i class="fas fa-trash" style="color:#ef4444; cursor:pointer; text-align:right;" onclick="eliminarDelCarrito(${index})"></i>
            </div>`;
    });

    // Actualizar badges de totales en la UI principal
    document.getElementById('total-usd').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
}

window.eliminarDelCarrito = (index) => {
    carrito.splice(index, 1);
    actualizarTotalesUI();
};

/**
 * LÓGICA DE VENTANA EMERGENTE (POP-UP)
 * Abre el módulo de pago en una ventana separada
 */
document.getElementById('btnCobrar').onclick = () => {
    if (carrito.length === 0) {
        alert("El carrito está vacío");
        return;
    }

    // Configuración de dimensiones para el pop-up centrado
    const ancho = 450;
    const alto = 750;
    const left = (window.screen.width / 2) - (ancho / 2);
    const top = (window.screen.height / 2) - (alto / 2);

    // Abrir ventana pasando los datos necesarios por URL
    const url = `pago.html?total=${totalVentaUSD.toFixed(2)}&tasa=${tasaActual}`;
    const nombreVentana = "CajaYouControl";
    const opciones = `width=${ancho},height=${alto},top=${top},left=${left},resizable=no,scrollbars=no,status=no,location=no,toolbar=no`;

    const popup = window.open(url, nombreVentana, opciones);

    if (!popup) {
        alert("Bloqueador de ventanas emergentes detectado. Por favor, permite los pop-ups para Sistematikos.");
    }
};

/**
 * Escuchador de mensajes (Comunicación entre ventanas)
 * Recibe la señal cuando el pago se completa en la ventana separada
 */
window.addEventListener("message", async (event) => {
    // Validar que el mensaje provenga de nuestra propia ventana de pago
    if (event.data.action === 'VENTA_COMPLETADA') {
        const detallePago = event.data.pagos;

        // Registrar en Firebase a través del motor de base de datos
        const exito = await procesarVentaFirebase(carrito, totalVentaUSD, detallePago);

        if (exito) {
            alert("✅ Venta registrada con éxito");
            carrito = []; // Limpiar carrito tras el éxito
            actualizarTotalesUI();
        } else {
            alert("❌ Error al registrar la venta en la base de datos.");
        }
    }
});

/**
 * Atajos de teclado profesionales
 */
window.onkeydown = (e) => {
    if (e.key === "F9") {
        e.preventDefault();
        document.getElementById('btnCobrar').click();
    }
};

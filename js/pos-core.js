// Importamos funciones del motor (Firebase y datos)
import { productosMaster, tasaActual, procesarVentaFirebase } from './pos-db-motor.js';

let carrito = [];
let totalVentaUSD = 0;

// Inicialización
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('top-tasa').innerText = tasaActual.toFixed(2);
    renderizarProductos(productosMaster);
});

// Renderizar la cuadrícula de productos
function renderizarProductos(lista) {
    const grid = document.getElementById('grid-productos');
    grid.innerHTML = "";
    lista.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div><b>${p.nombre}</b><br><small>Stock: ${p.stock}</small></div>
            <div style="text-align:right;"><b>$${p.precio.toFixed(2)}</b></div>
        `;
        card.onclick = () => agregarAlCarrito(p.id);
        grid.appendChild(card);
    });
}

// Lógica del carrito
function agregarAlCarrito(id) {
    const producto = productosMaster.find(x => x.id === id);
    if (!producto || producto.stock <= 0) return;

    const existe = carrito.find(c => c.id === id);
    if (existe) {
        if (existe.cantidad < producto.stock) existe.cantidad++;
    } else {
        carrito.push({ ...producto, cantidad: 1 });
    }
    
    document.getElementById('beepSound').play();
    actualizarUI();
}

function actualizarUI() {
    const listaHTML = document.getElementById('lista-carrito');
    listaHTML.innerHTML = "";
    totalVentaUSD = 0;

    carrito.forEach((item, index) => {
        totalVentaUSD += (item.precio * item.cantidad);
        listaHTML.innerHTML += `
            <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                <span>${item.cantidad}x ${item.nombre}</span>
                <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
            </div>`;
    });

    document.getElementById('total-usd').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
}

// ABRIR VENTANA DE PAGO (POP-UP)
document.getElementById('btnCobrar').onclick = () => {
    if (carrito.length === 0) return;

    const w = 450, h = 750;
    const left = (screen.width / 2) - (w / 2);
    const top = (screen.height / 2) - (h / 2);

    window.open(
        `pago.html?total=${totalVentaUSD.toFixed(2)}&tasa=${tasaActual}`, 
        "CajaYouControl", 
        `width=${w},height=${h},top=${top},left=${left},resizable=no`
    );
};

// Escuchar confirmación de la ventana de pago
window.addEventListener("message", async (event) => {
    if (event.data.action === 'VENTA_COMPLETADA') {
        const exito = await procesarVentaFirebase(carrito, totalVentaUSD, event.data.pagos);
        if (exito) {
            alert("Venta Registrada");
            carrito = [];
            actualizarUI();
        }
    }
});

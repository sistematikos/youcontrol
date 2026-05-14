import { productosMaster, tasaActual, procesarVentaFirebase } from './pos-db-motor.js';

let carrito = [];
let totalVentaUSD = 0;
let indiceSeleccionado = -1;

const renderizarProductos = (lista) => {
    const grid = document.getElementById('grid-productos');
    if (!grid) return;
    grid.innerHTML = "";
    lista.forEach(p => {
        // Formato: Nombre | Stock | Precio | Icono
        grid.innerHTML += `
        <div class="product-card" onclick="agregar('${p.id}')">
            <span title="${p.nombre}"><b>${p.nombre}</b></span>
            <span style="color:grey; text-align:center;">St: ${p.stock}</span>
            <span style="text-align:right; font-weight:700;">$${p.precio.toFixed(2)}</span>
            <i class="fas fa-plus-circle" style="color:var(--electric-blue); text-align:right;"></i>
        </div>`;
    });
    document.getElementById('txt-tasa').innerText = tasaActual.toLocaleString('es-VE');
};

function actualizarUI() {
    const list = document.getElementById('lista-carrito');
    list.innerHTML = ""; 
    totalVentaUSD = 0;
    carrito.forEach((c, index) => {
        const subtotal = c.precio * c.cantidad;
        totalVentaUSD += subtotal;
        const sel = index === indiceSeleccionado ? 'item-selected' : '';
        // Una sola línea: Cant x Nombre | Subtotal
        list.innerHTML += `
        <div class="product-card ${sel}" onclick="seleccionarItem(${index})">
            <span title="${c.nombre}"><b>${c.cantidad}x</b> ${c.nombre}</span>
            <span style="grid-column: span 2; text-align:right; font-weight:700;">$${subtotal.toFixed(2)}</span>
            <i class="fas fa-chevron-right" style="opacity:0.2; text-align:right;"></i>
        </div>`;
    });
    document.getElementById('total-usd').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
}

// ... (Resto de funciones: agregar, calcularRestante, etc., se mantienen iguales) ...

window.calcularRestante = () => {
    const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const ef = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const dv = parseFloat(document.getElementById('in-divisas-usd').value) || 0;
    const pagadoUSD = dv + ((p + pm + ef) / tasaActual);
    const dif = totalVentaUSD - pagadoUSD;
    const status = document.getElementById('pago-status');
    const btn = document.getElementById('btnConfirmarVenta');

    if (dif <= 0.01) {
        status.style.background = "#D1FAE5"; status.style.color = "#065F46";
        status.innerText = dif < -0.01 ? "CAMBIO LISTO" : "PAGO COMPLETO";
        btn.disabled = false;
    } else {
        status.style.background = "#FEF3C7"; status.style.color = "#92400E";
        status.innerText = `FALTANTE: $ ${dif.toFixed(2)}`;
        btn.disabled = true;
    }
};

// Iniciar render
document.addEventListener('productosActualizados', () => renderizarProductos(productosMaster));
if (productosMaster.length > 0) renderizarProductos(productosMaster);

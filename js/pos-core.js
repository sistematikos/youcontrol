import { productosMaster, tasaActual, procesarVentaFirebase } from './pos-db-motor.js';

let carrito = [];
let totalVentaUSD = 0;
let indiceSeleccionado = -1;

const renderizarProductos = (lista) => {
    const grid = document.getElementById('grid-productos');
    if (!grid) return;
    grid.innerHTML = "";
    
    lista.forEach(p => {
        const precioBS = (p.precio * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        // FILA ÚNICA PERSUASIVA
        grid.innerHTML += `
        <div class="product-card" onclick="agregar('${p.id}')">
            <span title="${p.nombre}"><b>${p.nombre}</b></span>
            <span class="stk-tag">STK: ${p.stock}</span>
            <span class="price-usd">$${p.precio.toFixed(2)}</span>
            <span class="price-bs">${precioBS} Bs</span>
            <i class="fas fa-plus-circle" style="color:var(--royal-blue); font-size:1.2rem; text-align:right;"></i>
        </div>`;
    });
    document.getElementById('txt-tasa').innerText = tasaActual.toLocaleString('es-VE');
};

function actualizarUI() {
    const list = document.getElementById('lista-carrito');
    list.innerHTML = ""; 
    totalVentaUSD = 0;
    
    carrito.forEach((c, index) => {
        const subUSD = c.precio * c.cantidad;
        const subBS = (subUSD * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        totalVentaUSD += subUSD;
        const sel = index === indiceSeleccionado ? 'item-selected' : '';
        
        list.innerHTML += `
        <div class="product-card ${sel}" onclick="seleccionarItem(${index})">
            <span><b>${c.cantidad}x</b> ${c.nombre}</span>
            <span style="grid-column: span 2; text-align:right; font-weight:800; color:var(--royal-blue);">$${subUSD.toFixed(2)}</span>
            <span class="price-bs">${subBS} Bs</span>
            <i class="fas fa-chevron-right" style="opacity:0.3; text-align:right;"></i>
        </div>`;
    });
    
    document.getElementById('total-usd').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
}

// Lógica de Cobro
document.getElementById('btnCobrar').onclick = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModalUSD').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('totalModalBS').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
    document.getElementById('modalPago').style.display = "flex";
    // Inicializar estado de pago...
};

// Iniciar componentes
document.addEventListener('productosActualizados', () => renderizarProductos(productosMaster));
if (productosMaster.length > 0) renderizarProductos(productosMaster);

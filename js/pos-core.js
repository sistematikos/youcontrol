import { productosMaster, tasaActual, procesarVentaFirebase } from './pos-db-motor.js';

let carrito = [];
let totalVentaUSD = 0;
let indiceSeleccionado = -1;

function actualizarUI() {
    const list = document.getElementById('lista-carrito');
    list.innerHTML = ""; 
    totalVentaUSD = 0;
    carrito.forEach((c, index) => {
        const subtotal = c.precio * c.cantidad;
        totalVentaUSD += subtotal;
        const sel = index === indiceSeleccionado ? 'item-selected' : '';
        list.innerHTML += `
        <div class="product-card ${sel}" onclick="seleccionarItem(${index})">
            <span><b>${c.cantidad}x</b> ${c.nombre}</span>
            <span style="text-align:right; font-weight:700;">$${subtotal.toFixed(2)}</span>
            <i class="fas fa-chevron-right" style="opacity:0.2"></i>
        </div>`;
    });
    document.getElementById('total-usd').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
}

// --- TECLADO ---
window.addEventListener('keydown', (e) => {
    const modal = document.getElementById('modalPago');
    if(modal.style.display === "flex") return; 
    
    if (e.key === "F4" && indiceSeleccionado !== -1) {
        e.preventDefault();
        const n = prompt("Cantidad:", carrito[indiceSeleccionado].cantidad);
        if (n && !isNaN(n)) { carrito[indiceSeleccionado].cantidad = parseFloat(n); actualizarUI(); }
    }
    if (e.key === "F9") { e.preventDefault(); document.getElementById('btnCobrar').click(); }
});

// --- PAGO ---
document.getElementById('btnCobrar').onclick = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModalUSD').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('totalModalBS').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
    document.getElementById('modalPago').style.display = "flex"; 
    calcularRestante();
};

window.calcularRestante = () => {
    const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const ef = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const dv = parseFloat(document.getElementById('in-divisas-usd').value) || 0;
    
    const pagadoUSD = dv + ((p + pm + ef) / tasaActual);
    const dif = totalVentaUSD - pagadoUSD;
    
    const status = document.getElementById('pago-status');
    const btn = document.getElementById('btnConfirmarVenta');

    // Tolerancia de 0.01$ para habilitar el botón
    if (dif <= 0.01) {
        status.className = "status-badge status-complete";
        status.innerHTML = dif < -0.01 ? "CAMBIO DISPONIBLE" : "PAGO COMPLETO";
        btn.disabled = false;
    } else {
        status.className = "status-badge status-pending";
        status.innerHTML = `PENDIENTE: $ ${dif.toFixed(2)}`;
        btn.disabled = true;
    }
};

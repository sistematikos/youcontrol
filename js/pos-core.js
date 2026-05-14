import { productosMaster, tasaActual, procesarVentaFirebase } from './pos-db-motor.js';

let carrito = [];
let totalVentaUSD = 0;
let metodoSeleccionado = "Punto de Venta";

document.addEventListener('productosActualizados', () => renderizar(productosMaster));
document.addEventListener('tasaActualizada', () => renderizar(productosMaster));

function renderizar(lista) {
    const grid = document.getElementById('grid-productos');
    if(!grid) return;
    grid.innerHTML = "";
    lista.forEach(p => {
        grid.innerHTML += `
            <div class="product-card" onclick="agregar('${p.id}')">
                <div>
                    <b style="display:block;">${p.nombre}</b>
                    <small style="color:gray;">Stock: ${p.stock}</small>
                </div>
                <div style="text-align:right;"><b>$${p.precio.toFixed(2)}</b></div>
                <i class="fas fa-plus-circle" style="color:var(--electric-blue); text-align:right;"></i>
            </div>`;
    });
}

window.agregar = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p || p.stock <= 0) return;
    const existe = carrito.find(c => c.id === id);
    if (existe) existe.cantidad++;
    else carrito.push({...p, cantidad: 1});
    actualizarUI();
    document.getElementById('beepSound').play();
};

function actualizarUI() {
    const list = document.getElementById('lista-carrito');
    list.innerHTML = ""; 
    totalVentaUSD = 0;
    carrito.forEach(c => {
        totalVentaUSD += (c.precio * c.cantidad);
        list.innerHTML += `<div class="cart-item">
            <span><b>${c.cantidad}x</b> ${c.nombre}</span>
            <b style="float:right;">$${(c.precio * c.cantidad).toFixed(2)}</b>
        </div>`;
    });
    document.getElementById('total-usd').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE', {minimumFractionDigits:2})} Bs.`;
}

// INTELIGENCIA DE AUTOCUMPLETADO
window.autoCompletar = (moneda, metodo) => {
    metodoSeleccionado = metodo;
    const actualUSD = parseFloat(document.getElementById('in-efectivo-usd').value) || 0;
    const actualBS = parseFloat(document.getElementById('in-electronico-bs').value) || 0;

    if (moneda === 'usd') {
        // Calcula cuánto falta en USD restando lo que ya hay en BS
        const faltanteUSD = totalVentaUSD - (actualBS / tasaActual);
        document.getElementById('in-efectivo-usd').value = faltanteUSD > 0 ? faltanteUSD.toFixed(2) : 0;
    } else {
        // Calcula cuánto falta en BS restando lo que ya hay en USD
        const faltanteBS = (totalVentaUSD - actualUSD) * tasaActual;
        document.getElementById('in-electronico-bs').value = faltanteBS > 0 ? faltanteBS.toFixed(2) : 0;
    }
    calcularRestante();
};

window.calcularRestante = () => {
    const pUSD = parseFloat(document.getElementById('in-efectivo-usd').value) || 0;
    const pBS = parseFloat(document.getElementById('in-electronico-bs').value) || 0;
    
    const totalPagadoUSD = pUSD + (pBS / tasaActual);
    const dif = totalVentaUSD - totalPagadoUSD;
    
    const status = document.getElementById('pago-status');
    const btn = document.getElementById('btnConfirmarVenta');

    if (dif <= 0.01) { // Pago cubierto (margen decimal)
        status.className = "status-badge status-complete";
        status.innerHTML = dif < -0.01 ? `CAMBIO: $ ${Math.abs(dif).toFixed(2)}` : "MONTO CUBIERTO";
        btn.disabled = false;
    } else {
        status.className = "status-badge status-pending";
        status.innerHTML = `FALTAN: $ ${dif.toFixed(2)}`;
        btn.disabled = true;
    }
};

document.getElementById('btnCobrar').onclick = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModalUSD').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('totalModalBS').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE', {minimumFractionDigits:2})} Bs.`;
    document.getElementById('modalPago').style.display = "block";
    
    // Reset inputs al abrir
    document.getElementById('in-efectivo-usd').value = 0;
    document.getElementById('in-electronico-bs').value = 0;
    calcularRestante();
};

document.getElementById('btnConfirmarVenta').onclick = async () => {
    const dataPago = {
        usd: parseFloat(document.getElementById('in-efectivo-usd').value) || 0,
        bs: parseFloat(document.getElementById('in-electronico-bs').value) || 0,
        metodo: metodoSeleccionado
    };
    const ok = await procesarVentaFirebase(carrito, totalVentaUSD, dataPago);
    if (ok) {
        alert("¡Venta Exitosa!");
        carrito = []; actualizarUI();
        document.getElementById('modalPago').style.display = "none";
    }
};

document.getElementById('btnCerrarModal').onclick = () => document.getElementById('modalPago').style.display = "none";

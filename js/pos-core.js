import { productosMaster, tasaActual, procesarVentaFirebase } from './pos-db-motor.js';

let carrito = [];
let totalVentaUSD = 0;
let indiceSeleccionado = -1;

// --- RENDER ---
const renderizarProductos = (lista) => {
    const grid = document.getElementById('grid-productos');
    if (!grid) return;
    grid.innerHTML = "";
    lista.forEach(p => {
        grid.innerHTML += `
        <div class="product-card" onclick="agregar('${p.id}')">
            <div><b>${p.nombre}</b><br><small>Stock: ${p.stock}</small></div>
            <div style="text-align:right;"><b>$${p.precio.toFixed(2)}</b></div>
            <i class="fas fa-plus-circle" style="color:var(--electric-blue); margin-left:10px;"></i>
        </div>`;
    });
    document.getElementById('txt-tasa').innerText = tasaActual.toLocaleString('es-VE');
};

document.addEventListener('productosActualizados', () => renderizarProductos(productosMaster));
if (productosMaster.length > 0) renderizarProductos(productosMaster);

// --- CARRITO ---
window.agregar = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p || p.stock <= 0) return;
    const existe = carrito.find(c => c.id === id);
    if (existe) existe.cantidad++;
    else carrito.push({ ...p, cantidad: 1 });
    indiceSeleccionado = carrito.length - 1;
    actualizarUI();
    document.getElementById('beepSound').play();
};

window.seleccionarItem = (index) => {
    indiceSeleccionado = index;
    actualizarUI();
};

function actualizarUI() {
    const list = document.getElementById('lista-carrito');
    list.innerHTML = ""; 
    totalVentaUSD = 0;
    carrito.forEach((c, index) => {
        const subtotal = c.precio * c.cantidad;
        totalVentaUSD += subtotal;
        const sel = index === indiceSeleccionado ? 'item-selected' : '';
        list.innerHTML += `
        <div class="product-card ${sel}" onclick="seleccionarItem(${index})" style="border-bottom:1px solid #f1f1f1;">
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
    if(document.getElementById('modalPago').style.display === "flex") return;
    if (indiceSeleccionado === -1 && e.key !== "F9") return;

    if (e.key === "F4") {
        e.preventDefault();
        const n = prompt("Cantidad:", carrito[indiceSeleccionado].cantidad);
        if (n && !isNaN(n)) { carrito[indiceSeleccionado].cantidad = parseFloat(n); actualizarUI(); }
    }
    if (e.key === "F5") {
        e.preventDefault();
        const p = prompt("Precio:", carrito[indiceSeleccionado].precio);
        if (p && !isNaN(p)) { carrito[indiceSeleccionado].precio = parseFloat(p); actualizarUI(); }
    }
    if (e.key === "F6") {
        e.preventDefault();
        carrito.splice(indiceSeleccionado, 1);
        indiceSeleccionado = carrito.length - 1;
        actualizarUI();
    }
    if (e.key === "F9") { e.preventDefault(); document.getElementById('btnCobrar').click(); }
});

// --- PAGO ---
document.getElementById('btnCobrar').onclick = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModalUSD').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('totalModalBS').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
    document.getElementById('modalPago').style.display = "flex"; // USAR FLEX PARA CENTRAR
    ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd'].forEach(id => document.getElementById(id).value = 0);
    calcularRestante();
};

document.getElementById('btnCerrarModal').onclick = () => document.getElementById('modalPago').style.display = "none";

window.autoCompletar = (tipo) => {
    const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const ef = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const dv = parseFloat(document.getElementById('in-divisas-usd').value) || 0;
    const cubiertoUSD = dv + ((p + pm + ef) / tasaActual);
    const faltanteUSD = totalVentaUSD - cubiertoUSD;
    if (faltanteUSD <= 0) return;

    if (tipo === 'divisas') document.getElementById('in-divisas-usd').value = (dv + faltanteUSD).toFixed(2);
    else {
        const faltanteBS = (faltanteUSD * tasaActual);
        if (tipo === 'punto') document.getElementById('in-punto-bs').value = (p + faltanteBS).toFixed(2);
        if (tipo === 'pagomovil') document.getElementById('in-pagomovil-bs').value = (pm + faltanteBS).toFixed(2);
        if (tipo === 'efectivo') document.getElementById('in-efectivo-bs').value = (ef + faltanteBS).toFixed(2);
    }
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

    // MARGEN DE TOLERANCIA DE 0.01 PARA HABILITAR BOTÓN
    if (dif <= 0.01) {
        status.className = "status-badge status-complete";
        status.innerHTML = dif < -0.01 ? `CAMBIO: $ ${Math.abs(dif).toFixed(2)}` : "PAGO COMPLETO";
        btn.disabled = false;
    } else {
        status.className = "status-badge status-pending";
        status.innerHTML = `PENDIENTE: $ ${dif.toFixed(2)}`;
        btn.disabled = true;
    }
};

document.getElementById('btnConfirmarVenta').onclick = async () => {
    const pago = {
        punto: parseFloat(document.getElementById('in-punto-bs').value),
        pagomovil: parseFloat(document.getElementById('in-pagomovil-bs').value),
        efectivo_bs: parseFloat(document.getElementById('in-efectivo-bs').value),
        divisas: parseFloat(document.getElementById('in-divisas-usd').value),
        tasa: tasaActual
    };
    if (await procesarVentaFirebase(carrito, totalVentaUSD, pago)) {
        alert("Venta Exitosa");
        carrito = []; indiceSeleccionado = -1; actualizarUI();
        document.getElementById('modalPago').style.display = "none";
    }
};

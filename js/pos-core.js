import { productosMaster, tasaActual, procesarVentaFirebase } from './pos-db-motor.js';

let carrito = [];
let totalVentaUSD = 0;

// --- RENDERIZADO ---
const renderizar = (lista) => {
    const grid = document.getElementById('grid-productos');
    if(!grid) return;
    grid.innerHTML = "";
    lista.forEach(p => {
        grid.innerHTML += `
        <div class="product-card" onclick="agregar('${p.id}')">
            <div><b>${p.nombre}</b><br><small>Stock: ${p.stock}</small></div>
            <div style="text-align:right;"><b>$${p.precio.toFixed(2)}</b></div>
        </div>`;
    });
    document.getElementById('val-tasa').innerText = tasaActual.toFixed(2);
};

// Escuchar actualizaciones de Firebase
document.addEventListener('productosActualizados', () => renderizar(productosMaster));
document.addEventListener('tasaActualizada', () => renderizar(productosMaster));

// SEGURIDAD: Si al cargar el JS ya hay productos, renderiza de una vez
if (productosMaster && productosMaster.length > 0) renderizar(productosMaster);

// --- LÓGICA DE CARRITO ---
window.agregar = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p || p.stock <= 0) return;
    const existe = carrito.find(c => c.id === id);
    if (existe) existe.cantidad++;
    else carrito.push({...p, cantidad: 1});
    
    document.getElementById('beepSound').play();
    actualizarUI();
};

function actualizarUI() {
    const list = document.getElementById('lista-carrito');
    list.innerHTML = ""; totalVentaUSD = 0;
    carrito.forEach(c => {
        totalVentaUSD += (c.precio * c.cantidad);
        list.innerHTML += `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
            <span>${c.cantidad}x ${c.nombre}</span>
            <b>$${(c.precio * c.cantidad).toFixed(2)}</b>
        </div>`;
    });
    document.getElementById('total-usd').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
}

// --- MODAL DE PAGO ---
document.getElementById('btnCobrar').onclick = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModalUSD').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('totalModalBS').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
    document.getElementById('modalPago').style.display = "flex";
    calcularRestante();
};

window.cerrarModal = () => document.getElementById('modalPago').style.display = "none";

window.calcularRestante = () => {
    const pmBS = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const divUSD = parseFloat(document.getElementById('in-divisas-usd').value) || 0;
    
    const pagadoUSD = divUSD + (pmBS / tasaActual);
    const dif = totalVentaUSD - pagadoUSD;
    
    const status = document.getElementById('pago-status');
    const btn = document.getElementById('btnConfirmarVenta');

    if (dif <= 0.01) {
        status.className = "status-badge status-complete";
        status.innerText = "PAGO COMPLETO";
        btn.disabled = false;
    } else {
        status.className = "status-badge status-pending";
        status.innerText = `FALTAN: $ ${dif.toFixed(2)}`;
        btn.disabled = true;
    }
};

document.getElementById('btnConfirmarVenta').onclick = async () => {
    const pago = {
        pagomovil: parseFloat(document.getElementById('in-pagomovil-bs').value) || 0,
        divisas: parseFloat(document.getElementById('in-divisas-usd').value) || 0,
        tasa: tasaActual
    };
    
    if (await procesarVentaFirebase(carrito, totalVentaUSD, pago)) {
        alert("Venta Registrada!");
        carrito = []; 
        actualizarUI();
        cerrarModal();
    }
};

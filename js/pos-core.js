import { productosMaster, tasaActual, procesarVentaFirebase } from './pos-db-motor.js';

let carrito = [];
let totalVentaUSD = 0;

document.addEventListener('productosActualizados', () => renderizar(productosMaster));
document.addEventListener('tasaActualizada', () => renderizar(productosMaster));

function renderizar(lista) {
    const grid = document.getElementById('grid-productos');
    grid.innerHTML = "";
    lista.forEach(p => {
        grid.innerHTML += `
            <div class="product-card" onclick="agregar('${p.id}')">
                <b>${p.nombre}</b>
                <div style="text-align:right;"><b>$${p.precio.toFixed(2)}</b></div>
                <div style="text-align:right; font-size:0.8rem; color:gray;">Stock: ${p.stock}</div>
                <i class="fas fa-plus-circle" style="color:var(--electric-blue);"></i>
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
};

function actualizarUI() {
    const list = document.getElementById('lista-carrito');
    list.innerHTML = ""; 
    totalVentaUSD = 0;

    carrito.forEach(c => {
        totalVentaUSD += (c.precio * c.cantidad);
        list.innerHTML += `<div class="cart-item">
            <span><b>${c.cantidad}x</b> ${c.nombre}</span>
            <b>$${(c.precio * c.cantidad).toFixed(2)}</b>
        </div>`;
    });

    document.getElementById('total-usd').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
}

// LÓGICA DEL MODAL MIXTO
window.calcularRestante = () => {
    const pagoUSD = parseFloat(document.getElementById('in-efectivo-usd').value) || 0;
    const pagoBS = parseFloat(document.getElementById('in-electronico-bs').value) || 0;
    
    // Convertimos lo que pagó en Bs a USD para restar del total
    const pagoBSTraducidoAUSD = pagoBS / tasaActual;
    const totalPagadoEnUSD = pagoUSD + pagoBSTraducidoAUSD;
    
    const restante = totalVentaUSD - totalPagadoEnUSD;
    const statusDiv = document.getElementById('pago-status');
    const btn = document.getElementById('btnConfirmarVenta');

    if (restante <= 0.01) { // Pago completo o vuelto
        statusDiv.className = "status-badge status-complete";
        statusDiv.innerHTML = restante < -0.01 
            ? `CAMBIO A ENTREGAR: $ ${Math.abs(restante).toFixed(2)}` 
            : "¡PAGO COMPLETADO!";
        btn.disabled = false;
    } else {
        statusDiv.className = "status-badge status-pending";
        statusDiv.innerHTML = `FALTAN: $ ${restante.toFixed(2)}`;
        btn.disabled = true;
    }
};

document.getElementById('btnCobrar').onclick = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModalUSD').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('totalModalBS').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
    document.getElementById('modalPago').style.display = "block";
    
    // Reset inputs
    document.getElementById('in-efectivo-usd').value = 0;
    document.getElementById('in-electronico-bs').value = 0;
    calcularRestante();
};

document.getElementById('btnConfirmarVenta').onclick = async () => {
    const desglose = {
        usd: parseFloat(document.getElementById('in-efectivo-usd').value) || 0,
        bs: parseFloat(document.getElementById('in-electronico-bs').value) || 0
    };

    const exito = await procesarVentaFirebase(carrito, totalVentaUSD, desglose);
    if (exito) {
        alert("Venta registrada con éxito");
        carrito = []; actualizarUI();
        document.getElementById('modalPago').style.display = "none";
    }
};

document.getElementById('btnCerrarModal').onclick = () => document.getElementById('modalPago').style.display = "none";

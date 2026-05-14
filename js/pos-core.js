import { productosMaster, tasaActual, procesarVentaFirebase } from './pos-db-motor.js';

let carrito = [];
let totalVentaUSD = 0;

document.addEventListener('productosActualizados', () => renderizar(productosMaster));
document.addEventListener('tasaActualizada', () => renderizar(productosMaster));

function renderizar(lista) {
    const grid = document.getElementById('grid-productos');
    if(!grid) return;
    grid.innerHTML = "";
    lista.forEach(p => {
        grid.innerHTML += `<div class="product-card" onclick="agregar('${p.id}')">
            <div><b>${p.nombre}</b><br><small>Stock: ${p.stock}</small></div>
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
    list.innerHTML = ""; totalVentaUSD = 0;
    carrito.forEach(c => {
        totalVentaUSD += (c.precio * c.cantidad);
        list.innerHTML += `<div class="cart-item"><span><b>${c.cantidad}x</b> ${c.nombre}</span><b style="float:right;">$${(c.precio * c.cantidad).toFixed(2)}</b></div>`;
    });
    document.getElementById('total-usd').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
}

window.autoCompletar = (tipo) => {
    const punto = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pmovil = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const efecBS = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const divUSD = parseFloat(document.getElementById('in-divisas-usd').value) || 0;

    const pagadoUSD = divUSD + ((punto + pmovil + efecBS) / tasaActual);
    const faltanteUSD = totalVentaUSD - pagadoUSD;

    if (faltanteUSD <= 0) return;

    if (tipo === 'divisas') {
        document.getElementById('in-divisas-usd').value = (divUSD + faltanteUSD).toFixed(2);
    } else {
        const faltanteBS = faltanteUSD * tasaActual;
        if (tipo === 'punto') document.getElementById('in-punto-bs').value = (punto + faltanteBS).toFixed(2);
        if (tipo === 'pagomovil') document.getElementById('in-pagomovil-bs').value = (pmovil + faltanteBS).toFixed(2);
        if (tipo === 'efectivo') document.getElementById('in-efectivo-bs').value = (efecBS + faltanteBS).toFixed(2);
    }
    calcularRestante();
};

window.calcularRestante = () => {
    const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const eb = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const du = parseFloat(document.getElementById('in-divisas-usd').value) || 0;
    
    const pagadoUSD = du + ((p + pm + eb) / tasaActual);
    const dif = totalVentaUSD - pagadoUSD;
    const status = document.getElementById('pago-status');
    const btn = document.getElementById('btnConfirmarVenta');

    if (dif <= 0.01) {
        status.className = "status-badge status-complete";
        status.innerHTML = dif < -0.01 ? `CAMBIO: $ ${Math.abs(dif).toFixed(2)}` : "PAGO COMPLETO";
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
    document.getElementById('totalModalBS').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
    document.getElementById('modalPago').style.display = "block";
    document.querySelectorAll('#modalPago input').forEach(i => i.value = 0);
    calcularRestante();
};

document.getElementById('btnConfirmarVenta').onclick = async () => {
    const data = {
        p: parseFloat(document.getElementById('in-punto-bs').value),
        pm: parseFloat(document.getElementById('in-pagomovil-bs').value),
        eb: parseFloat(document.getElementById('in-efectivo-bs').value),
        du: parseFloat(document.getElementById('in-divisas-usd').value),
        t: tasaActual
    };
    if (await procesarVentaFirebase(carrito, totalVentaUSD, data)) {
        alert("Venta Exitosa");
        carrito = []; actualizarUI();
        document.getElementById('modalPago').style.display = "none";
    }
};

document.getElementById('btnCerrarModal').onclick = () => document.getElementById('modalPago').style.display = "none";

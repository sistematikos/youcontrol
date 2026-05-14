import { productosMaster, tasaActual, procesarVentaFirebase } from './pos-db-motor.js';

let carrito = [];
let totalVentaUSD = 0;

// 1. Escuchar eventos (para cambios en tiempo real)
document.addEventListener('productosActualizados', () => renderizar(productosMaster));
document.addEventListener('tasaActualizada', () => renderizar(productosMaster));

// 2. DISPARO MANUAL (El error estaba aquí: si ya hay productos, renderiza ya)
if (productosMaster && productosMaster.length > 0) {
    renderizar(productosMaster);
}

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

// Globalizar 'agregar' para que el onclick del HTML lo vea
window.agregar = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p || p.stock <= 0) return;
    const existe = carrito.find(c => c.id === id);
    if (existe) existe.cantidad++;
    else carrito.push({...p, cantidad: 1});
    actualizarUI();
    const beep = document.getElementById('beepSound');
    if(beep) beep.play();
};

function actualizarUI() {
    const list = document.getElementById('lista-carrito');
    if(!list) return;
    list.innerHTML = ""; 
    totalVentaUSD = 0;
    carrito.forEach(c => {
        totalVentaUSD += (c.precio * c.cantidad);
        list.innerHTML += `<div class="product-card" style="grid-template-columns: 1fr 80px;">
            <span><b>${c.cantidad}x</b> ${c.nombre}</span>
            <b style="text-align:right;">$${(c.precio * c.cantidad).toFixed(2)}</b>
        </div>`;
    });
    document.getElementById('total-usd').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
}

// Lógica de Modal de Pago (Tu lógica original mejorada)
const btnCobrar = document.getElementById('btnCobrar');
if(btnCobrar) {
    btnCobrar.onclick = () => {
        if (carrito.length === 0) return;
        document.getElementById('totalModalUSD').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
        document.getElementById('totalModalBS').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
        
        const modal = document.getElementById('modalPago');
        modal.style.display = "flex";
        
        ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = 0;
        });
        calcularRestante();
    };
}

window.cerrarModal = () => document.getElementById('modalPago').style.display = "none";

window.autoCompletar = (tipo) => {
    const pBS = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pmBS = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const eBS = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const dUSD = parseFloat(document.getElementById('in-divisas-usd').value) || 0;

    const cubiertoUSD = dUSD + ((pBS + pmBS + eBS) / tasaActual);
    const faltanteUSD = totalVentaUSD - cubiertoUSD;

    if (faltanteUSD <= 0) return;

    if (tipo === 'divisas') {
        document.getElementById('in-divisas-usd').value = (dUSD + faltanteUSD).toFixed(2);
    } else {
        const faltanteBS = faltanteUSD * tasaActual;
        if (tipo === 'punto') document.getElementById('in-punto-bs').value = (pBS + faltanteBS).toFixed(2);
        if (tipo === 'pagomovil') document.getElementById('in-pagomovil-bs').value = (pmBS + faltanteBS).toFixed(2);
        if (tipo === 'efectivo') document.getElementById('in-efectivo-bs').value = (eBS + faltanteBS).toFixed(2);
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

const btnConfirmar = document.getElementById('btnConfirmarVenta');
if(btnConfirmar) {
    btnConfirmar.onclick = async () => {
        const pago = {
            punto: parseFloat(document.getElementById('in-punto-bs').value),
            pagomovil: parseFloat(document.getElementById('in-pagomovil-bs').value),
            efectivo_bs: parseFloat(document.getElementById('in-efectivo-bs').value),
            divisas: parseFloat(document.getElementById('in-divisas-usd').value),
            tasa: tasaActual
        };
        if (await procesarVentaFirebase(carrito, totalVentaUSD, pago)) {
            alert("¡Venta registrada con éxito!");
            carrito = []; 
            actualizarUI();
            cerrarModal();
        }
    };
}

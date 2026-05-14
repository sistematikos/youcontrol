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
        // Fila optimizada: Nombre | Stock | Precio $ | Precio Bs | Icono
        grid.innerHTML += `
        <div class="product-card" onclick="agregar('${p.id}')">
            <span style="overflow:hidden; text-overflow:ellipsis;"><b>${p.nombre}</b></span>
            <span style="color:#64748b; text-align:center;">Stk: ${p.stock}</span>
            <span style="text-align:right; font-weight:700; color:var(--electric-blue);">$${p.precio.toFixed(2)}</span>
            <span style="text-align:right; font-weight:600; color:#475569;">${precioBS} Bs</span>
            <i class="fas fa-plus-circle" style="color:#cbd5e1; text-align:right; font-size:1.1rem;"></i>
        </div>`;
    });
    document.getElementById('txt-tasa').innerText = tasaActual.toLocaleString('es-VE');
};

function actualizarUI() {
    const list = document.getElementById('lista-carrito');
    list.innerHTML = ""; 
    totalVentaUSD = 0;
    
    carrito.forEach((c, index) => {
        const subtotalUSD = c.precio * c.cantidad;
        const subtotalBS = (subtotalUSD * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        totalVentaUSD += subtotalUSD;
        
        const sel = index === indiceSeleccionado ? 'item-selected' : '';
        
        // Carrito optimizado en una línea
        list.innerHTML += `
        <div class="product-card ${sel}" onclick="seleccionarItem(${index})">
            <span><b>${c.cantidad}x</b> ${c.nombre}</span>
            <span style="grid-column: span 2; text-align:right; font-weight:700;">$${subtotalUSD.toFixed(2)}</span>
            <span style="text-align:right; font-size:0.7rem; opacity:0.6;">${subtotalBS} Bs</span>
            <i class="fas fa-chevron-right" style="opacity:0.2; text-align:right;"></i>
        </div>`;
    });
    
    document.getElementById('total-usd').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
}

// --- FUNCIONES ADICIONALES ---

window.agregar = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p || p.stock <= 0) return;
    const existe = carrito.find(c => c.id === id);
    if (existe) existe.cantidad++;
    else carrito.push({ ...p, cantidad: 1 });
    indiceSeleccionado = carrito.length - 1;
    actualizarUI();
};

window.seleccionarItem = (index) => {
    indiceSeleccionado = index;
    actualizarUI();
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

    if (dif <= 0.01) {
        status.style.background = "#D1FAE5"; status.style.color = "#065F46";
        status.innerText = "PAGO COMPLETADO";
        btn.disabled = false;
    } else {
        status.style.background = "#FEF3C7"; status.style.color = "#92400E";
        status.innerText = `RESTA: $ ${dif.toFixed(2)}`;
        btn.disabled = true;
    }
};

document.addEventListener('productosActualizados', () => renderizarProductos(productosMaster));
if (productosMaster.length > 0) renderizarProductos(productosMaster);

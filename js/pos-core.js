import { productosMaster, tasaActual, procesarVentaFirebase } from './pos-db-motor.js';

let carrito = [];
let totalVentaUSD = 0;
let indiceSeleccionado = -1; // Para saber qué producto del carrito estamos editando

// --- RENDERIZADO DE PRODUCTOS ---
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

// --- GESTIÓN DEL CARRITO ---
window.agregar = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p || p.stock <= 0) return;
    
    const existe = carrito.find(c => c.id === id);
    if (existe) {
        existe.cantidad++;
    } else {
        carrito.push({ ...p, cantidad: 1 });
    }
    indiceSeleccionado = carrito.length - 1; // Seleccionar el último agregado
    actualizarUI();
    document.getElementById('beepSound').play();
};

function actualizarUI() {
    const list = document.getElementById('lista-carrito');
    list.innerHTML = ""; 
    totalVentaUSD = 0;

    carrito.forEach((c, index) => {
        const subtotal = c.precio * c.cantidad;
        totalVentaUSD += subtotal;
        
        const isSelected = index === indiceSeleccionado ? 'border: 2px solid var(--electric-blue); background: #EBF4FF;' : '';
        
        list.innerHTML += `
        <div class="product-card" style="${isSelected} border-radius:10px; margin-bottom:5px;" onclick="seleccionarItem(${index})">
            <span><b>${c.cantidad}x</b> ${c.nombre}</span>
            <span style="text-align:right;">$${subtotal.toFixed(2)}</span>
            <i class="fas fa-chevron-right" style="opacity:0.3"></i>
        </div>`;
    });

    document.getElementById('total-usd').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
}

window.seleccionarItem = (index) => {
    indiceSeleccionado = index;
    actualizarUI();
};

// --- ATAJOS DE TECLADO (F4, F5, F6, F9) ---
window.addEventListener('keydown', (e) => {
    if (indiceSeleccionado === -1 && e.key !== "F9") return;

    if (e.key === "F4") { // Cambiar Cantidad
        e.preventDefault();
        const nuevaCant = parseFloat(prompt(`Nueva cantidad para: ${carrito[indiceSeleccionado].nombre}`, carrito[indiceSeleccionado].cantidad));
        if (!isNaN(nuevaCant) && nuevaCant > 0) {
            carrito[indiceSeleccionado].cantidad = nuevaCant;
            actualizarUI();
        }
    }

    if (e.key === "F5") { // Cambiar Precio (Manual)
        e.preventDefault();
        const nuevoPrecio = parseFloat(prompt(`Nuevo precio para: ${carrito[indiceSeleccionado].nombre}`, carrito[indiceSeleccionado].precio));
        if (!isNaN(nuevoPrecio) && nuevoPrecio >= 0) {
            carrito[indiceSeleccionado].precio = nuevoPrecio;
            actualizarUI();
        }
    }

    if (e.key === "F6") { // Eliminar Item
        e.preventDefault();
        carrito.splice(indiceSeleccionado, 1);
        indiceSeleccionado = carrito.length > 0 ? carrito.length - 1 : -1;
        actualizarUI();
    }

    if (e.key === "F9") { // Cobrar
        e.preventDefault();
        document.getElementById('btnCobrar').click();
    }
});

// --- LÓGICA DEL MODAL DE PAGO ---
document.getElementById('btnCobrar').onclick = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModalUSD').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('totalModalBS').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
    document.getElementById('modalPago').style.display = "block";
    
    // Reset inputs
    ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd'].forEach(id => document.getElementById(id).value = 0);
    calcularRestante();
};

document.getElementById('btnCerrarModal').onclick = () => {
    document.getElementById('modalPago').style.display = "none";
};

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
        alert("¡Venta Exitosa!");
        carrito = [];
        indiceSeleccionado = -1;
        actualizarUI();
        document.getElementById('modalPago').style.display = "none";
    }
};

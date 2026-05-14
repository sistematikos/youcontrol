import { productosMaster, tasaActual } from './pos-db-motor.js';

// --- ESTADO GLOBAL ---
let carrito = [];
let totalVentaUSD = 0;
let indiceSeleccionado = -1;

// --- RENDERIZADO DE BÚSQUEDA ---
const renderizarProductos = (lista) => {
    const grid = document.getElementById('grid-productos');
    if (!grid) return;
    grid.innerHTML = "";
    lista.forEach(p => {
        const precioBS = (p.precio * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        grid.innerHTML += `
        <div class="single-line-row grid-search" onclick="agregar('${p.id}')">
            <span style="overflow:hidden; text-overflow:ellipsis;"><b>${p.nombre}</b></span>
            <span style="color:#64748b; text-align:center;">Stk: ${p.stock}</span>
            <span class="price-vibrant">$${p.precio.toFixed(2)}</span>
            <span class="price-soft">${precioBS} Bs</span>
            <i class="fas fa-plus-circle" style="color:var(--royal-blue); text-align:right;"></i>
        </div>`;
    });
    
    const txtTasa = document.getElementById('txt-tasa');
    if (txtTasa) txtTasa.innerText = tasaActual.toLocaleString('es-VE');
};

// --- LÓGICA DEL CARRITO ---
window.agregar = (id) => {
    // Si el modal de pago está abierto, no permitir agregar más productos
    if (document.getElementById('modalPago').style.display === "flex") return;

    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const existe = carrito.find(c => c.id === id);
    if (existe) {
        existe.cantidad++;
    } else {
        carrito.push({ ...p, cantidad: 1 });
    }
    indiceSeleccionado = carrito.findIndex(c => c.id === id);
    actualizarUI();
};

function actualizarUI() {
    const list = document.getElementById('lista-carrito');
    if (!list) return;
    list.innerHTML = ""; 
    totalVentaUSD = 0;
    
    carrito.forEach((c, index) => {
        const subUSD = c.precio * c.cantidad;
        totalVentaUSD += subUSD;
        const sel = index === indiceSeleccionado ? 'item-selected' : '';
        list.innerHTML += `
        <div class="single-line-row grid-cart ${sel}" onclick="seleccionarItem(${index})">
            <span><b>${c.cantidad}x</b> ${c.nombre}</span>
            <span class="price-vibrant">$${subUSD.toFixed(2)}</span>
            <span class="price-soft">${(subUSD * tasaActual).toLocaleString('es-VE')} Bs</span>
            <i class="fas fa-chevron-right" style="opacity:0.2; text-align:right;"></i>
        </div>`;
    });
    
    document.getElementById('total-usd').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
}

window.seleccionarItem = (index) => { 
    if (document.getElementById('modalPago').style.display === "flex") return;
    indiceSeleccionado = index; 
    actualizarUI(); 
};

// --- MOTOR DE COBRO Y AUTOCOMPLETADO ---

window.abrirModalCobro = () => {
    if (carrito.length === 0) return;
    
    document.getElementById('totalModalUSD').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('totalModalBS').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs`;
    document.getElementById('modalPago').style.display = "flex";
    
    // Limpiar campos al abrir para evitar montos residuales
    ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd'].forEach(id => {
        document.getElementById(id).value = "";
    });
    
    window.calcularRestante();
};

window.autoCompletar = (tipo) => {
    const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const ef = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const dv = parseFloat(document.getElementById('in-divisas-usd').value) || 0;

    let pagadoOtrosUSD = 0;
    if (tipo !== 'punto') pagadoOtrosUSD += (p / tasaActual);
    if (tipo !== 'pagomovil') pagadoOtrosUSD += (pm / tasaActual);
    if (tipo !== 'efectivo') pagadoOtrosUSD += (ef / tasaActual);
    if (tipo !== 'divisas') pagadoOtrosUSD += dv;

    const faltanteUSD = totalVentaUSD - pagadoOtrosUSD;

    if (faltanteUSD > 0.001) {
        if (tipo === 'divisas') {
            document.getElementById('in-divisas-usd').value = faltanteUSD.toFixed(2);
        } else {
            const faltanteBS = faltanteUSD * tasaActual;
            document.getElementById(`in-${tipo}-bs`).value = faltanteBS.toFixed(2);
        }
    }
    window.calcularRestante();
};

window.calcularRestante = () => {
    const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const ef = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const dv = parseFloat(document.getElementById('in-divisas-usd').value) || 0;

    const totalPagadoUSD = dv + ((p + pm + ef) / tasaActual);
    const faltante = totalVentaUSD - totalPagadoUSD;
    const status = document.getElementById('pago-status');
    const btn = document.getElementById('btnConfirmarVenta');

    if (faltante <= 0.01) {
        status.style.background = "#D1FAE5"; 
        status.style.color = "#065F46";
        status.innerText = faltante < -0.01 ? "CAMBIO LISTO" : "PAGO COMPLETO";
        btn.disabled = false;
        btn.style.opacity = "1";
    } else {
        status.style.background = "#FEF3C7"; 
        status.style.color = "#92400E";
        status.innerText = `FALTANTE: $ ${faltante.toFixed(2)}`;
        btn.disabled = true;
        btn.style.opacity = "0.2";
    }
};

// --- GESTIÓN DE TECLADO RESTRINGIDA ---
window.addEventListener('keydown', (e) => {
    const modal = document.getElementById('modalPago');
    const isModalOpen = modal && modal.style.display === "flex";

    // F9 siempre funciona para abrir el modal si hay productos
    if (e.key === "F9") {
        e.preventDefault();
        if (!isModalOpen) window.abrirModalCobro();
        return;
    }

    // BLOQUEO: Si el modal está abierto, las teclas F4, F5 y F6 no hacen nada
    if (isModalOpen) return;

    // Solo si el modal está CERRADO y hay algo seleccionado
    if (indiceSeleccionado !== -1) {
        if (e.key === "F4") {
            e.preventDefault();
            const n = prompt("Cantidad:", carrito[indiceSeleccionado].cantidad);
            if (n !== null && n > 0) { 
                carrito[indiceSeleccionado].cantidad = parseFloat(n); 
                actualizarUI(); 
            }
        }
        if (e.key === "F5") {
            e.preventDefault();
            const n = prompt("Precio USD:", carrito[indiceSeleccionado].precio);
            if (n !== null && n >= 0) { 
                carrito[indiceSeleccionado].precio = parseFloat(n); 
                actualizarUI(); 
            }
        }
        if (e.key === "F6") {
            e.preventDefault();
            carrito.splice(indiceSeleccionado, 1);
            indiceSeleccionado = carrito.length - 1;
            actualizarUI();
        }
    }
});

// --- INICIALIZACIÓN ---
const inputBusqueda = document.getElementById('inputBusqueda');
if (inputBusqueda) {
    inputBusqueda.oninput = (e) => {
        if (document.getElementById('modalPago').style.display === "flex") return;
        const term = e.target.value.toLowerCase();
        renderizarProductos(productosMaster.filter(p => p.nombre.toLowerCase().includes(term)));
    };
}

document.addEventListener('productosActualizados', () => renderizarProductos(productosMaster));

if (productosMaster && productosMaster.length > 0) {
    renderizarProductos(productosMaster);
}

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
    indiceSeleccionado = index; 
    actualizarUI(); 
};

// --- MOTOR DE COBRO Y AUTOCOMPLETADO ---

window.abrirModalCobro = () => {
    if (carrito.length === 0) return;
    
    document.getElementById('totalModalUSD').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('totalModalBS').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs`;
    document.getElementById('modalPago').style.display = "flex";
    
    // Limpiar campos al abrir
    const campos = ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd'];
    campos.forEach(id => document.getElementById(id).value = "");
    
    window.calcularRestante();
};

// Función solicitada: Coloca el monto automáticamente al dar click
window.autoCompletar = (tipo) => {
    // Obtener valores actuales (si están vacíos tratarlos como 0)
    const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const ef = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const dv = parseFloat(document.getElementById('in-divisas-usd').value) || 0;

    // Calcular cuánto se ha pagado en USD sumando los demás campos
    let pagadoOtrosUSD = 0;
    if (tipo !== 'punto') pagadoOtrosUSD += (p / tasaActual);
    if (tipo !== 'pagomovil') pagadoOtrosUSD += (pm / tasaActual);
    if (tipo !== 'efectivo') pagadoOtrosUSD += (ef / tasaActual);
    if (tipo !== 'divisas') pagadoOtrosUSD += dv;

    const faltanteUSD = totalVentaUSD - pagadoOtrosUSD;

    // Solo autocompletar si hay una deuda pendiente
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

// --- GESTIÓN DE TECLADO ---
window.addEventListener('keydown', (e) => {
    // Si el modal está abierto, no procesar F4, F5, F6 para el carrito
    const modalAbierto = document.getElementById('modalPago').style.display === "flex";

    if (e.key === "F9") {
        e.preventDefault();
        window.abrirModalCobro();
        return;
    }

    if (!modalAbierto && indiceSeleccionado !== -1) {
        if (e.key === "F4") {
            e.preventDefault();
            const n = prompt("Cantidad:", carrito[indiceSeleccionado].cantidad);
            if (n > 0) { carrito[indiceSeleccionado].cantidad = parseFloat(n); actualizarUI(); }
        }
        if (e.key === "F5") {
            e.preventDefault();
            const n = prompt("Precio USD:", carrito[indiceSeleccionado].precio);
            if (n >= 0) { carrito[indiceSeleccionado].precio = parseFloat(n); actualizarUI(); }
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
        const term = e.target.value.toLowerCase();
        renderizarProductos(productosMaster.filter(p => p.nombre.toLowerCase().includes(term)));
    };
}

document.addEventListener('productosActualizados', () => renderizarProductos(productosMaster));

if (productosMaster && productosMaster.length > 0) {
    renderizarProductos(productosMaster);
}

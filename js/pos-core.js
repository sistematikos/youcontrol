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
    // Actualizar visualización de la tasa en el header
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

// Función para abrir el modal (llamada por F9 o botón)
window.abrirModalCobro = () => {
    if (carrito.length === 0) return;
    
    document.getElementById('totalModalUSD').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('totalModalBS').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs`;
    document.getElementById('modalPago').style.display = "flex";
    
    // Resetear inputs al abrir
    document.getElementById('in-punto-bs').value = 0;
    document.getElementById('in-pagomovil-bs').value = 0;
    document.getElementById('in-efectivo-bs').value = 0;
    document.getElementById('in-divisas-usd').value = 0;
    
    window.calcularRestante();
};

// Autocompletado inteligente al hacer clic en el Label
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

    if (faltanteUSD > 0) {
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

    // Margen de error por decimales (0.01)
    if (faltante <= 0.01) {
        status.style.background = "#D1FAE5"; 
        status.style.color = "#065F46";
        status.innerText = faltante < -0.01 ? "CAMBIO LISTO" : "PAGO COMPLETO";
        btn.disabled = false;
    } else {
        status.style.background = "#FEF3C7"; 
        status.style.color = "#92400E";
        status.innerText = `FALTANTE: $ ${faltante.toFixed(2)}`;
        btn.disabled = true;
    }
};

// --- GESTIÓN DE TECLADO (F4, F5, F6, F9) ---
window.addEventListener('keydown', (e) => {
    if (indiceSeleccionado === -1 && e.key !== "F9") return;
    
    if (e.key === "F4") { // Cambiar Cantidad
        e.preventDefault();
        const n = prompt("Nueva Cantidad:", carrito[indiceSeleccionado].cantidad);
        if (n !== null && n > 0) { 
            carrito[indiceSeleccionado].cantidad = parseFloat(n); 
            actualizarUI(); 
        }
    }
    if (e.key === "F5") { // Cambiar Precio
        e.preventDefault();
        const n = prompt("Nuevo Precio USD:", carrito[indiceSeleccionado].precio);
        if (n !== null && n >= 0) { 
            carrito[indiceSeleccionado].precio = parseFloat(n); 
            actualizarUI(); 
        }
    }
    if (e.key === "F6") { // Eliminar Item
        e.preventDefault();
        carrito.splice(indiceSeleccionado, 1);
        indiceSeleccionado = carrito.length - 1;
        actualizarUI();
    }
    if (e.key === "F9") { // Cobrar
        e.preventDefault();
        window.abrirModalCobro();
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

// Escuchar actualizaciones externas de la base de datos
document.addEventListener('productosActualizados', () => renderizarProductos(productosMaster));

// Carga inicial de productos
if (productosMaster && productosMaster.length > 0) {
    renderizarProductos(productosMaster);
}

import { productosMaster, tasaActual } from './pos-db-motor.js';

let carrito = [];
let totalVentaUSD = 0;
let indiceSeleccionado = -1;

// Renderizar lista de búsqueda
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
    document.getElementById('txt-tasa').innerText = tasaActual.toLocaleString('es-VE');
};

// Función para anexar productos al carrito (CRÍTICA)
window.agregar = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;

    const existente = carrito.find(c => c.id === id);
    if (existente) {
        existente.cantidad++;
    } else {
        carrito.push({ ...p, cantidad: 1 });
    }
    
    indiceSeleccionado = carrito.findIndex(c => c.id === id);
    actualizarUI();
};

// Actualizar el Resumen de Venta
function actualizarUI() {
    const list = document.getElementById('lista-carrito');
    list.innerHTML = ""; 
    totalVentaUSD = 0;
    
    carrito.forEach((c, index) => {
        const subUSD = c.precio * c.cantidad;
        const subBS = (subUSD * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        totalVentaUSD += subUSD;
        const sel = index === indiceSeleccionado ? 'item-selected' : '';
        
        list.innerHTML += `
        <div class="single-line-row grid-cart ${sel}" onclick="seleccionarItem(${index})">
            <span style="overflow:hidden; text-overflow:ellipsis;"><b>${c.cantidad}x</b> ${c.nombre}</span>
            <span class="price-vibrant">$${subUSD.toFixed(2)}</span>
            <span class="price-soft">${subBS} Bs</span>
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

// Buscador
document.getElementById('inputBusqueda').oninput = (e) => {
    const term = e.target.value.toLowerCase();
    const filtrados = productosMaster.filter(p => p.nombre.toLowerCase().includes(term));
    renderizarProductos(filtrados);
};

// Teclado
window.addEventListener('keydown', (e) => {
    if (e.key === "F9") { 
        e.preventDefault(); 
        if(carrito.length > 0) document.getElementById('btnCobrar').click(); 
    }
});

// Inicialización
document.addEventListener('productosActualizados', () => renderizarProductos(productosMaster));
if (productosMaster.length > 0) renderizarProductos(productosMaster);

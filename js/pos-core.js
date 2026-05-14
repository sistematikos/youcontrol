import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Datos de prueba (Luego puedes importarlos de pos-db-motor.js)
const productosMaster = [
    { id: '1', nombre: 'Producto Ejemplo', precio: 10.00, stock: 50 }
];
const tasaActual = 36.50; // Ejemplo de tasa BCV
const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; // ID según image_8562af.png

let carrito = [];
let itemSeleccionadoIndex = -1;
let totalVentaUSD = 0;

// Renderizar búsqueda inicial
const grid = document.getElementById('grid-productos');
const renderBusqueda = () => {
    grid.innerHTML = productosMaster.map(p => `
        <div class="single-line-row grid-search" onclick="window.agregarCarrito('${p.id}')">
            <span><b>${p.nombre}</b></span>
            <span class="price-vibrant">$${p.precio.toFixed(2)}</span>
            <i class="fas fa-plus-circle" style="color:var(--royal-blue);"></i>
        </div>
    `).join('');
};

window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    const existe = carrito.find(c => c.id === id);
    if (existe) existe.cantidad++;
    else carrito.push({ ...p, cantidad: 1 });
    actualizarUI();
};

function actualizarUI() {
    const list = document.getElementById('lista-carrito');
    totalVentaUSD = 0;
    list.innerHTML = carrito.map((c, i) => {
        const sub = c.precio * c.cantidad;
        totalVentaUSD += sub;
        return `<div class="single-line-row grid-cart ${i === itemSeleccionadoIndex ? 'item-selected' : ''}" onclick="window.seleccionarItem(${i})">
            <span>${c.cantidad}x ${c.nombre}</span>
            <span class="price-vibrant">$${sub.toFixed(2)}</span>
        </div>`;
    }).join('');

    document.getElementById('total-usd').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
}

window.seleccionarItem = (i) => { itemSeleccionadoIndex = i; actualizarUI(); };

// Atajos F4, F5, F6
window.ejecutarF4 = () => { /* Lógica cantidad */ };
window.ejecutarF6 = () => { if(itemSeleccionadoIndex > -1) { carrito.splice(itemSeleccionadoIndex, 1); actualizarUI(); } };

// MODAL Y COBRO
window.abrirModalCobro = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModalUSD').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('modalPago').style.display = "flex";
};

window.calcularRestante = () => {
    const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const ef = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const dv = parseFloat(document.getElementById('in-divisas-usd').value) || 0;

    const pagadoUSD = dv + ((p + pm + ef) / tasaActual);
    const btn = document.getElementById('btnConfirmarVenta');
    btn.disabled = (totalVentaUSD - pagadoUSD) > 0.01;
};

// --- FUNCIÓN CRÍTICA: GUARDAR EN FIREBASE ---
window.registrarVenta = async () => {
    const btn = document.getElementById('btnConfirmarVenta');
    btn.disabled = true;
    btn.innerText = "GUARDANDO...";

    try {
        const ventasRef = collection(db, "usuarios", USER_ID, "ventas");
        
        await addDoc(ventasRef, {
            fecha: serverTimestamp(),
            totalUSD: totalVentaUSD,
            tasaBCV: tasaActual,
            pagos: {
                punto: parseFloat(document.getElementById('in-punto-bs').value) || 0,
                pm: parseFloat(document.getElementById('in-pagomovil-bs').value) || 0,
                efectivo: parseFloat(document.getElementById('in-efectivo-bs').value) || 0,
                divisas: parseFloat(document.getElementById('in-divisas-usd').value) || 0
            },
            articulos: carrito.map(i => ({ n: i.nombre, c: i.cantidad, p: i.precio }))
        });

        alert("✅ Venta Registrada");
        carrito = [];
        actualizarUI();
        document.getElementById('modalPago').style.display = 'none';
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "CONFIRMAR VENTA";
    }
};

window.addEventListener('keydown', (e) => {
    if (e.key === "F9") window.abrirModalCobro();
});

renderBusqueda();

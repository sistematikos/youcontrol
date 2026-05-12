import { productosMaster, tasaActual, procesarVentaFirebase } from './pos-db-motor.js';

let carrito = [];
let idSeleccionado = null;
let metodoPago = "Divisas";

// --- RENDERIZADO ---
document.addEventListener('productosActualizados', () => renderizar(productosMaster));
document.addEventListener('tasaActualizada', () => renderizar(productosMaster));

function renderizar(lista) {
    const grid = document.getElementById('grid-productos');
    grid.innerHTML = "";
    lista.forEach(p => {
        const pBs = (p.precio * tasaActual).toLocaleString('es-VE', {minimumFractionDigits: 2});
        grid.innerHTML += `
            <div class="product-card" onclick="agregar('${p.id}')">
                <b>${p.nombre}</b>
                <div style="text-align:right;">
                    <div style="font-weight:700;">$${p.precio.toFixed(2)}</div>
                    <div style="font-size:0.75rem; color:gray;">${pBs} Bs.</div>
                </div>
                <div style="text-align:right; font-size:0.8rem; color:#94A3B8;">Stock: ${p.stock}</div>
                <i class="fas fa-plus-circle" style="text-align:right; color:#0052D4;"></i>
            </div>`;
    });
}

// --- FUNCIONES DEL CARRITO ---
window.agregar = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p || p.stock <= 0) return;
    const existe = carrito.find(c => c.id === id);
    if (existe) existe.cantidad++;
    else carrito.push({...p, cantidad: 1, costoBase: p.costo || 0});
    idSeleccionado = id;
    actualizarUI();
    document.getElementById('beepSound').play();
};

function actualizarUI() {
    const list = document.getElementById('lista-carrito');
    list.innerHTML = ""; let sub = 0;
    carrito.forEach(c => {
        sub += (c.precio * c.cantidad);
        const sel = idSeleccionado === c.id;
        list.innerHTML += `<div class="cart-item ${sel?'selected':''}" onclick="seleccionar('${c.id}')">
            <span><b>${c.cantidad}x</b> ${c.nombre}</span>
            <b>$${(c.precio * c.cantidad).toFixed(2)}</b>
        </div>`;
    });
    document.getElementById('total-usd').innerText = `$ ${sub.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(sub * tasaActual).toLocaleString('es-VE')} Bs.`;
}

window.seleccionar = (id) => { idSeleccionado = id; actualizarUI(); };

// --- ATAJOS DE TECLADO ---
window.addEventListener('keydown', (e) => {
    if (e.key === "F9") document.getElementById('btnCobrar').click();
    if (e.key === "F5") alert("Cambiar cantidad..."); // Implementar prompt
    // Agregar el resto de F4, F6...
});

// --- GESTIÓN DE PAGO ---
document.getElementById('btnCobrar').onclick = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModal').innerText = document.getElementById('total-usd').innerText;
    document.getElementById('modalPago').style.display = "block";
};

document.getElementById('btnConfirmarVenta').onclick = async () => {
    const total = carrito.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    const exito = await procesarVentaFirebase(carrito, total, metodoPago);
    if (exito) {
        alert("¡Venta completada!");
        carrito = []; actualizarUI();
        document.getElementById('modalPago').style.display = "none";
    }
};

document.getElementById('btnCerrarModal').onclick = () => {
    document.getElementById('modalPago').style.display = "none";
};
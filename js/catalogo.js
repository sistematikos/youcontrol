import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasaActual = 1;
let carrito = {};
let productosGlobales = [];

function iniciarCatalogo() {
    onSnapshot(doc(db, "usuarios", USER_ID), (snap) => {
        if (snap.exists()) {
            tasaActual = parseFloat(snap.data().tasa_bcv || 1);
            document.getElementById('tasa-cliente').innerText = tasaActual.toLocaleString('es-VE', {minimumFractionDigits:2});
        }
    });

    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
        document.getElementById('loader').style.display = 'none';
        productosGlobales = [];
        snap.forEach(d => productosGlobales.push({ id: d.id, ...d.data() }));
        renderizar(productosGlobales);
    });
}

function renderizar(lista) {
    const cont = document.getElementById('contenedor-catalogo');
    cont.innerHTML = lista.filter(p => (p.stock || 0) > 0).map(p => {
        const bs = (Math.round((p.precio * tasaActual) * 100) / 100).toLocaleString('es-VE', {minimumFractionDigits:2});
        return `
        <div class="card-prod" id="card-${p.id}">
            <h3>${p.nombre}</h3>
            <span class="price-bs">${bs} Bs</span>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <button class="btn-qty" onclick="cambiarCant('${p.id}', -1, '${p.nombre}', ${p.precio}, ${p.stock})">-</button>
                <span id="qty-${p.id}">0</span>
                <button class="btn-qty" onclick="cambiarCant('${p.id}', 1, '${p.nombre}', ${p.precio}, ${p.stock})">+</button>
            </div>
        </div>`;
    }).join('');
}

window.cambiarCant = (id, cambio, nombre, precio, stock) => {
    if (!carrito[id]) carrito[id] = { nombre, precio, cantidad: 0 };
    carrito[id].cantidad = Math.max(0, Math.min(carrito[id].cantidad + cambio, stock));
    document.getElementById(`qty-${id}`).innerText = carrito[id].cantidad;
    document.getElementById(`card-${id}`).style.borderColor = carrito[id].cantidad > 0 ? '#3B82F6' : '#E2E8F0';
    let total = 0, items = 0;
    for(let i in carrito) { total += carrito[i].precio * carrito[i].cantidad; items += carrito[i].cantidad; }
    document.getElementById('cart-footer').style.display = items > 0 ? 'flex' : 'none';
    document.getElementById('cart-total-usd').innerText = total.toFixed(2);
    document.getElementById('cart-count').innerText = items;
};

window.enviarPedido = () => {
    let m = "Pedido Sistematikos:\n";
    for(let i in carrito) if(carrito[i].cantidad > 0) m += `${carrito[i].cantidad}x ${carrito[i].nombre}\n`;
    window.open(`https://wa.me/14845532789?text=${encodeURIComponent(m)}`, '_blank');
};

iniciarCatalogo();

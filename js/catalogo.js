import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasaActual = 1;
let carrito = {};
let productosGlobales = [];

function iniciarCatalogo() {
    // 1. Escuchar Tasa
    onSnapshot(doc(db, "usuarios", USER_ID), (snap) => {
        if (snap.exists()) {
            tasaActual = parseFloat(snap.data().tasa_bcv || 1);
            document.getElementById('tasa-cliente').innerText = tasaActual.toLocaleString('es-VE', {minimumFractionDigits:2});
            renderizar(productosGlobales); // Re-renderizar precios al cambiar tasa
        }
    });

    // 2. Escuchar Productos (La raíz del problema suele estar aquí si el path cambió)
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
        productosGlobales = [];
        snapshot.forEach(d => productosGlobales.push({ id: d.id, ...d.data() }));
        renderizar(productosGlobales);
    });
}

function renderizar(lista) {
    const contenedor = document.getElementById('contenedor-catalogo');
    if (!contenedor) return;

    contenedor.innerHTML = lista.map(p => {
        // Validación crítica: si no hay stock o precio, saltamos
        if (!p.nombre || parseInt(p.stock || 0) <= 0) return '';
        
        const precio = parseFloat(p.precio || 0);
        const bs = (Math.round((precio * tasaActual) * 100) / 100).toLocaleString('es-VE', {minimumFractionDigits:2});
        
        return `
        <div class="card-prod" id="card-${p.id}">
            <h3>${p.nombre}</h3>
            <span class="price-bs">${bs} Bs</span>
            <div style="display:flex; align-items:center; gap:10px;">
                <button class="btn-qty" onclick="cambiarCant('${p.id}', -1, '${p.nombre}', ${precio}, ${p.stock})">-</button>
                <span id="qty-${p.id}">0</span>
                <button class="btn-qty" onclick="cambiarCant('${p.id}', 1, '${p.nombre}', ${precio}, ${p.stock})">+</button>
            </div>
        </div>`;
    }).join('');
}

// Búsqueda (Filtro)
document.getElementById('buscador-prod').addEventListener('input', (e) => {
    const busqueda = e.target.value.toLowerCase();
    const filtrados = productosGlobales.filter(p => p.nombre.toLowerCase().includes(busqueda));
    renderizar(filtrados);
});

window.cambiarCant = (id, cambio, nombre, precio, stock) => {
    if (!carrito[id]) carrito[id] = { nombre, precio, cantidad: 0 };
    carrito[id].cantidad = Math.max(0, Math.min(carrito[id].cantidad + cambio, stock));
    
    document.getElementById(`qty-${id}`).innerText = carrito[id].cantidad;
    const card = document.getElementById(`card-${id}`);
    if(card) card.style.borderColor = carrito[id].cantidad > 0 ? '#3B82F6' : '#E2E8F0';
    
    // Footer
    let total = 0, items = 0;
    for(let i in carrito) { total += carrito[i].precio * carrito[i].cantidad; items += carrito[i].cantidad; }
    document.getElementById('cart-footer').style.display = items > 0 ? 'flex' : 'none';
    document.getElementById('cart-total-usd').innerText = total.toFixed(2);
    document.getElementById('cart-count').innerText = items;
};

iniciarCatalogo();

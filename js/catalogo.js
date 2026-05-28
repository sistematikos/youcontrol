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
            document.getElementById('tasa-cliente').innerText = tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 });
            renderizarCatalogo(productosGlobales);
        }
    });

    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
        productosGlobales = [];
        snapshot.forEach(d => productosGlobales.push({ id: d.id, ...d.data() }));
        renderizarCatalogo(productosGlobales);
    });

    document.getElementById('buscador-prod').addEventListener('input', (e) => {
        const filtrados = productosGlobales.filter(p => p.nombre.toLowerCase().includes(e.target.value.toLowerCase()));
        renderizarCatalogo(filtrados);
    });
}

function renderizarCatalogo(lista) {
    const contenedor = document.getElementById('contenedor-catalogo');
    contenedor.innerHTML = lista.map(p => {
        if (parseInt(p.stock || 0) <= 0) return '';
        const precioBs = (Math.round((p.precio * tasaActual) * 100) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        return `
        <div class="card-prod" id="card-${p.id}">
            <div class="line-1"><h3>${p.nombre}</h3></div>
            <div class="line-2">
                <span class="price-usd">$${parseFloat(p.precio).toFixed(2)}</span>
                <span class="price-bs">${precioBs} Bs</span>
            </div>
            <div class="line-3">
                <button class="btn-qty" onclick="cambiarCant('${p.id}', -1, '${p.nombre}', ${p.precio}, ${p.stock})">-</button>
                <span class="qty-val" id="qty-${p.id}">0</span>
                <button class="btn-qty" onclick="cambiarCant('${p.id}', 1, '${p.nombre}', ${p.precio}, ${p.stock})">+</button>
            </div>
        </div>`;
    }).join('');
}

window.cambiarCant = (id, cambio, nombre, precio, stockMax) => {
    if (!carrito[id]) carrito[id] = { nombre, precio, cantidad: 0 };
    carrito[id].cantidad = Math.min(Math.max(carrito[id].cantidad + cambio, 0), stockMax);
    document.getElementById(`qty-${id}`).innerText = carrito[id].cantidad;
    
    const card = document.getElementById(`card-${id}`);
    card.style.borderColor = carrito[id].cantidad > 0 ? 'var(--electric)' : 'var(--border)';
    card.style.borderLeftColor = 'var(--emerald)';
    actualizarFooter();
};

function actualizarFooter() {
    let totalUsd = 0, items = 0;
    for (let id in carrito) {
        totalUsd += carrito[id].precio * carrito[id].cantidad;
        items += carrito[id].cantidad;
    }
    const footer = document.getElementById('cart-footer');
    footer.style.display = items > 0 ? 'flex' : 'none';
    document.getElementById('cart-total-usd').innerText = totalUsd.toFixed(2);
    document.getElementById('cart-count').innerText = items;
}

window.enviarPedido = () => {
    let m = "¡Hola! Mi pedido en Sistematikos:\n\n";
    for(let id in carrito) if(carrito[id].cantidad > 0) m += `*${carrito[id].cantidad}x* ${carrito[id].nombre}\n`;
    window.open(`https://wa.me/14845532789?text=${encodeURIComponent(m)}`, '_blank');
};

iniciarCatalogo();

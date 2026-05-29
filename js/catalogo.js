import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id') || "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasaActual = 1;
let carrito = {};
let productosGlobales = []; // Guardamos aquí para buscar

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
        snapshot.forEach(doc => productosGlobales.push({ id: doc.id, ...doc.data() }));
        renderizarCatalogo(productosGlobales);
    });

    // Evento del buscador
    document.getElementById('buscador-prod').addEventListener('input', (e) => {
        const busqueda = e.target.value.toLowerCase();
        const filtrados = productosGlobales.filter(p => p.nombre.toLowerCase().includes(busqueda));
        renderizarCatalogo(filtrados);
    });
}

function renderizarCatalogo(lista) {
    const contenedor = document.getElementById('contenedor-catalogo');
    contenedor.innerHTML = lista.map(p => {
        if (parseInt(p.stock || 0) <= 0) return '';
        const precioBs = (p.precio * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        return `
        <div class="card-prod" id="card-${p.id}">
            <div class="line-1"><h3>${p.nombre}</h3></div>
            <div class="line-2">
                <span class="price-usd">$${parseFloat(p.precio).toFixed(2)}</span>
                <span class="price-bs">${precioBs} Bs</span>
            </div>
            <div class="line-3">
                <button class="btn-qty" onclick="cambiarCant('${p.id}', -1, '${p.nombre}', ${p.precio}, ${p.stock})">-</button>
                <span class="qty-val" id="qty-${p.id}">${carrito[p.id]?.cantidad || 0}</span>
                <button class="btn-qty" onclick="cambiarCant('${p.id}', 1, '${p.nombre}', ${p.precio}, ${p.stock})">+</button>
            </div>
        </div>`;
    }).join('');
}

window.cambiarCant = (id, cambio, nombre, precio, stockMax) => {
    if (!carrito[id]) carrito[id] = { nombre, precio, cantidad: 0 };
    carrito[id].cantidad = Math.min(Math.max(carrito[id].cantidad + cambio, 0), stockMax);
    document.getElementById(`qty-${id}`).innerText = carrito[id].cantidad;
    
    // Feedback visual opcional: borde azul si hay cantidad > 0
    const card = document.getElementById(`card-${id}`);
    if(card) card.style.borderColor = carrito[id].cantidad > 0 ? '#3B82F6' : '#E2E8F0';
    
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

    // Calculamos el total en Bs usando la tasaActual
    const totalBs = (totalUsd * tasaActual).toLocaleString('es-VE', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });

    document.getElementById('cart-total-usd').innerText = totalUsd.toFixed(2);
    
    const displayTotal = document.getElementById('cart-total-bs');
    if (displayTotal) {
        displayTotal.innerText = totalBs;
    }
    
    document.getElementById('cart-count').innerText = items;
}

window.enviarPedido = () => {
    let m = "Hola, quisiera: \n";
    for(let id in carrito) if(carrito[id].cantidad > 0) m += `${carrito[id].cantidad}x ${carrito[id].nombre}\n`;
    window.open(`https://wa.me/14845532789?text=${encodeURIComponent(m)}`, '_blank');
};

iniciarCatalogo();

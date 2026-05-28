import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id') || "sUhfZI9Fy3M9UlInTYw2wFWZmB12";

let tasaActual = 1;
let carrito = {};

// 1. Iniciar conexión en tiempo real
function iniciarCatalogo() {
    // Escuchar datos del usuario para obtener la Tasa
    onSnapshot(doc(db, "usuarios", USER_ID), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            tasaActual = parseFloat(data.tasa_bcv || 1);
            document.getElementById('tasa-cliente').innerText = tasaActual.toLocaleString('es-VE', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            });
            renderizarCatalogo();
        }
    });

    // Escuchar Productos en tiempo real
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
        let listaProductos = [];
        snapshot.forEach(doc => listaProductos.push({ id: doc.id, ...doc.data() }));
        renderizarCatalogo(listaProductos);
    });
}

// 2. Renderizar productos
function renderizarCatalogo(productos = []) {
    const contenedor = document.getElementById('contenedor-catalogo');
    if (!contenedor) return;

    contenedor.innerHTML = productos.map(p => {
        const precio = parseFloat(p.precio || 0);
        const stock = parseInt(p.stock || 0);
        
        // Redondeo a 2 decimales para Bs
        const precioBs = (Math.round((precio * tasaActual) * 100) / 100).toLocaleString('es-VE', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });

        if (stock <= 0) return '';

        return `
        <div class="card-prod" id="card-${p.id}">
            <i class="fas fa-check-circle check-icon" id="check-${p.id}"></i>
            <div class="line-1"><h3>${p.nombre || 'Sin nombre'}</h3></div>
            <div class="line-2">
                <span class="price-usd">Ref. $${precio.toFixed(2)}</span>
                <span class="price-bs">${precioBs} Bs</span>
            </div>
            <div class="line-3">
                <button class="btn-qty" onclick="window.cambiarCant('${p.id}', -1, '${p.nombre}', ${precio}, ${stock})">-</button>
                <span class="qty-val" id="qty-${p.id}">0</span>
                <button class="btn-qty" onclick="window.cambiarCant('${p.id}', 1, '${p.nombre}', ${precio}, ${stock})">+</button>
            </div>
        </div>`;
    }).join('');
}

// 3. Lógica del Carrito
window.cambiarCant = (id, cambio, nombre, precio, stockMax) => {
    if (!carrito[id]) carrito[id] = { nombre, precio, cantidad: 0 };
    
    let nuevaCant = carrito[id].cantidad + cambio;
    if (nuevaCant < 0) nuevaCant = 0;
    if (nuevaCant > stockMax) nuevaCant = stockMax;

    carrito[id].cantidad = nuevaCant;
    
    const qtyEl = document.getElementById(`qty-${id}`);
    if (qtyEl) qtyEl.innerText = nuevaCant;

    const card = document.getElementById(`card-${id}`);
    const check = document.getElementById(`check-${id}`);
    
    if (nuevaCant > 0) {
        if (check) check.style.display = 'block';
        if (card) card.style.borderColor = 'var(--electric)';
    } else {
        if (check) check.style.display = 'none';
        if (card) card.style.borderColor = 'var(--border)';
    }
    actualizarFooter();
};

function actualizarFooter() {
    const footer = document.getElementById('cart-footer');
    let totalUsd = 0; 
    let items = 0;

    for (let id in carrito) {
        totalUsd += carrito[id].precio * carrito[id].cantidad;
        items += carrito[id].cantidad;
    }

    if (items > 0) {
        footer.style.display = 'flex';
        const totalBs = totalUsd * tasaActual;
        document.getElementById('cart-total-usd').innerText = totalUsd.toFixed(2);
        document.getElementById('cart-total-bs').innerText = totalBs.toLocaleString('es-VE', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
        document.getElementById('cart-count').innerText = items;
    } else {
        footer.style.display = 'none';
    }
}

window.enviarPedido = () => {
    let m = "¡Hola! Quisiera realizar el siguiente pedido:\n\n";
    let tUsd = 0;
    for (let id in carrito) {
        if (carrito[id].cantidad > 0) {
            let sub = carrito[id].precio * carrito[id].cantidad;
            m += `⭐ *${carrito[id].cantidad}x* ${carrito[id].nombre} - $${sub.toFixed(2)}\n`;
            tUsd += sub;
        }
    }
    const tBs = tUsd * tasaActual;
    m += `\n*TOTAL USD: $${tUsd.toFixed(2)}*`;
    m += `\n*TOTAL BS: ${tBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.*`;
    
    window.open(`https://wa.me/14845532789?text=${encodeURIComponent(m)}`, '_blank');
};

iniciarCatalogo();

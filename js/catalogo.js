import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const UID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasa = 1;
let carrito = {};

// Inicialización del catálogo
function iniciarCatalogo() {
    // 1. Escuchar la tasa de cambio en tiempo real
    const tasaRef = doc(db, "usuarios", UID, "configuracion", "tasa");
    onSnapshot(tasaRef, (snap) => {
        if (snap.exists()) {
            tasa = snap.data().valor || 1;
            document.getElementById('tasa-cliente').innerText = tasa.toLocaleString('es-VE', { minimumFractionDigits: 2 });
            renderizarCatalogo(); // Renderizamos cuando cambia la tasa
        }
    });

    // 2. Escuchar productos en tiempo real
    onSnapshot(collection(db, "usuarios", UID, "productos"), (snap) => {
        const contenedor = document.getElementById('contenedor-catalogo');
        contenedor.innerHTML = ""; // Limpiar contenedor

        snap.forEach(docSnap => {
            const p = docSnap.data();
            const id = docSnap.id;
            const nombre = p.nombre || "Sin nombre";
            const precio = parseFloat(p.precio || 0);
            const stock = parseInt(p.stock || 0);

            if (stock > 0) {
                const precioBs = (precio * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 });
                
                contenedor.innerHTML += `
                <div class="card-prod" id="card-${id}">
                    <i class="fas fa-check-circle check-icon" id="check-${id}"></i>
                    <div class="line-1"><h3>${nombre}</h3></div>
                    <div class="line-2">
                        <span class="price-usd">Ref. $${precio.toFixed(2)}</span>
                        <span class="price-bs">${precioBs} Bs</span>
                    </div>
                    <div class="line-3">
                        <button class="btn-qty" onclick="window.cambiarCant('${id}', -1, '${nombre}', ${precio}, ${stock})">-</button>
                        <span class="qty-val" id="qty-${id}">0</span>
                        <button class="btn-qty" onclick="window.cambiarCant('${id}', 1, '${nombre}', ${precio}, ${stock})">+</button>
                    </div>
                </div>`;
            }
        });
    });
}

// Lógica del carrito expuesta al objeto window
window.cambiarCant = (id, cambio, nombre, precio, stockMax) => {
    if (!carrito[id]) carrito[id] = { nombre, precio, cantidad: 0 };
    
    let nuevaCant = carrito[id].cantidad + cambio;
    if (nuevaCant < 0) nuevaCant = 0;
    if (nuevaCant > stockMax) nuevaCant = stockMax;

    carrito[id].cantidad = nuevaCant;
    
    // Actualizar UI del producto
    const qtyEl = document.getElementById(`qty-${id}`);
    if (qtyEl) qtyEl.innerText = nuevaCant;

    const check = document.getElementById(`check-${id}`);
    const card = document.getElementById(`card-${id}`);
    
    if (check && card) {
        if (nuevaCant > 0) {
            check.style.display = 'block';
            card.style.borderColor = 'var(--electric)';
        } else {
            check.style.display = 'none';
            card.style.borderColor = 'var(--border)';
        }
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
        const totalBs = totalUsd * tasa;
        document.getElementById('cart-total-usd').innerText = totalUsd.toFixed(2);
        document.getElementById('cart-total-bs').innerText = totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 });
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
    const tBs = tUsd * tasa;
    m += `\n*TOTAL USD: $${tUsd.toFixed(2)}*`;
    m += `\n*TOTAL BS: ${tBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.*`;
    
    window.open(`https://wa.me/14845532789?text=${encodeURIComponent(m)}`, '_blank');
};

iniciarCatalogo();

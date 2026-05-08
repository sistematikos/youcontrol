import { db } from './firebase-config.js';
import { collection, getDocs, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const UID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasa = 1;
let carrito = {};

function iniciarCatalogo() {
    const tasaRef = doc(db, "usuarios", UID, "configuracion", "tasa");
    onSnapshot(tasaRef, (snap) => {
        if (snap.exists()) {
            tasa = snap.data().valor;
            document.getElementById('tasa-cliente').innerText = tasa.toLocaleString('es-VE');
            renderizarCatalogo();
        }
    });
}

async function renderizarCatalogo() {
    const contenedor = document.getElementById('contenedor-catalogo');
    const snap = await getDocs(collection(db, "usuarios", UID, "productos"));
    contenedor.innerHTML = "";

    snap.forEach(docSnap => {
        const p = docSnap.data();
        const id = docSnap.id;
        const precioBs = (p.precio * tasa).toLocaleString('es-VE', {minimumFractionDigits: 2});

        if (p.stock > 0) {
            contenedor.innerHTML += `
                <div class="card-prod" id="card-${id}">
                    <div class="line-1">
                        <i class="fas fa-check-circle check-icon" id="check-${id}"></i>
                        <h3>${p.nombre}</h3>
                    </div>
                    <div class="line-2">
                        <span class="price-usd">$${p.precio.toFixed(2)}</span>
                        <span class="price-bs">${precioBs} Bs</span>
                    </div>
                    <div class="line-3">
                        <button class="btn-qty" onclick="cambiarCant('${id}', -1, '${p.nombre}', ${p.precio}, ${p.stock})">-</button>
                        <span class="qty-val" id="qty-${id}">0</span>
                        <button class="btn-qty" onclick="cambiarCant('${id}', 1, '${p.nombre}', ${p.precio}, ${p.stock})">+</button>
                    </div>
                </div>`;
        }
    });
}

window.cambiarCant = (id, cambio, nombre, precio, stockMax) => {
    if (!carrito[id]) carrito[id] = { nombre, precio, cantidad: 0 };
    let nuevaCant = carrito[id].cantidad + cambio;
    if (nuevaCant < 0) nuevaCant = 0;
    if (nuevaCant > stockMax) nuevaCant = stockMax;

    carrito[id].cantidad = nuevaCant;
    document.getElementById(`qty-${id}`).innerText = nuevaCant;

    const check = document.getElementById(`check-${id}`);
    const card = document.getElementById(`card-${id}`);
    
    if (nuevaCant > 0) {
        check.style.display = 'block';
        card.style.borderColor = 'var(--electric)';
        card.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.2)';
    } else {
        check.style.display = 'none';
        card.style.borderColor = 'rgba(255,255,255,0.1)';
        card.style.boxShadow = 'none';
    }
    actualizarFooter();
};

function actualizarFooter() {
    const footer = document.getElementById('cart-footer');
    let total = 0; let items = 0;
    for (let id in carrito) {
        total += carrito[id].precio * carrito[id].cantidad;
        items += carrito[id].cantidad;
    }
    footer.style.display = items > 0 ? 'flex' : 'none';
    document.getElementById('cart-total').innerText = total.toFixed(2);
    document.getElementById('cart-count').innerText = items;
}

window.enviarPedido = () => {
    let m = "¡Hola Sistematikos! Mi pedido:\n\n";
    let t = 0;
    for (let id in carrito) {
        if (carrito[id].cantidad > 0) {
            let sub = carrito[id].precio * carrito[id].cantidad;
            m += `*${carrito[id].cantidad}* x ${carrito[id].nombre} ($${sub.toFixed(2)})\n`;
            t += sub;
        }
    }
    m += `\n*TOTAL: $${t.toFixed(2)}*`;
    window.open(`https://wa.me/14845532789?text=${encodeURIComponent(m)}`, '_blank');
};

iniciarCatalogo();

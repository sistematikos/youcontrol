import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id') || "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasaActual = 1, carrito = {}, productosGlobales = [];

function iniciarCatalogo() {
    onSnapshot(doc(db, "usuarios", USER_ID), (snap) => {
        if (snap.exists()) {
            tasaActual = parseFloat(snap.data().tasa_bcv || 1);
            document.getElementById('tasa-cliente').innerText = tasaActual.toLocaleString('es-VE', {minimumFractionDigits:2});
            renderizar(productosGlobales);
        }
    });

    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
        productosGlobales = [];
        let cats = new Set(["Todos"]);
        snap.forEach(d => {
            let p = { id: d.id, ...d.data() };
            productosGlobales.push(p);
            if(p.categoria) cats.add(p.categoria);
        });
        document.getElementById('lista-categorias').innerHTML = Array.from(cats).map(c => 
            `<button class="cat-btn ${c === 'Todos' ? 'active' : ''}" onclick="filtrarPorCat('${c}', this)">${c}</button>`
        ).join('');
        renderizar(productosGlobales);
    });
}

function renderizar(lista) {
    const cont = document.getElementById('contenedor-catalogo');
    cont.innerHTML = lista.filter(p => parseInt(p.stock || 0) > 0).map(p => {
        const bs = (Math.round((p.precio * tasaActual) * 100) / 100).toLocaleString('es-VE', {minimumFractionDigits:2});
        return `
        <div class="card-prod" id="card-${p.id}">
            <div class="line-1"><h3>${p.nombre}</h3></div>
            <span class="price-bs">${bs} Bs</span>
            <div class="line-3">
                <button class="btn-qty" onclick="cambiarCant('${p.id}', -1, '${p.nombre}', ${p.precio}, ${p.stock})">-</button>
                <span id="qty-${p.id}">${carrito[p.id]?.cantidad || 0}</span>
                <button class="btn-qty" onclick="cambiarCant('${p.id}', 1, '${p.nombre}', ${p.precio}, ${p.stock})">+</button>
            </div>
        </div>`;
    }).join('');
}

window.filtrarPorCat = (cat, btn) => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderizar(cat === 'Todos' ? productosGlobales : productosGlobales.filter(p => p.categoria === cat));
};

window.cambiarCant = (id, cambio, nombre, precio, stock) => {
    if (!carrito[id]) carrito[id] = { nombre, precio, cantidad: 0 };
    carrito[id].cantidad = Math.max(0, Math.min(carrito[id].cantidad + cambio, stock));
    document.getElementById(`qty-${id}`).innerText = carrito[id].cantidad;
    const card = document.getElementById(`card-${id}`);
    if(card) card.style.borderColor = carrito[id].cantidad > 0 ? '#3B82F6' : '#E2E8F0';
    
    let totalUsd = 0, totalBs = 0, items = 0;
    for(let i in carrito) { 
        totalUsd += carrito[i].precio * carrito[i].cantidad; 
        items += carrito[i].cantidad; 
    }
    document.getElementById('cart-footer').style.display = items > 0 ? 'flex' : 'none';
    document.getElementById('cart-total-usd').innerText = totalUsd.toFixed(2);
    document.getElementById('cart-total-bs').innerText = (totalUsd * tasaActual).toLocaleString('es-VE', {minimumFractionDigits:2});
    document.getElementById('cart-count').innerText = items;
};

window.enviarPedido = () => {
    let m = "Pedido:\n";
    for(let i in carrito) if(carrito[i].cantidad > 0) m += `${carrito[i].cantidad}x ${carrito[i].nombre}\n`;
    window.open(`https://wa.me/14845532789?text=${encodeURIComponent(m)}`, '_blank');
};

document.getElementById('buscador-prod').addEventListener('input', (e) => {
    renderizar(productosGlobales.filter(p => p.nombre.toLowerCase().includes(e.target.value.toLowerCase())));
});

iniciarCatalogo();

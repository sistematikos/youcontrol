import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Obtener el ID desde el storage de la licencia
const token = localStorage.getItem('licencia_youcontrol');
const USER_ID = localStorage.getItem('youcontrol_empresa_id'); 

let tasaActual = 1, carrito = {}, productosGlobales = [];

function iniciarCatalogo() {
    if (!USER_ID) { console.error("No hay ID de empresa"); return; }

    // 1. Cargar Nombre de la licencia
    if (token) {
        try {
            const data = JSON.parse(atob(token));
            document.getElementById('nombre-empresa').innerText = (data.n || "EMPRESA").toUpperCase();
        } catch(e) { console.log("Error nombre", e); }
    }

    // 2. Cargar Tasa BCV
    onSnapshot(doc(db, "usuarios", USER_ID), (snap) => {
        if (snap.exists()) {
            tasaActual = parseFloat(snap.data().tasa_bcv || 1);
            document.getElementById('tasa-cliente').innerText = tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 });
            renderizarCatalogo(productosGlobales);
        }
    });

    // 3. Cargar Productos
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
        productosGlobales = [];
        snapshot.forEach(d => productosGlobales.push({ id: d.id, ...d.data() }));
        renderizarCatalogo(productosGlobales);
    });
}

function renderizarCatalogo(lista) {
    const contenedor = document.getElementById('contenedor-catalogo');
    contenedor.innerHTML = lista.filter(p => parseInt(p.stock || 0) > 0).map(p => {
        return `
        <div class="card-prod">
            <h3>${p.nombre}</h3>
            <span style="font-weight:900; color:#10B981;">${(p.precio * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs</span>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                <button onclick="cambiarCant('${p.id}', -1, '${p.nombre}', ${p.precio}, ${p.stock})">-</button>
                <span id="qty-${p.id}">${carrito[p.id]?.cantidad || 0}</span>
                <button onclick="cambiarCant('${p.id}', 1, '${p.nombre}', ${p.precio}, ${p.stock})">+</button>
            </div>
        </div>`;
    }).join('');
}

window.cambiarCant = (id, cambio, nombre, precio, stockMax) => {
    if (!carrito[id]) carrito[id] = { nombre, precio, cantidad: 0 };
    carrito[id].cantidad = Math.min(Math.max(carrito[id].cantidad + cambio, 0), stockMax);
    document.getElementById(`qty-${id}`).innerText = carrito[id].cantidad;
    actualizarFooter();
};

function actualizarFooter() {
    let total = 0, items = 0;
    for (let id in carrito) { total += carrito[id].precio * carrito[id].cantidad; items += carrito[id].cantidad; }
    document.getElementById('cart-footer').style.display = items > 0 ? 'flex' : 'none';
    document.getElementById('cart-total-usd').innerText = total.toFixed(2);
    document.getElementById('cart-total-bs').innerText = (total * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });
    document.getElementById('cart-count').innerText = items;
}

iniciarCatalogo();

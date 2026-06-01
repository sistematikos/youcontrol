import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const token = localStorage.getItem('licencia_youcontrol');
const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let tasaActual = 1, carrito = {}, productosGlobales = [];

function iniciarCatalogo() {
    if (!USER_ID) return;

    // --- NUEVO: Carga de Logo y Nombre desde empresas_config ---
    onSnapshot(doc(db, "empresas_config", USER_ID), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            // Actualizar Nombre
            if (data.nombre) {
                document.getElementById('nombre-empresa').innerText = data.nombre.toUpperCase();
            }
           // --- CARGA DE LOGO AUTOMATIZADA ---
        // Ya no hace falta buscar logoUrl en el snap, lo construimos directo:
            const logoImg = document.getElementById('logo-empresa');
            if (logoImg) {
        // Esto vincula automáticamente YC-2026-001.png con el ID del usuario
            logoImg.src = `https://raw.githubusercontent.com/sistematikos/youcontrol/main/img/${USER_ID}.png`;
            logoImg.style.display = 'block';
    
     // Opcional: ocultar si la imagen no carga (por si no has subido el logo aún)
            logoImg.onerror = () => { logoImg.style.display = 'none'; };
            }

    if (token) {
        try {
            const data = JSON.parse(atob(token));
            // Si el nombre no viene de empresas_config, usa el token como respaldo
            const nombreEl = document.getElementById('nombre-empresa');
            if (nombreEl.innerText === "CARGANDO..." || nombreEl.innerText === "") {
                nombreEl.innerText = (data.n || "EMPRESA").toUpperCase();
            }
        } catch(e) {}
    }

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
        const busqueda = e.target.value.toLowerCase();
        renderizarCatalogo(productosGlobales.filter(p => p.nombre.toLowerCase().includes(busqueda)));
    });
}

function renderizarCatalogo(lista) {
    const contenedor = document.getElementById('contenedor-catalogo');
    contenedor.innerHTML = lista.filter(p => parseInt(p.stock || 0) > 0).map(p => `
        <div class="card-prod">
            <h3 style="font-size:0.85rem; margin:0;">${p.nombre}</h3>
            <span style="font-weight:900; color:#10B981; font-size:1.1rem;">${(p.precio * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs</span>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <button onclick="cambiarCant('${p.id}', -1, '${p.nombre}', ${p.precio}, ${p.stock})">-</button>
                <span id="qty-${p.id}">${carrito[p.id]?.cantidad || 0}</span>
                <button onclick="cambiarCant('${p.id}', 1, '${p.nombre}', ${p.precio}, ${p.stock})">+</button>
            </div>
        </div>`).join('');
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

document.addEventListener('DOMContentLoaded', iniciarCatalogo);

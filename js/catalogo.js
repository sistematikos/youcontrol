import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const token = localStorage.getItem('licencia_youcontrol');
const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let tasaActual = 1;
let carrito = {};
let productosGlobales = [];

function iniciarCatalogo() {
    console.log("Iniciando catálogo para:", USER_ID);
    if (!USER_ID) {
        console.error("USER_ID no encontrado en localStorage");
        return;
    }

    // Carga de nombre de empresa
    if (token) {
        try {
            const data = JSON.parse(atob(token));
            document.getElementById('nombre-empresa').innerText = (data.n || "EMPRESA").toUpperCase();
        } catch(e) { console.error("Error al decodificar token", e); }
    }

    // Cargar Tasa BCV
    onSnapshot(doc(db, "usuarios", USER_ID), (snap) => {
        if (snap.exists()) {
            tasaActual = parseFloat(snap.data().tasa_bcv || 1);
            document.getElementById('tasa-cliente').innerText = tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 });
            renderizarCatalogo(productosGlobales);
        }
    });

    // Cargar Productos
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
        productosGlobales = [];
        snapshot.forEach(d => productosGlobales.push({ id: d.id, ...d.data() }));
        renderizarCatalogo(productosGlobales);
    }, (error) => {
        console.error("Error al cargar productos:", error);
    });

    // Buscador
    document.getElementById('buscador-prod').addEventListener('input', (e) => {
        const busqueda = e.target.value.toLowerCase();
        const filtrados = productosGlobales.filter(p => p.nombre.toLowerCase().includes(busqueda));
        renderizarCatalogo(filtrados);
    });
}

function renderizarCatalogo(lista) {
    const contenedor = document.getElementById('contenedor-catalogo');
    if (!contenedor) return;

    contenedor.innerHTML = lista.map(p => `
        <div class="card-prod">
            <h3 style="font-size:0.85rem; margin:0;">${p.nombre}</h3>
            <span style="font-weight:900; color:#10B981; font-size:1.1rem;">
                ${(parseFloat(p.precio || 0) * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
            </span>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <button onclick="window.cambiarCant('${p.id}', -1, '${p.nombre}', ${p.precio}, ${p.stock || 0})">-</button>
                <span id="qty-${p.id}">${carrito[p.id]?.cantidad || 0}</span>
                <button onclick="window.cambiarCant('${p.id}', 1, '${p.nombre}', ${p.precio}, ${p.stock || 0})">+</button>
            </div>
        </div>`).join('');
}

// EXPOSICIÓN DE FUNCIONES AL OBJETO WINDOW (Necesario para el onclick en HTML)
window.cambiarCant = (id, cambio, nombre, precio, stockMax) => {
    if (!carrito[id]) carrito[id] = { nombre, precio, cantidad: 0 };
    
    let nuevaCant = carrito[id].cantidad + cambio;
    if (nuevaCant < 0) nuevaCant = 0;
    if (nuevaCant > stockMax) nuevaCant = stockMax;
    
    carrito[id].cantidad = nuevaCant;
    
    const spanQty = document.getElementById(`qty-${id}`);
    if (spanQty) spanQty.innerText = nuevaCant;
    
    actualizarFooter();
};

window.enviarPedido = () => {
    // Aquí puedes añadir tu lógica de WhatsApp o confirmación
    console.log("Pedido actual:", carrito);
    alert("Pedido listo para procesar.");
};

function actualizarFooter() {
    let total = 0, items = 0;
    for (let id in carrito) { 
        total += carrito[id].precio * carrito[id].cantidad; 
        items += carrito[id].cantidad; 
    }
    const footer = document.getElementById('cart-footer');
    footer.style.display = items > 0 ? 'flex' : 'none';
    document.getElementById('cart-total-usd').innerText = total.toFixed(2);
    document.getElementById('cart-total-bs').innerText = (total * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });
    document.getElementById('cart-count').innerText = items;
}

document.addEventListener('DOMContentLoaded', iniciarCatalogo);

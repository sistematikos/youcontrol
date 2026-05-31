import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- LOGICA DE ID: Prioriza LocalStorage, si falla, intenta leerlo de la URL ---
const getEmpresaID = () => {
    let id = localStorage.getItem('youcontrol_empresa_id');
    if (!id) {
        const params = new URLSearchParams(window.location.search);
        id = params.get('empresa');
    }
    return id;
};

const USER_ID = getEmpresaID();
const token = localStorage.getItem('licencia_youcontrol');
let tasaActual = 1;
let carrito = {};
let productosGlobales = [];

function iniciarCatalogo() {
    console.log("Iniciando catálogo. ID Empresa:", USER_ID);
    
    if (!USER_ID) {
        document.getElementById('nombre-empresa').innerText = "ID EMPRESA NO ENCONTRADO";
        return;
    }

    // Carga de nombre de empresa desde token o placeholder
    if (token) {
        try {
            const data = JSON.parse(atob(token));
            document.getElementById('nombre-empresa').innerText = (data.n || "EMPRESA").toUpperCase();
        } catch(e) { document.getElementById('nombre-empresa').innerText = "EMPRESA"; }
    }

    // Cargar Tasa BCV y Datos Empresa
    onSnapshot(doc(db, "usuarios", USER_ID), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            tasaActual = parseFloat(data.tasa_bcv || 1);
            document.getElementById('tasa-cliente').innerText = tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 });
            renderizarCatalogo(productosGlobales);
        } else {
            console.error("El documento de la empresa no existe en Firestore.");
        }
    });

    // Cargar Productos
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
        productosGlobales = [];
        snapshot.forEach(d => productosGlobales.push({ id: d.id, ...d.data() }));
        renderizarCatalogo(productosGlobales);
    }, (error) => {
        console.error("Error al cargar productos:", error);
        alert("Error de conexión al catálogo: " + error.message);
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

    if (lista.length === 0) {
        contenedor.innerHTML = "<p style='grid-column: span 2; text-align: center; padding: 20px;'>No hay productos cargados.</p>";
        return;
    }

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

window.enviarPedido = () => {
    alert("Pedido listo. Implementa aquí tu lógica de envío a WhatsApp.");
};

document.addEventListener('DOMContentLoaded', iniciarCatalogo);

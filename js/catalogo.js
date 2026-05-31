import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- ESTRATEGIA DE DETECCIÓN DE ID ---
const getID = () => {
    // Tomamos el ID de la URL. Si no existe, devuelve null.
    const params = new URLSearchParams(window.location.search);
    return params.get('empresa');
};

const USER_ID = getID();
let tasaActual = 1;
let carrito = {};
let productosGlobales = [];

function iniciarCatalogo() {
    console.log("Sistema inicializado. ID:", USER_ID);
    
    if (!USER_ID) {
        document.getElementById('nombre-empresa').innerText = "ID NO DETECTADO";
        document.getElementById('contenedor-catalogo').innerHTML = 
            "<p style='text-align:center; padding:20px;'>Por favor, abre el catálogo desde el enlace compartido por la empresa.</p>";
        return;
    }

    // Carga de datos de la empresa (tasa)
    onSnapshot(doc(db, "usuarios", USER_ID), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            tasaActual = parseFloat(data.tasa_bcv || 1);
            document.getElementById('nombre-empresa').innerText = data.empresa_nombre || "Catálogo";
            document.getElementById('tasa-cliente').innerText = tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 });
            renderizarCatalogo(productosGlobales);
        }
    });

    // Carga de productos
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
        productosGlobales = [];
        snapshot.forEach(d => productosGlobales.push({ id: d.id, ...d.data() }));
        renderizarCatalogo(productosGlobales);
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

// Exposición global
window.cambiarCant = (id, cambio, nombre, precio, stockMax) => {
    if (!carrito[id]) carrito[id] = { nombre, precio, cantidad: 0 };
    
    // Ajustar cantidad
    carrito[id].cantidad = Math.min(Math.max(carrito[id].cantidad + cambio, 0), stockMax);
    document.getElementById(`qty-${id}`).innerText = carrito[id].cantidad;
    
    // Recalcular Totales
    let totalUSD = 0, items = 0;
    for (let k in carrito) { 
        totalUSD += carrito[k].precio * carrito[k].cantidad; 
        items += carrito[k].cantidad; 
    }
    
    // Actualizar Footer
    const footer = document.getElementById('cart-footer');
    footer.style.display = items > 0 ? 'flex' : 'none';
    document.getElementById('cart-total-usd').innerText = totalUSD.toFixed(2);
    document.getElementById('cart-total-bs').innerText = (totalUSD * tasaActual).toFixed(2);
    document.getElementById('cart-count').innerText = items;
};

// Función para enviar pedido a WhatsApp
window.enviarPedido = () => {
    // Tu número con formato internacional (quitando el 0 inicial del 0426)
    const telefono = "584264570267"; 
    
    let mensaje = "Hola, quiero realizar este pedido:%0A%0A";
    Object.values(carrito).forEach(item => {
        if (item.cantidad > 0) {
            mensaje += `* ${item.nombre} x${item.cantidad} - $${(item.precio * item.cantidad).toFixed(2)}%0A`;
        }
    });
    
    const total = document.getElementById('cart-total-usd').innerText;
    mensaje += `%0A*Total: $${total}*`;
    
    // Abre el chat de WhatsApp con el mensaje preconfigurado
    window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank');
};

document.addEventListener('DOMContentLoaded', iniciarCatalogo);

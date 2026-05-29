import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id') || "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasaActual = 1, carrito = {}, productosGlobales = [];

function iniciarCatalogo() {
    // Escuchar cambios en el documento de la empresa (Nombre y Tasa)
    onSnapshot(doc(db, "usuarios", USER_ID), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            
            // Actualizar Tasa BCV
            tasaActual = parseFloat(data.tasa_bcv || 1);
            document.getElementById('tasa-cliente').innerText = tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 });
            
            // Actualizar Nombre de Empresa Dinámico
            const nombreEmpresa = data.nombre_empresa || "Mi Empresa";
            document.getElementById('nombre-empresa').innerText = nombreEmpresa.toUpperCase();
            
            renderizarCatalogo(productosGlobales);
        }
    });

    // Escuchar cambios en la colección de productos
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
        productosGlobales = [];
        snapshot.forEach(d => productosGlobales.push({ id: d.id, ...d.data() }));
        renderizarCatalogo(productosGlobales);
    });

    // Evento del buscador
    document.getElementById('buscador-prod').addEventListener('input', (e) => {
        const busqueda = e.target.value.toLowerCase();
        renderizarCatalogo(productosGlobales.filter(p => p.nombre.toLowerCase().includes(busqueda)));
    });
}

// Función para obtener el nombre desde la licencia guardada
function obtenerNombreEmpresa() {
    try {
        const token = localStorage.getItem('licencia_youcontrol');
        if (token) {
            const data = JSON.parse(atob(token));
            const nombre = data.n || "Mi Empresa";
            // Asigna el nombre al elemento en tu cabecera
            const nombreEl = document.getElementById('nombre-empresa');
            if (nombreEl) {
                nombreEl.innerText = nombre.toUpperCase();
            }
        }
    } catch (e) {
        console.error("Error al cargar nombre de licencia:", e);
    }
}

// Llama a esta función dentro de tu iniciarCatalogo()
function iniciarCatalogo() {
    obtenerNombreEmpresa(); // <-- AGREGA ESTA LÍNEA AQUÍ
    
    // ... el resto de tu código de onSnapshot sigue igual ...
}

function renderizarCatalogo(lista) {
    const contenedor = document.getElementById('contenedor-catalogo');
    contenedor.innerHTML = lista.filter(p => parseInt(p.stock || 0) > 0).map(p => {
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
    
    const qtyEl = document.getElementById(`qty-${id}`);
    if (qtyEl) qtyEl.innerText = carrito[id].cantidad;
    
    const card = document.getElementById(`card-${id}`);
    if (card) card.style.borderColor = carrito[id].cantidad > 0 ? '#3B82F6' : '#10B981';
    
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
    
    document.getElementById('cart-total-usd').innerText = totalUsd.toFixed(2);
    document.getElementById('cart-total-bs').innerText = (totalUsd * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });
    document.getElementById('cart-count').innerText = items;
}

window.enviarPedido = () => {
    let m = "Hola, quisiera: \n";
    for(let id in carrito) if(carrito[id].cantidad > 0) m += `${carrito[id].cantidad}x ${carrito[id].nombre}\n`;
    window.open(`https://wa.me/14845532789?text=${encodeURIComponent(m)}`, '_blank');
};

iniciarCatalogo();

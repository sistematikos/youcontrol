import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- ESTRATEGIA DE DETECCIÓN DE ID ---
const getID = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('empresa');
};

const EMPRESA_ID = getID(); 
let tasaActual = 1;
let carrito = {};
let productosGlobales = [];

function iniciarCatalogo() {
    console.log("Sistema inicializado. ID Empresa:", EMPRESA_ID);
    
    if (!EMPRESA_ID) {
        document.getElementById('nombre-empresa').innerText = "ID NO DETECTADO";
        return;
    }

    // --- CARGA DE DATOS DE LA EMPRESA (Logo, Nombre, Tasa) ---
    onSnapshot(doc(db, "empresas_config", EMPRESA_ID), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            tasaActual = parseFloat(data.tasa || 1);
            
            // 1. Actualizar Nombre
            const elNombre = document.getElementById('nombre-empresa');
            if(elNombre) elNombre.innerText = data.nombre || "Catálogo";
            
            // 2. Actualizar Logo
            const logoImg = document.getElementById('logo-empresa');
            if (logoImg && data.logoUrl) {
                logoImg.src = data.logoUrl;
                logoImg.style.display = 'block';
            }

            // 3. Actualizar Tasa
            const elTasa = document.getElementById('tasa-cliente');
            if(elTasa) elTasa.innerText = tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 });
            
            renderizarCatalogo(productosGlobales);
        }
    });

    // --- CARGA DE PRODUCTOS ---
   // Prueba esta ruta si los productos están en una colección llamada "productos" 
// vinculados por un campo de ID o si están en una colección independiente
onSnapshot(collection(db, "productos"), (snapshot) => {
    productosGlobales = [];
    snapshot.forEach(d => {
        const data = d.data();
        // Si necesitas filtrar por empresa, hazlo aquí:
        if (data.empresaID === EMPRESA_ID) {
            productosGlobales.push({ id: d.id, ...data });
        }
    });
    renderizarCatalogo(productosGlobales);
});
    
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

// Exposición global de funciones
window.cambiarCant = (id, cambio, nombre, precio, stockMax) => {
    if (!carrito[id]) carrito[id] = { nombre, precio, cantidad: 0 };
    
    carrito[id].cantidad = Math.min(Math.max(carrito[id].cantidad + cambio, 0), stockMax);
    document.getElementById(`qty-${id}`).innerText = carrito[id].cantidad;
    
    let totalUSD = 0, items = 0;
    for (let k in carrito) { 
        totalUSD += carrito[k].precio * carrito[k].cantidad; 
        items += carrito[k].cantidad; 
    }
    
    const footer = document.getElementById('cart-footer');
    footer.style.display = items > 0 ? 'flex' : 'none';
    document.getElementById('cart-total-usd').innerText = totalUSD.toFixed(2);
    document.getElementById('cart-total-bs').innerText = (totalUSD * tasaActual).toFixed(2);
    document.getElementById('cart-count').innerText = items;
};

window.enviarPedido = () => {
    const telefono = "584264570267"; 
    let mensaje = "Hola, quiero realizar este pedido:%0A%0A";
    Object.values(carrito).forEach(item => {
        if (item.cantidad > 0) {
            mensaje += `* ${item.nombre} x${item.cantidad} - $${(item.precio * item.cantidad).toFixed(2)}%0A`;
        }
    });
    const total = document.getElementById('cart-total-usd').innerText;
    mensaje += `%0A*Total: $${total}*`;
    window.open(`https://wa.me/${telefono}?text=${mensaje}`, '_blank');
};

document.addEventListener('DOMContentLoaded', iniciarCatalogo);

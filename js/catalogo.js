import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy, doc, getDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURACIÓN DE TU NEGOCIO ---
const MI_ID_USUARIO = "TU_UID_AQUI"; // Tu ID de Firebase
const WHATSAPP_NUM = "14845532789";  // Tu WhatsApp ya guardado
// -----------------------------------

let tasaDia = 1;
let carrito = [];

async function inicializarCatalogo() {
    const tasaRef = doc(db, "usuarios", MI_ID_USUARIO, "configuracion", "tasa"); 
    try {
        const tasaSnap = await getDoc(tasaRef);
        if (tasaSnap.exists()) {
            tasaDia = tasaSnap.data().valor;
            document.getElementById('tasa-cliente').innerText = tasaDia.toLocaleString('es-VE', {minimumFractionDigits: 2});
        }
    } catch (e) { console.error("Error tasa:", e); }
    cargarProductos();
}

// Función global para manejar la selección
window.seleccionarProducto = (id, nombre, precio) => {
    const card = document.getElementById(`card-${id}`);
    const checkbox = document.getElementById(`check-${id}`);
    
    const index = carrito.findIndex(item => item.id === id);

    if (index > -1) {
        // Quitar del carrito
        carrito.splice(index, 1);
        card.classList.remove('seleccionado');
        checkbox.checked = false;
    } else {
        // Agregar al carrito
        carrito.push({ id, nombre, precio });
        card.classList.add('seleccionado');
        checkbox.checked = true;
    }

    actualizarBotonFlotante();
};

function actualizarBotonFlotante() {
    const btn = document.getElementById('btn-flotante-pedido');
    const cuenta = document.getElementById('cuenta-productos');
    
    if (carrito.length > 0) {
        btn.style.display = 'block';
        cuenta.innerText = carrito.length;
    } else {
        btn.style.display = 'none';
    }
}

async function cargarProductos() {
    const productosRef = collection(db, "usuarios", MI_ID_USUARIO, "productos");
    const q = query(productosRef, where("stock", ">", 0), orderBy("nombre", "asc"));
    
    const querySnapshot = await getDocs(q);
    const grid = document.getElementById('catalogo-productos');
    grid.innerHTML = "";

    querySnapshot.forEach((doc) => {
        const p = doc.data();
        const precioBs = (p.precio * tasaDia).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        const id = doc.id;

        grid.innerHTML += `
            <div class="producto-card" id="card-${id}" onclick="seleccionarProducto('${id}', '${p.nombre}', ${p.precio})">
                <div class="check-container">
                    <input type="checkbox" id="check-${id}" onclick="event.stopPropagation()">
                </div>
                <h3 style="color: #1A1A2E; font-size: 1.1rem; margin-bottom: 10px; padding-right: 25px;">${p.nombre}</h3>
                <div style="font-size: 22px; font-weight: 800; color: #15803D;">Bs. ${precioBs}</div>
                <div style="color: #64748b; font-weight: 600;">$${p.precio.toFixed(2)}</div>
            </div>
        `;
    });
}

window.enviarPedidoWhatsApp = () => {
    let mensaje = "*NUEVO PEDIDO - YOU CONTROL*%0A------------------------------%0A";
    let totalUsd = 0;

    carrito.forEach((item, index) => {
        mensaje += `${index + 1}. *${item.nombre}* - $${item.precio.toFixed(2)}%0A`;
        totalUsd += item.precio;
    });

    const totalBs = (totalUsd * tasaDia).toLocaleString('es-VE', { minimumFractionDigits: 2 });
    
    mensaje += "------------------------------%0A";
    mensaje += `*TOTAL A PAGAR:*%0A$${totalUsd.toFixed(2)} / *Bs. ${totalBs}*%0A%0A_Por favor, confírmeme disponibilidad._`;

    window.open(`https://wa.me/${WHATSAPP_NUM}?text=${mensaje}`, '_blank');
};

inicializarCatalogo();

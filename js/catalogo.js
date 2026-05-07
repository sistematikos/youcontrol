import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy, doc, getDoc, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIGURACIÓN CRÍTICA ---
const MI_ID_USUARIO = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; // <--- SIN ESTO NO FUNCIONA
const WHATSAPP_NUM = "14845532789"; 
// -----------------------------

let tasaDia = 1;
let carrito = [];

async function inicializarCatalogo() {
    // Intentar obtener la tasa
    try {
        const tasaRef = doc(db, "usuarios", MI_ID_USUARIO, "configuracion", "tasa"); 
        const tasaSnap = await getDoc(tasaRef);
        if (tasaSnap.exists()) {
            tasaDia = tasaSnap.data().valor;
            document.getElementById('tasa-cliente').innerText = tasaDia.toLocaleString('es-VE', {minimumFractionDigits: 2});
        }
    } catch (e) { console.error("Error al cargar tasa:", e); }
    
    cargarProductos();
}

window.seleccionarProducto = (id, nombre, precio) => {
    const card = document.getElementById(`card-${id}`);
    const checkbox = document.getElementById(`check-${id}`);
    const index = carrito.findIndex(item => item.id === id);

    if (index > -1) {
        carrito.splice(index, 1);
        card.classList.remove('seleccionado');
        checkbox.checked = false;
    } else {
        carrito.push({ id, nombre, precio });
        card.classList.add('seleccionado');
        checkbox.checked = true;
    }
    
    document.getElementById('cuenta-productos').innerText = carrito.length;
    document.getElementById('btn-flotante-pedido').style.display = carrito.length > 0 ? 'block' : 'none';
};

async function cargarProductos() {
    try {
        const productosRef = collection(db, "usuarios", MI_ID_USUARIO, "productos");
        // Traemos todos los productos con stock > 0
        const q = query(productosRef, where("stock", ">", 0), orderBy("nombre", "asc"));
        const snap = await getDocs(q);
        
        const grid = document.getElementById('catalogo-productos');
        grid.innerHTML = "";

        if (snap.empty) {
            grid.innerHTML = "<p style='text-align:center; color:#64748b;'>No hay productos disponibles por ahora.</p>";
            return;
        }

        snap.forEach((doc) => {
            const p = doc.data();
            const precioBs = (p.precio * tasaDia).toLocaleString('es-VE', { minimumFractionDigits: 2 });
            const id = doc.id;

            grid.innerHTML += `
                <div class="producto-card" id="card-${id}" onclick="seleccionarProducto('${id}', '${p.nombre}', ${p.precio})">
                    <div class="check-container"><input type="checkbox" id="check-${id}" onclick="event.stopPropagation()"></div>
                    <h3 style="color: #1A1A2E; margin-bottom: 10px; padding-right: 30px;">${p.nombre}</h3>
                    <div style="font-size: 22px; font-weight: 800; color: #15803D;">Bs. ${precioBs}</div>
                    <div style="color: #64748b; font-weight: 600;">$${p.precio.toFixed(2)}</div>
                </div>`;
        });
    } catch (e) {
        console.error("Error al cargar productos:", e);
        document.getElementById('catalogo-productos').innerHTML = "<p style='color:red;'>Error de conexión con la base de datos.</p>";
    }
}

window.enviarPedidoWhatsApp = () => {
    let mensaje = "*PEDIDO DESDE EL CATÁLOGO*%0A%0A";
    let totalUsd = 0;
    carrito.forEach((item, i) => {
        mensaje += `${i + 1}. *${item.nombre}* ($${item.precio})%0A`;
        totalUsd += item.precio;
    });
    const totalBs = (totalUsd * tasaDia).toLocaleString('es-VE', { minimumFractionDigits: 2 });
    mensaje += `%0A*TOTAL ESTIMADO:* $${totalUsd.toFixed(2)} / *Bs. ${totalBs}*`;
    window.open(`https://wa.me/${WHATSAPP_NUM}?text=${mensaje}`, '_blank');
};

inicializarCatalogo();

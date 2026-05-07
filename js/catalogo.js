import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const MI_ID_USUARIO = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; // Tu UID
const WHATSAPP_NUM = "584245484324"; // Tu número

let tasaDia = 1;
let carrito = [];

async function inicializarCatalogo() {
    // 1. Cargar Tasa primero
    try {
        const tasaRef = doc(db, "usuarios", MI_ID_USUARIO, "configuracion", "tasa"); 
        const tasaSnap = await getDoc(tasaRef);
        if (tasaSnap.exists()) {
            tasaDia = tasaSnap.data().valor;
            document.getElementById('tasa-cliente').innerText = tasaDia.toLocaleString('es-VE', {minimumFractionDigits: 2});
        }
    } catch (e) { console.error("Error tasa:", e); }
    
    // 2. Cargar Productos
    cargarProductos();
}

window.seleccionarProducto = (id, nombre, precio) => {
    const card = document.getElementById(`card-${id}`);
    const checkbox = document.getElementById(`check-${id}`);
    const index = carrito.findIndex(item => item.id === id);

    if (index > -1) {
        carrito.splice(index, 1);
        card.classList.remove('seleccionado');
        if(checkbox) checkbox.checked = false;
    } else {
        carrito.push({ id, nombre, precio });
        card.classList.add('seleccionado');
        if(checkbox) checkbox.checked = true;
    }
    
    document.getElementById('cuenta-productos').innerText = carrito.length;
    document.getElementById('btn-flotante-pedido').style.display = carrito.length > 0 ? 'block' : 'none';
};

async function cargarProductos() {
    try {
        // RUTA EXACTA: usuarios > UID > productos
        const productosRef = collection(db, "usuarios", MI_ID_USUARIO, "productos");
        const snap = await getDocs(productosRef); // Consulta simple sin filtros para evitar errores de Index
        
        const grid = document.getElementById('catalogo-productos');
        grid.innerHTML = "";

        if (snap.empty) {
            grid.innerHTML = "<p style='text-align:center; padding:20px;'>No se encontraron productos en la base de datos.</p>";
            return;
        }

        snap.forEach((doc) => {
            const p = doc.data();
            
            // Filtro manual de stock para evitar errores de Firebase
            if (p.stock > 0) {
                const precioBs = (p.precio * tasaDia).toLocaleString('es-VE', { minimumFractionDigits: 2 });
                const id = doc.id;

                grid.innerHTML += `
                    <div class="producto-card" id="card-${id}" onclick="seleccionarProducto('${id}', '${p.nombre}', ${p.precio})">
                        <div class="check-container"><input type="checkbox" id="check-${id}" onclick="event.stopPropagation()"></div>
                        <h3 style="color: #1A1A2E; margin-bottom: 8px; font-family: 'Poppins';">${p.nombre}</h3>
                        <div style="font-size: 22px; font-weight: 800; color: #15803D;">Bs. ${precioBs}</div>
                        <div style="color: #64748b; font-weight: 600; font-size: 14px;">Ref: $${p.precio.toFixed(2)}</div>
                    </div>`;
            }
        });
    } catch (e) {
        console.error("Error crítico en JS:", e);
        document.getElementById('catalogo-productos').innerHTML = `<p style='color:red; text-align:center;'>Error de carga: ${e.message}</p>`;
    }
}

window.enviarPedidoWhatsApp = () => {
    let mensaje = "*NUEVO PEDIDO*%0A";
    let totalUsd = 0;
    carrito.forEach((item, i) => {
        mensaje += `${i + 1}. *${item.nombre}* ($${item.precio.toFixed(2)})%0A`;
        totalUsd += item.precio;
    });
    const totalBs = (totalUsd * tasaDia).toLocaleString('es-VE', { minimumFractionDigits: 2 });
    mensaje += `%0A*TOTAL:* $${totalUsd.toFixed(2)} / *Bs. ${totalBs}*`;
    window.open(`https://wa.me/${WHATSAPP_NUM}?text=${mensaje}`, '_blank');
};

inicializarCatalogo();

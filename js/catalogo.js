import { db } from './firebase-config.js';
import { collection, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const token = localStorage.getItem('licencia_youcontrol');
const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let tasaActual = 1, carrito = {}, productosGlobales = [];

function iniciarCatalogo() {
    if (!USER_ID) return;

    // 1. LIMPIEZA TOTAL AL INICIAR
    document.getElementById('nombre-empresa').innerText = "CARGANDO...";
    document.getElementById('logo-empresa').style.display = 'none';
    document.getElementById('contenedor-catalogo').innerHTML = ""; // Limpiar productos viejos
    productosGlobales = []; // Vaciar memoria
    
    // --- CARGA DE LOGO Y NOMBRE ---
    onSnapshot(doc(db, "empresas_config", USER_ID), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            // Solo actualizamos si realmente hay cambio para evitar parpadeos
            const nombreEl = document.getElementById('nombre-empresa');
            if (data.nombre) nombreEl.innerText = data.nombre.toUpperCase();
            
            const logoImg = document.getElementById('logo-empresa');
            logoImg.src = `https://raw.githubusercontent.com/sistematikos/youcontrol/main/img/${USER_ID}.png`;
            logoImg.style.display = 'block';
        }
    });
    
    // --- RESPALDO DE NOMBRE ---
    if (token) {
        try {
            const data = JSON.parse(atob(token));
            const nombreEl = document.getElementById('nombre-empresa');
            if (nombreEl.innerText === "CARGANDO..." || nombreEl.innerText === "") {
                nombreEl.innerText = (data.n || "EMPRESA").toUpperCase();
            }
        } catch(e) {}
    }

    // --- CARGA DE TASA ---
    onSnapshot(doc(db, "usuarios", USER_ID), (snap) => {
        if (snap.exists()) {
            tasaActual = parseFloat(snap.data().tasa_bcv || 1);
            document.getElementById('tasa-cliente').innerText = tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 });
            renderizarCatalogo(productosGlobales);
        }
    });

    // --- CARGA DE PRODUCTOS ---
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

// Función para añadir o quitar productos del carrito
window.cambiarCant = function(id, cambio, nombre, precio, stock) {
    if (!carrito[id]) {
        if (cambio < 0) return; // No restar si no existe
        carrito[id] = { nombre: nombre, precio: precio, cantidad: 0 };
    }

    // Calcular nueva cantidad
    let nuevaCant = carrito[id].cantidad + cambio;

    // Validar stock y mínimo
    if (nuevaCant > stock) {
        alert("¡Stock máximo alcanzado!");
        return;
    }
    
    if (nuevaCant <= 0) {
        delete carrito[id];
    } else {
        carrito[id].cantidad = nuevaCant;
    }

    // Actualizar visualización
    const qtySpan = document.getElementById(`qty-${id}`);
    if (qtySpan) {
        qtySpan.innerText = carrito[id] ? carrito[id].cantidad : 0;
    }

    actualizarFooter();
};

// Aseguramos que las funciones sean globales para que el HTML las vea siempre
window.cambiarCant = function(id, cambio, nombre, precio, stock) {
    if (!carrito[id]) {
        if (cambio < 0) return;
        carrito[id] = { nombre: nombre, precio: precio, cantidad: 0 };
    }

    let nuevaCant = carrito[id].cantidad + cambio;
    if (nuevaCant > stock) {
        alert("¡Stock máximo alcanzado!");
        return;
    }
    
    if (nuevaCant <= 0) {
        delete carrito[id];
    } else {
        carrito[id].cantidad = nuevaCant;
    }

    const qtySpan = document.getElementById(`qty-${id}`);
    if (qtySpan) qtySpan.innerText = carrito[id] ? carrito[id].cantidad : 0;

    window.actualizarFooter();
};

window.actualizarFooter = function() {
    let total = 0, items = 0;
    for (let id in carrito) { 
        total += carrito[id].precio * carrito[id].cantidad; 
        items += carrito[id].cantidad; 
    }
    const footer = document.getElementById('cart-footer');
    if (footer) {
        footer.style.display = items > 0 ? 'flex' : 'none';
        document.getElementById('cart-total-usd').innerText = total.toFixed(2);
        document.getElementById('cart-total-bs').innerText = (total * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        document.getElementById('cart-count').innerText = items;
    }
};

function renderizarCatalogo(lista) {
    const contenedor = document.getElementById('contenedor-catalogo');
    if (!contenedor) return;

    const coloresDepartamentos = {
        'PARTES ELECTRICAS': '#F59E0B',
        'BEBIDAS': '#3B82F6',
        'ALIMENTOS': '#10B981',
        'REPUESTOS': '#EF4444'
    };

    contenedor.innerHTML = lista.filter(p => parseInt(p.stock || 0) > 0).map(p => {
        const depto = p.departamento ? p.departamento.trim().toUpperCase() : 'GENERAL';
        const colorBorde = coloresDepartamentos[depto] || '#64748B';
        
        return `
        <div class="card-prod" style="border-left: 6px solid ${colorBorde}; border-top: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0;">
            <h3 style="font-size:0.85rem; margin:0 0 5px 0;">${p.nombre}</h3>
            <div style="font-weight:900; color:#10B981; font-size:1.1rem;">
                ${(p.precio * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <button onclick="window.cambiarCant('${p.id}', -1, '${p.nombre}', ${p.precio}, ${p.stock})">-</button>
                <span id="qty-${p.id}">${carrito[p.id]?.cantidad || 0}</span>
                <button onclick="window.cambiarCant('${p.id}', 1, '${p.nombre}', ${p.precio}, ${p.stock})">+</button>
            </div>
        </div>`;
    }).join('');
}

window.enviarPedido = function() {
    if (Object.keys(carrito).length === 0) return;

    let mensaje = "¡Hola! Quisiera realizar el siguiente pedido:\n\n";
    let totalUSD = 0;

    for (let id in carrito) {
        const item = carrito[id];
        const subtotal = item.precio * item.cantidad;
        totalUSD += subtotal;
        mensaje += `• ${item.nombre} x${item.cantidad} ($${item.precio.toFixed(2)} c/u) = $${subtotal.toFixed(2)}\n`;
    }

    mensaje += `\n*TOTAL:* $${totalUSD.toFixed(2)}`;
    mensaje += `\n*TOTAL (Bs):* ${(totalUSD * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs`;

    // Codificar para URL de WhatsApp
    const numeroWhatsApp = "584264570267"; // Tu número en formato internacional sin el '+'
    const urlWhatsApp = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;

    window.open(urlWhatsApp, '_blank');
};
document.addEventListener('DOMContentLoaded', iniciarCatalogo);

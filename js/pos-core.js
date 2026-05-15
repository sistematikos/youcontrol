import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; 

let productosMaster = [];
let carrito = [];
let itemSeleccionadoIndex = -1;
let tasaActual = 1;

async function cargarTasa() {
    try {
        const tasaRef = doc(db, "usuarios", USER_ID, "configuracion", "tasa");
        const tasaSnap = await getDoc(tasaRef);
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1;
            const txtTasa = document.getElementById('txt-tasa');
            if (txtTasa) txtTasa.innerText = tasaActual.toFixed(2).replace('.', ',');
            renderizarProductos(productosMaster);
            window.actualizarCarritoUI();
        }
    } catch (e) { console.error("Error cargando tasa:", e); }
}

function renderizarProductos(lista) {
    const container = document.getElementById('grid-productos');
    if (!container) return;
    container.innerHTML = lista.map(p => {
        const pUSD = parseFloat(p.precio) || 0;
        const pBS = (pUSD * tasaActual).toFixed(2).replace('.', ',');
        return `
            <div class="single-line-row" onclick="window.agregarCarrito('${p.id}')">
                <span style="flex: 1; margin-right: 15px;"><b>${p.nombre}</b></span>
                <div class="price-group">
                    <b>$${pUSD.toFixed(2)}</b>
                    <small>${pBS} Bs.</small>
                </div>
            </div>
        `;
    }).join('');
}

onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
    productosMaster = [];
    snapshot.forEach(doc => productosMaster.push({ id: doc.id, ...doc.data() }));
    renderizarProductos(productosMaster);
});

// ACTUALIZACIÓN UI CON LÍMITE DE 22 CARACTERES
window.actualizarCarritoUI = () => {
    const list = document.getElementById('lista-carrito');
    let total = 0;
    if (!list) return;

    list.innerHTML = carrito.map((c, index) => {
        const subUSD = c.precio * c.cantidad;
        const subBS = (subUSD * tasaActual).toFixed(2).replace('.', ',');
        total += subUSD;
        
        // Limitar nombre a 22 caracteres
        const nombreCorto = c.nombre.length > 22 ? c.nombre.substring(0, 22) + "..." : c.nombre;

        return `
            <div class="single-line-row ${index === itemSeleccionadoIndex ? 'item-selected' : ''}" 
                 onclick="window.seleccionarItem(${index})"
                 style="padding: 12px 0;">
                <span style="flex: 1; margin-right: 15px;">${c.cantidad}x ${nombreCorto}</span>
                <div class="price-group">
                    <b>$${subUSD.toFixed(2)}</b>
                    <small>${subBS} Bs.</small>
                </div>
            </div>`;
    }).join('');
    
    document.getElementById('total-usd').innerText = `$ ${total.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(total * tasaActual).toFixed(2).replace('.', ',')} Bs.`;
    window.totalVentaUSD = total;
};

// FUNCIONES DE TECLAS (REPARADAS)
window.ejecutarF4 = () => {
    if (itemSeleccionadoIndex === -1) return;
    const n = prompt("Nueva Cantidad:", carrito[itemSeleccionadoIndex].cantidad);
    if (n && !isNaN(n)) { carrito[itemSeleccionadoIndex].cantidad = parseInt(n); window.actualizarCarritoUI(); }
};

window.ejecutarF5 = () => {
    if (itemSeleccionadoIndex === -1) return;
    const p = prompt("Nuevo Precio ($):", carrito[itemSeleccionadoIndex].precio);
    if (p && !isNaN(p)) { carrito[itemSeleccionadoIndex].precio = parseFloat(p); window.actualizarCarritoUI(); }
};

window.ejecutarF6 = () => {
    if (itemSeleccionadoIndex === -1) return;
    carrito.splice(itemSeleccionadoIndex, 1);
    itemSeleccionadoIndex = carrito.length > 0 ? carrito.length - 1 : -1;
    window.actualizarCarritoUI();
};

window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    if (item) { item.cantidad++; } else { carrito.push({ ...p, cantidad: 1 }); }
    itemSeleccionadoIndex = carrito.length - 1;
    window.actualizarCarritoUI();
};

window.seleccionarItem = (i) => { itemSeleccionadoIndex = i; window.actualizarCarritoUI(); };

window.abrirModalCobro = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModalUSD').innerText = `$ ${window.totalVentaUSD.toFixed(2)}`;
    document.getElementById('totalModalBS').innerText = `Total: ${(window.totalVentaUSD * tasaActual).toFixed(2).replace('.', ',')} Bs.`;
    document.getElementById('modalPago').style.display = 'flex';
    window.calcularRestante();
};

window.autoCompletarPago = (input) => {
    const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const ef = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const dv = parseFloat(document.getElementById('in-divisas-usd').value) || 0;
    const pagadoUSD = dv + ((p + pm + ef) / tasaActual);
    const faltaUSD = window.totalVentaUSD - pagadoUSD;
    if (faltaUSD <= 0) return;
    input.value = (input.id === 'in-divisas-usd') ? faltaUSD.toFixed(2) : (faltaUSD * tasaActual).toFixed(2);
    window.calcularRestante();
};

window.calcularRestante = () => {
    const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const ef = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const dv = parseFloat(document.getElementById('in-divisas-usd').value) || 0;
    const pagadoUSD = dv + ((p + pm + ef) / tasaActual);
    const btn = document.getElementById('btnConfirmarVenta');
    if(btn) btn.disabled = (window.totalVentaUSD - pagadoUSD) > 0.01;
};

window.registrarVenta = async () => {
    const btn = document.getElementById('btnConfirmarVenta');
    if (!btn || btn.disabled) return;
    btn.innerText = "GUARDANDO..."; btn.disabled = true;
    try {
        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), {
            fecha: serverTimestamp(),
            total_usd: window.totalVentaUSD,
            tasa: tasaActual,
            pagos: {
                punto: parseFloat(document.getElementById('in-punto-bs').value) || 0,
                movil: parseFloat(document.getElementById('in-pagomovil-bs').value) || 0,
                efectivo: parseFloat(document.getElementById('in-efectivo-bs').value) || 0,
                divisas: parseFloat(document.getElementById('in-divisas-usd').value) || 0
            },
            items: carrito.map(i => ({ nombre: i.nombre, cant: i.cantidad, precio: i.precio }))
        });
        alert("✅ Venta registrada");
        carrito = []; window.actualizarCarritoUI();
        document.getElementById('modalPago').style.display = 'none';
    } catch (e) { alert("Error: " + e.message); }
    btn.innerText = "CONFIRMAR VENTA";
};

// CONTROL DE TECLADO REPARADO
window.addEventListener('keydown', (e) => {
    const modalActivo = document.getElementById('modalPago').style.display === 'flex';

    // Permitir Ctrl + F5 para refrescar
    if (e.ctrlKey && e.key === "F5") return;

    if (e.key === "F4") { e.preventDefault(); if (!modalActivo) window.ejecutarF4(); }
    if (e.key === "F5") { e.preventDefault(); if (!modalActivo) window.ejecutarF5(); }
    if (e.key === "F6") { e.preventDefault(); if (!modalActivo) window.ejecutarF6(); }
    if (e.key === "F9") { 
        e.preventDefault(); 
        if (!modalActivo) { window.abrirModalCobro(); } else { window.registrarVenta(); } 
    }
    if (e.key === "Escape") document.getElementById('modalPago').style.display = 'none';
});

cargarTasa();

import { db } from './firebase-config.js';
import { 
    collection, 
    onSnapshot, 
    addDoc, 
    serverTimestamp, 
    doc,
    getDoc // Importante para leer la tasa una vez
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; 

let productosMaster = [];
let carrito = [];
let itemSeleccionadoIndex = -1;
let tasaActual = 1; // Valor inicial, se actualizará desde Firebase

// --- 1. CARGA DE TASA REAL DESDE FIREBASE ---
async function cargarTasa() {
    try {
        const tasaSnap = await getDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"));
        if (tasaSnap.exists()) {
            tasaActual = tasaSnap.data().valor || 1;
            console.log("Tasa actualizada desde DB:", tasaActual);
            // Actualizamos la UI si ya hay algo en el carrito
            window.actualizarCarritoUI();
        }
    } catch (e) {
        console.error("Error cargando tasa:", e);
    }
}

// --- 2. DETECCIÓN DE MODAL ---
const isModalOpen = () => document.getElementById('modalPago').style.display === 'flex';

// --- 3. CARGA DE PRODUCTOS ---
onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
    productosMaster = [];
    snapshot.forEach(doc => productosMaster.push({ id: doc.id, ...doc.data() }));
    renderizarProductos(productosMaster);
});

function renderizarProductos(lista) {
    const container = document.getElementById('grid-productos');
    if (!container) return;
    container.innerHTML = lista.map(p => `
        <div class="single-line-row" onclick="window.agregarCarrito('${p.id}')">
            <span><b>${p.nombre}</b></span>
            <b>$${parseFloat(p.precio).toFixed(2)}</b>
        </div>
    `).join('');
}

// --- GESTIÓN DEL CARRITO ---
window.agregarCarrito = (id) => {
    if (isModalOpen()) return;
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    if (item) { 
        item.cantidad++; 
    } else { 
        carrito.push({ ...p, cantidad: 1 }); 
    }
    itemSeleccionadoIndex = carrito.length - 1;
    window.actualizarCarritoUI();
};

window.actualizarCarritoUI = () => {
    const list = document.getElementById('lista-carrito');
    let total = 0;
    list.innerHTML = carrito.map((c, index) => {
        total += (c.precio * c.cantidad);
        return `<div class="single-line-row ${index === itemSeleccionadoIndex ? 'item-selected' : ''}" onclick="window.seleccionarItem(${index})">
            <span>${c.cantidad}x ${c.nombre}</span>
            <b>$${(c.precio * c.cantidad).toFixed(2)}</b>
        </div>`;
    }).join('');
    
    document.getElementById('total-usd').innerText = `$ ${total.toFixed(2)}`;
    // Aquí ya usa la tasaActual cargada de Firebase
    document.getElementById('total-bs').innerText = `${(total * tasaActual).toFixed(2)} Bs`;
    window.totalVentaUSD = total;
};

window.seleccionarItem = (i) => { itemSeleccionadoIndex = i; window.actualizarCarritoUI(); };

// --- FUNCIONES F (SIN CAMBIOS) ---
window.ejecutarF4 = () => {
    if (isModalOpen() || itemSeleccionadoIndex === -1) return;
    const n = prompt("Nueva Cantidad:", carrito[itemSeleccionadoIndex].cantidad);
    if (n && !isNaN(n)) { carrito[itemSeleccionadoIndex].cantidad = parseInt(n); window.actualizarCarritoUI(); }
};

window.ejecutarF5 = () => {
    if (isModalOpen() || itemSeleccionadoIndex === -1) return;
    const p = prompt("Nuevo Precio ($):", carrito[itemSeleccionadoIndex].precio);
    if (p && !isNaN(p)) { carrito[itemSeleccionadoIndex].precio = parseFloat(p); window.actualizarCarritoUI(); }
};

window.ejecutarF6 = () => {
    if (isModalOpen() || itemSeleccionadoIndex === -1) return;
    carrito.splice(itemSeleccionadoIndex, 1);
    itemSeleccionadoIndex = carrito.length > 0 ? carrito.length - 1 : -1;
    window.actualizarCarritoUI();
};

// --- COBRO Y REGISTRO ---
window.abrirModalCobro = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModalUSD').innerText = `$ ${window.totalVentaUSD.toFixed(2)}`;
    ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd'].forEach(id => document.getElementById(id).value = '');
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
    document.getElementById('btnConfirmarVenta').disabled = (window.totalVentaUSD - pagadoUSD) > 0.01;
};

window.registrarVenta = async () => {
    const btn = document.getElementById('btnConfirmarVenta');
    if (btn.disabled) return;
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

// --- CONTROL DE TECLADO ---
window.addEventListener('keydown', (e) => {
    const modalActivo = isModalOpen();
    if (e.key === "F4") { e.preventDefault(); if (!modalActivo) window.ejecutarF4(); }
    if (e.key === "F6") { e.preventDefault(); if (!modalActivo) window.ejecutarF6(); }
    if (e.key === "F5") {
        if (!e.ctrlKey) { 
            e.preventDefault(); 
            if (!modalActivo) window.ejecutarF5(); 
        } 
    }
    if (e.key === "F9") { 
        e.preventDefault(); 
        if (!modalActivo) {
            window.abrirModalCobro(); 
        } else {
            window.registrarVenta();
        }
    }
    if (e.key === "Escape") document.getElementById('modalPago').style.display = 'none';
});

// --- INICIO ---
cargarTasa(); // Llamamos a la función para obtener la tasa real

import { db } from './firebase-config.js';
import { collection, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; 
let productosMaster = [];
let carrito = [];
let itemSeleccionadoIndex = -1;
let tasaActual = 36.50; 

// --- CARGA INICIAL Y TIEMPO REAL ---
onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
    productosMaster = [];
    snapshot.forEach(doc => productosMaster.push({ id: doc.id, ...doc.data() }));
    renderizarProductos(productosMaster);
});

function renderizarProductos(lista) {
    const container = document.getElementById('grid-productos');
    container.innerHTML = lista.map(p => `
        <div class="single-line-row" onclick="window.agregarCarrito('${p.id}')">
            <span><b>${p.nombre}</b> <small style="color:#94a3b8; margin-left:8px;">Stk: ${p.stock || 0}</small></span>
            <div>
                <span style="font-weight:bold; color:var(--royal-blue);">$${parseFloat(p.precio).toFixed(2)}</span>
                <span style="color:#94a3b8; margin-left:10px; font-size:13px;">${(p.precio * tasaActual).toFixed(2)} Bs</span>
            </div>
        </div>
    `).join('');
}

// --- GESTIÓN DEL CARRITO ---
window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    if (item) {
        item.cantidad++;
    } else {
        carrito.push({ ...p, cantidad: 1 });
    }
    itemSeleccionadoIndex = carrito.length - 1;
    actualizarCarritoUI();
};

window.seleccionarItem = (index) => {
    itemSeleccionadoIndex = index;
    actualizarCarritoUI();
};

function actualizarCarritoUI() {
    const list = document.getElementById('lista-carrito');
    let total = 0;
    list.innerHTML = carrito.map((c, index) => {
        total += (c.precio * c.cantidad);
        const activeClass = index === itemSeleccionadoIndex ? 'item-selected' : '';
        return `<div class="single-line-row ${activeClass}" onclick="window.seleccionarItem(${index})">
            <span><b>${c.cantidad}x</b> ${c.nombre}</span>
            <b>$${(c.precio * c.cantidad).toFixed(2)}</b>
        </div>`;
    }).join('');

    document.getElementById('total-usd').innerText = `$ ${total.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(total * tasaActual).toLocaleString('es-VE')} Bs.`;
    window.totalVentaUSD = total;
}

// --- FUNCIONES F4, F5, F6 ---
window.ejecutarF4 = () => {
    if (itemSeleccionadoIndex === -1) return;
    const n = prompt("Cantidad:", carrito[itemSeleccionadoIndex].cantidad);
    if (n && !isNaN(n)) {
        carrito[itemSeleccionadoIndex].cantidad = parseInt(n);
        actualizarCarritoUI();
    }
};

window.ejecutarF5 = () => {
    if (itemSeleccionadoIndex === -1) return;
    const p = prompt("Precio Unitario ($):", carrito[itemSeleccionadoIndex].precio);
    if (p && !isNaN(p)) {
        carrito[itemSeleccionadoIndex].precio = parseFloat(p);
        actualizarCarritoUI();
    }
};

window.ejecutarF6 = () => {
    if (itemSeleccionadoIndex === -1) return;
    carrito.splice(itemSeleccionadoIndex, 1);
    itemSeleccionadoIndex = carrito.length > 0 ? carrito.length - 1 : -1;
    actualizarCarritoUI();
};

// --- PROCESO DE COBRO ---
window.abrirModalCobro = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModalUSD').innerText = `$ ${window.totalVentaUSD.toFixed(2)}`;
    document.getElementById('totalModalBS').innerText = `${(window.totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs`;
    document.getElementById('modalPago').style.display = 'flex';
    window.calcularRestante();
};

window.calcularRestante = () => {
    const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const ef = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const dv = parseFloat(document.getElementById('in-divisas-usd').value) || 0;

    const totalPagadoUSD = dv + ((p + pm + ef) / tasaActual);
    document.getElementById('btnConfirmarVenta').disabled = (window.totalVentaUSD - totalPagadoUSD) > 0.01;
};

window.registrarVenta = async () => {
    const btn = document.getElementById('btnConfirmarVenta');
    btn.innerText = "REGISTRANDO...";
    btn.disabled = true;

    try {
        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), {
            fecha: serverTimestamp(),
            totalUSD: window.totalVentaUSD,
            tasa: tasaActual,
            items: carrito.map(i => ({ nombre: i.nombre, cant: i.cantidad, precio: i.precio }))
        });
        alert("✅ Venta procesada con éxito");
        carrito = [];
        itemSeleccionadoIndex = -1;
        actualizarCarritoUI();
        document.getElementById('modalPago').style.display = 'none';
        document.getElementById('inputBusqueda').focus();
    } catch (e) {
        alert("Error al guardar venta: " + e.message);
    } finally {
        btn.innerText = "CONFIRMAR VENTA";
    }
};

// --- EVENTOS Y TECLADO ---
document.getElementById('inputBusqueda').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    renderizarProductos(productosMaster.filter(p => p.nombre.toLowerCase().includes(term)));
});

window.addEventListener('keydown', (e) => {
    if (e.key === "F4") { e.preventDefault(); window.ejecutarF4(); }
    if (e.key === "F5") { e.preventDefault(); window.ejecutarF5(); }
    if (e.key === "F6") { e.preventDefault(); window.ejecutarF6(); }
    if (e.key === "F9") { e.preventDefault(); window.abrirModalCobro(); }
    if (e.key === "Escape") { document.getElementById('modalPago').style.display = 'none'; }
});

import { db } from './firebase-config.js';
import { collection, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; 
let productosMaster = [];
let carrito = [];
let tasaActual = 36.50; 

// Cargar productos en tiempo real
onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
    productosMaster = [];
    snapshot.forEach(doc => productosMaster.push({ id: doc.id, ...doc.data() }));
    renderizarProductos(productosMaster);
});

function renderizarProductos(lista) {
    const container = document.getElementById('grid-productos');
    container.innerHTML = lista.map(p => `
        <div class="single-line-row" onclick="window.agregarCarrito('${p.id}')">
            <span><b>${p.nombre}</b> <small style="color:#94a3b8; margin-left:10px;">Stk: ${p.stock || 0}</small></span>
            <div>
                <span style="font-weight:bold; color:var(--royal-blue);">$${parseFloat(p.precio).toFixed(2)}</span>
                <span style="color:#64748b; margin-left:10px;">${(p.precio * tasaActual).toFixed(2)} Bs</span>
            </div>
        </div>
    `).join('');
}

window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    if (item) item.cantidad++;
    else carrito.push({ ...p, cantidad: 1 });
    actualizarCarritoUI();
};

function actualizarCarritoUI() {
    const list = document.getElementById('lista-carrito');
    let total = 0;
    list.innerHTML = carrito.map(c => {
        total += (c.precio * c.cantidad);
        return `<div class="single-line-row">
            <span>${c.cantidad}x ${c.nombre}</span>
            <b>$${(c.precio * c.cantidad).toFixed(2)}</b>
        </div>`;
    }).join('');

    document.getElementById('total-usd').innerText = `$ ${total.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(total * tasaActual).toFixed(2)} Bs.`;
    window.totalVentaUSD = total;
}

window.abrirModalCobro = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModalUSD').innerText = `$ ${window.totalVentaUSD.toFixed(2)}`;
    document.getElementById('totalModalBS').innerText = `${(window.totalVentaUSD * tasaActual).toFixed(2)} Bs`;
    document.getElementById('modalPago').style.display = 'flex';
};

window.registrarVenta = async () => {
    const btn = document.getElementById('btnConfirmarVenta');
    btn.innerText = "PROCESANDO...";
    btn.disabled = true;

    try {
        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), {
            fecha: serverTimestamp(),
            total: window.totalVentaUSD,
            productos: carrito.map(i => ({ n: i.nombre, c: i.cantidad }))
        });
        alert("Venta guardada correctamente");
        carrito = [];
        actualizarCarritoUI();
        document.getElementById('modalPago').style.display = 'none';
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.innerText = "CONFIRMAR VENTA";
    }
};

// Buscador
document.getElementById('inputBusqueda').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    renderizarProductos(productosMaster.filter(p => p.nombre.toLowerCase().includes(term)));
});

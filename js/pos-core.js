import { db } from './firebase-config.js';
import { collection, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ID exacto de tu base de datos en Firebase (ver image_8394d4.png)
const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; 

let productosMaster = [];
let carrito = [];
let itemSeleccionadoIndex = -1;
let tasaActual = 36.50; 

// CARGAR PRODUCTOS DESDE LA RUTA ESPECÍFICA
onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
    productosMaster = [];
    snapshot.forEach(doc => productosMaster.push({ id: doc.id, ...doc.data() }));
    renderizarProductos(productosMaster);
});

function renderizarProductos(lista) {
    const container = document.getElementById('grid-productos');
    container.innerHTML = lista.map(p => `
        <div class="single-line-row" onclick="window.agregarCarrito('${p.id}')">
            <span><b>${p.nombre}</b></span>
            <b>$${parseFloat(p.precio).toFixed(2)}</b>
        </div>
    `).join('');
}

window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    if (item) { item.cantidad++; } else { carrito.push({ ...p, cantidad: 1 }); }
    itemSeleccionadoIndex = carrito.length - 1;
    actualizarCarritoUI();
};

function actualizarCarritoUI() {
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
    document.getElementById('total-bs').innerText = `${(total * tasaActual).toFixed(2)} Bs`;
    window.totalVentaUSD = total;
}

window.seleccionarItem = (i) => { itemSeleccionadoIndex = i; actualizarCarritoUI(); };

// MODULO DE COBRO
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
    document.getElementById('btnConfirmarVenta').disabled = (window.totalVentaUSD - pagadoUSD) > 0.05;
};

// GUARDAR EN FIREBASE (Subcolección VENTAS)
window.registrarVenta = async () => {
    const btn = document.getElementById('btnConfirmarVenta');
    btn.innerText = "GUARDANDO...";
    btn.disabled = true;

    try {
        const ventaData = {
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
        };

        // RUTA: usuarios / sUhfZI9Fy3M9UlInTYw2wFWZmB12 / ventas
        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), ventaData);
        
        alert("Venta registrada con éxito");
        carrito = [];
        actualizarCarritoUI();
        document.getElementById('modalPago').style.display = 'none';
    } catch (e) {
        console.error("Error Firebase:", e);
        alert("Error al guardar: " + e.message);
    } finally {
        btn.innerText = "CONFIRMAR VENTA";
    }
};

// TECLAS DE ACCESO RÁPIDO
window.addEventListener('keydown', (e) => {
    if (e.key === "F9") { e.preventDefault(); window.abrirModalCobro(); }
    if (e.key === "Escape") document.getElementById('modalPago').style.display = 'none';
});

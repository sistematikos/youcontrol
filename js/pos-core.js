import { db } from './firebase-config.js';
import { 
    collection, 
    onSnapshot, 
    addDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración de Identidad y Tasa
const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; 
let productosMaster = [];
let carrito = [];
let itemSeleccionadoIndex = -1;
let tasaActual = 36.50; // Puedes actualizar este valor manualmente o vía Firebase

// --- 1. CARGAR PRODUCTOS DESDE FIREBASE (TIEMPO REAL) ---
const cargarProductos = () => {
    const productosRef = collection(db, "usuarios", USER_ID, "productos");
    
    onSnapshot(productosRef, (snapshot) => {
        productosMaster = [];
        snapshot.forEach((doc) => {
            productosMaster.push({ id: doc.id, ...doc.data() });
        });
        renderizarBusqueda(productosMaster);
    }, (error) => {
        console.error("Error en Firebase:", error);
    });
};

// --- 2. RENDERIZAR LISTA DE PRODUCTOS ---
const renderizarBusqueda = (lista) => {
    const grid = document.getElementById('grid-productos');
    grid.innerHTML = "";

    if (lista.length === 0) {
        grid.innerHTML = `<p style="padding:20px; color:#64748b;">No hay productos en la base de datos.</p>`;
        return;
    }

    lista.forEach(p => {
        const precioBS = (p.precio * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        grid.innerHTML += `
        <div class="single-line-row grid-search" onclick="window.agregarCarrito('${p.id}')">
            <span><b>${p.nombre}</b></span>
            <span style="color:#64748b; text-align:center;">Stk: ${p.stock || 0}</span>
            <span class="price-vibrant">$${parseFloat(p.precio).toFixed(2)}</span>
            <span class="price-soft">${precioBS} Bs</span>
            <i class="fas fa-plus-circle" style="color:var(--royal-blue); text-align:right;"></i>
        </div>`;
    });
    document.getElementById('txt-tasa').innerText = tasaActual.toLocaleString('es-VE');
};

// --- 3. GESTIÓN DEL CARRITO ---
window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const existe = carrito.find(c => c.id === id);
    if (existe) { 
        existe.cantidad++; 
    } else { 
        carrito.push({ ...p, cantidad: 1 }); 
    }
    actualizarCarritoUI();
};

function actualizarCarritoUI() {
    const list = document.getElementById('lista-carrito');
    let totalUSD = 0;
    list.innerHTML = "";
    
    carrito.forEach((c, index) => {
        const subUSD = c.precio * c.cantidad;
        totalUSD += subUSD;
        const selClass = index === itemSeleccionadoIndex ? 'item-selected' : '';
        list.innerHTML += `
        <div class="single-line-row grid-cart ${selClass}" onclick="window.seleccionarItem(${index})">
            <span><b>${c.cantidad}x</b> ${c.nombre}</span>
            <span class="price-vibrant">$${subUSD.toFixed(2)}</span>
        </div>`;
    });

    totalVentaUSD = totalUSD;
    document.getElementById('total-usd').innerText = `$ ${totalUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(totalUSD * tasaActual).toLocaleString('es-VE')} Bs.`;
}

window.seleccionarItem = (index) => {
    itemSeleccionadoIndex = index;
    actualizarCarritoUI();
};

// --- 4. ATAJOS F4, F5, F6 ---
window.ejecutarF4 = () => {
    if (itemSeleccionadoIndex === -1) return;
    const n = prompt("Nueva Cantidad:", carrito[itemSeleccionadoIndex].cantidad);
    if (n && !isNaN(n)) {
        carrito[itemSeleccionadoIndex].cantidad = parseInt(n);
        actualizarCarritoUI();
    }
};

window.ejecutarF6 = () => {
    if (itemSeleccionadoIndex === -1) return;
    carrito.splice(itemSeleccionadoIndex, 1);
    itemSeleccionadoIndex = -1;
    actualizarCarritoUI();
};

// --- 5. MODAL DE COBRO Y FIREBASE ---
let totalVentaUSD = 0;

window.abrirModalCobro = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModalUSD').innerText = `$ ${totalVentaUSD.toFixed(2)}`;
    document.getElementById('totalModalBS').innerText = `${(totalVentaUSD * tasaActual).toLocaleString('es-VE')} Bs`;
    document.getElementById('modalPago').style.display = "flex";
    window.calcularRestante();
};

window.calcularRestante = () => {
    const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const ef = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const dv = parseFloat(document.getElementById('in-divisas-usd').value) || 0;

    const totalPagadoUSD = dv + ((p + pm + ef) / tasaActual);
    const faltante = totalVentaUSD - totalPagadoUSD;
    
    const btn = document.getElementById('btnConfirmarVenta');
    btn.disabled = faltante > 0.01; 
};

window.registrarVenta = async () => {
    const btn = document.getElementById('btnConfirmarVenta');
    btn.disabled = true;
    btn.innerText = "REGISTRANDO...";

    try {
        const ventasRef = collection(db, "usuarios", USER_ID, "ventas");
        await addDoc(ventasRef, {
            fecha: serverTimestamp(),
            totalUSD: totalVentaUSD,
            tasaBCV: tasaActual,
            articulos: carrito.map(i => ({ nombre: i.nombre, cant: i.cantidad, precio: i.precio })),
            metodos: {
                punto: parseFloat(document.getElementById('in-punto-bs').value) || 0,
                pagomovil: parseFloat(document.getElementById('in-pagomovil-bs').value) || 0,
                efectivo: parseFloat(document.getElementById('in-efectivo-bs').value) || 0,
                divisas: parseFloat(document.getElementById('in-divisas-usd').value) || 0
            }
        });

        alert("✅ Venta exitosa");
        carrito = [];
        actualizarCarritoUI();
        document.getElementById('modalPago').style.display = 'none';
    } catch (e) {
        alert("Error al guardar: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "CONFIRMAR VENTA";
    }
};

// --- EVENTOS ---
document.getElementById('inputBusqueda').oninput = (e) => {
    const term = e.target.value.toLowerCase();
    renderizarBusqueda(productosMaster.filter(p => p.nombre.toLowerCase().includes(term)));
};

window.addEventListener('keydown', (e) => {
    if (e.key === "F9") { e.preventDefault(); window.abrirModalCobro(); }
    if (e.key === "F6") { e.preventDefault(); window.ejecutarF6(); }
    if (e.key === "F4") { e.preventDefault(); window.ejecutarF4(); }
});

cargarProductos();

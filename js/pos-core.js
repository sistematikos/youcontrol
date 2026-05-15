import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; 

let productosMaster = [];
let carrito = [];
let itemSeleccionadoIndex = -1;
let tasaActual = 1;

// --- CARGA DE TASA REAL DESDE FIREBASE ---
async function cargarTasa() {
    try {
        const tasaRef = doc(db, "usuarios", USER_ID, "configuracion", "tasa");
        const tasaSnap = await getDoc(tasaRef);
        
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1;
            const txtTasa = document.getElementById('txt-tasa');
            if (txtTasa) txtTasa.innerText = tasaActual.toFixed(2).replace('.', ',');
            
            // Refrescar vistas con la nueva tasa
            renderizarProductos(productosMaster);
            window.actualizarCarritoUI();
        }
    } catch (e) {
        console.error("Error cargando tasa:", e);
    }
}

// --- RENDERIZAR PRODUCTOS IZQUIERDA (PRECIOS AL LADO) ---
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

// --- ACTUALIZAR RESUMEN DE VENTA (ESPACIADO) ---
window.actualizarCarritoUI = () => {
    const list = document.getElementById('lista-carrito');
    let total = 0;
    if (!list) return;

    list.innerHTML = carrito.map((c, index) => {
        const subUSD = c.precio * c.cantidad;
        const subBS = (subUSD * tasaActual).toFixed(2).replace('.', ',');
        total += subUSD;

        return `
            <div class="single-line-row ${index === itemSeleccionadoIndex ? 'item-selected' : ''}" 
                 onclick="window.seleccionarItem(${index})"
                 style="padding: 12px 0;">
                <span style="flex: 1; margin-right: 15px;">${c.cantidad}x ${c.nombre}</span>
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

// --- GESTIÓN DE ITEMS ---
window.agregarCarrito = (id) => {
    const isModalOpen = document.getElementById('modalPago').style.display === 'flex';
    if (isModalOpen) return;
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    if (item) { item.cantidad++; } else { carrito.push({ ...p, cantidad: 1 }); }
    itemSeleccionadoIndex = carrito.length - 1;
    window.actualizarCarritoUI();
};

window.seleccionarItem = (i) => { itemSeleccionadoIndex = i; window.actualizarCarritoUI(); };

// --- COBRO Y REGISTRO ---
window.abrirModalCobro = () => {
    if (carrito.length === 0) return;
    document.getElementById('totalModalUSD').innerText = `$ ${window.totalVentaUSD.toFixed(2)}`;
    document.getElementById('totalModalBS').innerText = `Total: ${(window.totalVentaUSD * tasaActual).toFixed(2).replace('.', ',')} Bs.`;
    ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
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

// Iniciar proceso
cargarTasa();

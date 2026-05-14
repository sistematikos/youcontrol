import { db } from './firebase-config.js';
import { 
    collection, 
    onSnapshot, 
    addDoc, 
    serverTimestamp, 
    doc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ID de usuario verificado desde image_83891e.png
const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12"; 

let productosMaster = [];
let carrito = [];
let itemSeleccionadoIndex = -1;
let tasaActual = 36.50; 

// --- 1. CARGA DE PRODUCTOS EN TIEMPO REAL ---
const productosRef = collection(db, "usuarios", USER_ID, "productos");

onSnapshot(productosRef, (snapshot) => {
    productosMaster = [];
    snapshot.forEach(doc => {
        productosMaster.push({ id: doc.id, ...doc.data() });
    });
    renderizarProductos(productosMaster);
}, (error) => {
    console.error("Error cargando productos:", error);
});

function renderizarProductos(lista) {
    const container = document.getElementById('grid-productos');
    if (!container) return;
    
    container.innerHTML = lista.map(p => `
        <div class="single-line-row" onclick="window.agregarCarrito('${p.id}')">
            <span><b>${p.nombre}</b></span>
            <div>
                <span style="color:var(--royal-blue); font-weight:bold;">$${parseFloat(p.precio).toFixed(2)}</span>
            </div>
        </div>
    `).join('');
}

// --- 2. GESTIÓN DEL CARRITO ---
window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    
    const itemExistente = carrito.find(c => c.id === id);
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({ ...p, cantidad: 1 });
    }
    itemSeleccionadoIndex = carrito.length - 1;
    window.actualizarCarritoUI();
};

window.actualizarCarritoUI = () => {
    const list = document.getElementById('lista-carrito');
    let totalUSD = 0;
    
    list.innerHTML = carrito.map((c, index) => {
        const subtotal = c.precio * c.cantidad;
        totalUSD += subtotal;
        return `
            <div class="single-line-row ${index === itemSeleccionadoIndex ? 'item-selected' : ''}" 
                 onclick="window.seleccionarItem(${index})">
                <span><b>${c.cantidad}x</b> ${c.nombre}</span>
                <b>$${subtotal.toFixed(2)}</b>
            </div>`;
    }).join('');

    document.getElementById('total-usd').innerText = `$ ${totalUSD.toFixed(2)}`;
    document.getElementById('total-bs').innerText = `${(totalUSD * tasaActual).toFixed(2)} Bs`;
    window.totalVentaUSD = totalUSD;
};

window.seleccionarItem = (i) => { 
    itemSeleccionadoIndex = i; 
    window.actualizarCarritoUI(); 
};

// --- 3. LÓGICA DE COBRO ---
window.abrirModalCobro = () => {
    if (carrito.length === 0) return;
    
    document.getElementById('totalModalUSD').innerText = `$ ${window.totalVentaUSD.toFixed(2)}`;
    
    // Limpiar campos
    ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd'].forEach(id => {
        document.getElementById(id).value = '';
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
    
    if (input.id === 'in-divisas-usd') {
        input.value = faltaUSD.toFixed(2);
    } else {
        input.value = (faltaUSD * tasaActual).toFixed(2);
    }
    window.calcularRestante();
};

window.calcularRestante = () => {
    const p = parseFloat(document.getElementById('in-punto-bs').value) || 0;
    const pm = parseFloat(document.getElementById('in-pagomovil-bs').value) || 0;
    const ef = parseFloat(document.getElementById('in-efectivo-bs').value) || 0;
    const dv = parseFloat(document.getElementById('in-divisas-usd').value) || 0;
    
    const totalPagadoUSD = dv + ((p + pm + ef) / tasaActual);
    // Margen de error de 0.01 para habilitar el botón
    document.getElementById('btnConfirmarVenta').disabled = (window.totalVentaUSD - totalPagadoUSD) > 0.01;
};

// --- 4. GUARDADO FINAL EN FIREBASE ---
window.registrarVenta = async () => {
    const btn = document.getElementById('btnConfirmarVenta');
    btn.innerText = "GUARDANDO...";
    btn.disabled = true;

    try {
        // Referencia explícita a la subcolección ventas del usuario
        const ventasRef = collection(db, "usuarios", USER_ID, "ventas");

        const dataVenta = {
            fecha: serverTimestamp(),
            cliente: "Mostrador",
            tasa_bcv: tasaActual,
            monto_total_usd: window.totalVentaUSD,
            metodos_pago: {
                punto_bs: parseFloat(document.getElementById('in-punto-bs').value) || 0,
                pago_movil_bs: parseFloat(document.getElementById('in-pagomovil-bs').value) || 0,
                efectivo_bs: parseFloat(document.getElementById('in-efectivo-bs').value) || 0,
                divisas_usd: parseFloat(document.getElementById('in-divisas-usd').value) || 0
            },
            productos: carrito.map(item => ({
                nombre: item.nombre,
                cantidad: item.cantidad,
                precio_unitario: item.precio,
                subtotal: item.precio * item.cantidad
            }))
        };

        const docRef = await addDoc(ventasRef, dataVenta);
        
        console.log("Documento escrito con ID: ", docRef.id);
        alert("✅ Venta registrada con éxito");

        // Resetear sistema
        carrito = [];
        window.actualizarCarritoUI();
        document.getElementById('modalPago').style.display = 'none';

    } catch (error) {
        console.error("Error al registrar venta:", error);
        alert("❌ Error de Firebase: " + error.message);
    } finally {
        btn.innerText = "CONFIRMAR VENTA";
        btn.disabled = false;
    }
};

// --- 5. EVENTOS DE TECLADO ---
window.addEventListener('keydown', (e) => {
    if (e.key === "F9") {
        e.preventDefault();
        window.abrirModalCobro();
    }
    if (e.key === "Escape") {
        document.getElementById('modalPago').style.display = 'none';
    }
});

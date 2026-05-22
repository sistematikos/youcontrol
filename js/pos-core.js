/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas (pos-core.js)
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, query, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

if (!USER_ID) {
    window.location.href = "index.html"; 
}

let productosMaster = [];
let clientesMaster = []; 
let carrito = [];
let tasaActual = 1;
let proximoNumeroFacturaStr = "000001";

// ==========================================
// 1. CARGA DE DATOS (RUTAS DINÁMICAS)
// ==========================================
function inicializarClientes() {
    const clientesRef = collection(db, "usuarios", USER_ID, "clientes");
    onSnapshot(clientesRef, (snapshot) => {
        clientesMaster = [];
        snapshot.forEach(docSnap => {
            clientesMaster.push({ id: docSnap.id, ...docSnap.data() });
        });
    });
}

function inicializarProductos() {
    const productosRef = collection(db, "usuarios", USER_ID, "productos");
    onSnapshot(productosRef, (snapshot) => {
        productosMaster = [];
        snapshot.forEach(docSnap => {
            productosMaster.push({ id: docSnap.id, ...docSnap.data() });
        });
    });
}

// ==========================================
// 2. MOTORES DE BÚSQUEDA (INTEGRACIÓN UI)
// ==========================================

// Búsqueda de Productos
window.buscarProducto = (texto) => {
    const criterio = texto.toLowerCase().trim();
    if (!criterio) return [];
    return productosMaster.filter(p => 
        (p.id || '').toLowerCase().includes(criterio) || // El ID es el SKU ahora
        (p.nombre || '').toLowerCase().includes(criterio) ||
        (p.barras || '').toLowerCase().includes(criterio)
    );
};

// Búsqueda de Clientes
window.buscarCliente = (texto) => {
    const criterio = texto.toLowerCase().trim();
    if (!criterio) return [];
    return clientesMaster.filter(c => 
        (c.id || '').toLowerCase().includes(criterio) || // El ID es el RIF ahora
        (c.nombre || '').toLowerCase().includes(criterio)
    );
};

// ==========================================
// 3. CARRITO Y VENTAS
// ==========================================
window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    if (item) item.cantidad++; else carrito.push({ ...p, cantidad: 1 });
    window.actualizarCarritoUI();
};

window.registrarVenta = async () => {
    try {
        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), {
            fecha: serverTimestamp(),
            nro_factura: proximoNumeroFacturaStr,
            total_usd: window.totalVentaUSD,
            tasa: tasaActual,
            items: carrito
        });
        alert("✅ Venta registrada: " + proximoNumeroFacturaStr);
        carrito = [];
        window.actualizarCarritoUI();
    } catch (e) { alert("Error: " + e.message); }
};

// ==========================================
// 4. LÓGICA DE VISUALIZACIÓN DE RESULTADOS
// ==========================================

const inputCliente = document.getElementById('buscar-cliente-pos');
const divResultadosCliente = document.getElementById('resultados-cliente-pos');

inputCliente.addEventListener('input', (e) => {
    const texto = e.target.value;
    const resultados = window.buscarCliente(texto);
    
    if (resultados.length > 0 && texto.length > 0) {
        divResultadosCliente.style.display = 'block';
        divResultadosCliente.innerHTML = resultados.map(c => `
            <div class="resultado-item" 
                 style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;"
                 onclick="window.seleccionarCliente('${c.id}', '${c.nombre || 'Sin nombre'}')">
                <strong>${c.id}</strong> - ${c.nombre || 'Sin nombre'}
            </div>
        `).join('');
    } else {
        divResultadosCliente.style.display = 'none';
    }
});

// Función para cuando haces clic en un cliente de la lista
window.seleccionarCliente = (id, nombre) => {
    inputCliente.value = id; // O puedes poner el nombre si prefieres
    divResultadosCliente.style.display = 'none';
    console.log("Cliente seleccionado:", id, nombre);
};

// ==========================================
// INICIALIZACIÓN GLOBAL
// ==========================================
// (Las funciones de tasa y factura se mantienen como estaban)
inicializarClientes();
inicializarProductos();

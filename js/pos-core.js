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
// 4. INTEGRACIÓN UI: BÚSQUEDA DE CLIENTES
// ==========================================
const inputCliente = document.getElementById('buscar-cliente-pos');
const divResultados = document.getElementById('resultados-cliente-pos');

if (inputCliente) {
    inputCliente.addEventListener('input', (e) => {
        const resultados = window.buscarCliente(e.target.value);
        
        if (resultados.length > 0 && e.target.value.trim() !== "") {
            divResultados.style.display = 'block';
            divResultados.innerHTML = resultados.map(c => `
                <div class="resultado-item" 
                     style="padding: 10px; cursor: pointer; border-bottom: 1px solid #f1f5f9;"
                     onclick="window.seleccionarCliente('${c.id}', '${c.nombre}')">
                     <strong>${c.id}</strong> - ${c.nombre}
                </div>
            `).join('');
        } else {
            divResultados.style.display = 'none';
        }
    });
}

window.seleccionarCliente = (id, nombre) => {
    inputCliente.value = nombre; // Pone el nombre en el input
    divResultados.style.display = 'none';
    // Opcional: Guardar el ID en una variable global para la factura
    window.clienteSeleccionadoID = id; 
};

// ==========================================
// 5. INTEGRACIÓN UI: BÚSQUEDA DE PRODUCTOS (DEBUG)
// ==========================================
const inputProducto = document.getElementById('buscar-producto-pos');
const divResultadosProd = document.getElementById('resultados-producto-pos');

if (inputProducto) {
    inputProducto.addEventListener('input', (e) => {
        const texto = e.target.value;
        const resultados = window.buscarProducto(texto);
        
        // DEBUG: Mira esto en la consola del navegador (F12 > Console)
        console.log("Buscando:", texto, "Resultados encontrados:", resultados);
        
        if (resultados.length > 0 && texto.trim() !== "") {
            divResultadosProd.style.display = 'block';
            divResultadosProd.innerHTML = resultados.map(p => `
                <div class="resultado-item" 
                     style="padding: 10px; cursor: pointer; border-bottom: 1px solid #f1f5f9;"
                     onclick="window.seleccionarProducto('${p.id}')">
                     <strong>${p.nombre || 'Sin nombre'}</strong>
                     <span style="float: right; color: var(--primary-color); font-weight: bold;">$${p.precio || '0.00'}</span>
                </div>
            `).join('');
        } else {
            divResultadosProd.style.display = 'none';
        }
    });
}

// ==========================================
// 6. EJECUCIÓN DE SELECCIÓN DE PRODUCTO
// ==========================================
window.seleccionarProducto = (id) => {
    // 1. Agregamos el producto al carrito usando tu función original
    window.agregarCarrito(id);
    
    // 2. Limpiamos el input de búsqueda
    inputProducto.value = '';
    
    // 3. Ocultamos el menú desplegable de resultados
    divResultadosProd.style.display = 'none';
    
    // 4. Devolvemos el foco al input para que puedas seguir buscando rápido
    inputProducto.focus();
    
    console.log("Producto agregado al carrito:", id);
};

// ==========================================
// 7. ACTUALIZACIÓN VISUAL DEL CARRITO
// ==========================================
window.actualizarCarritoUI = () => {
    const contenedor = document.getElementById('lista-carrito'); // Asegúrate que este ID exista en tu HTML
    if (!contenedor) return;

    // Pintar los productos en el carrito
    contenedor.innerHTML = carrito.map((item, index) => `
        <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
            <div>
                <strong>${item.nombre}</strong><br>
                <small>${item.cantidad} x $${item.precio || 0}</small>
            </div>
            <div>
                $${(item.cantidad * (item.precio || 0)).toFixed(2)}
            </div>
        </div>
    `).join('');

    // Calcular y actualizar totales
    const total = carrito.reduce((sum, item) => sum + (item.cantidad * (item.precio || 0)), 0);
    window.totalVentaUSD = total;
    
    // Si tienes elementos con estos IDs, los actualiza
    if(document.getElementById('total-usd')) document.getElementById('total-usd').innerText = `$ ${total.toFixed(2)}`;
};

// ==========================================
// 8. COMANDOS RÁPIDOS DE TECLADO (F4, F5, F6, F9)
// ==========================================
document.addEventListener('keydown', (event) => {
    switch(event.key) {
        case 'F4':
            event.preventDefault(); // Evita el comportamiento por defecto del navegador
            window.ejecutarF4();
            break;
        case 'F5':
            event.preventDefault();
            window.ejecutarF5();
            break;
        case 'F6':
            event.preventDefault();
            window.ejecutarF6();
            break;
        case 'F9':
            event.preventDefault();
            window.abrirModalCobro();
            break;
    }
});

// ==========================================
// INICIALIZACIÓN GLOBAL
// ==========================================
// (Las funciones de tasa y factura se mantienen como estaban)
inicializarClientes();
inicializarProductos();

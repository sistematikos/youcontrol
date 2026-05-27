/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas (pos-core.js)
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

if (!USER_ID) {
    window.location.href = "index.html"; 
}

let productosMaster = [];
let clientesMaster = []; 
let carrito = [];
// Mantenemos tu variable original de contador
let proximoNumeroFacturaStr = "000001"; 
let tasaActual = 1.0; 
let formatoFactura = "ticket";

window.indiceProd = -1;
window.indiceClie = -1;

// ==========================================
// 1. CARGA DE CONFIGURACIÓN Y DATOS
// ==========================================
async function cargarConfiguracionGlobal() {
    try {
        const userDocRef = doc(db, "usuarios", USER_ID);
        const snapConfig = await getDoc(userDocRef);
        
        if (snapConfig.exists()) {
            const data = snapConfig.data();
            tasaActual = data.tasa_bcv || 1.0;
            formatoFactura = data.formato_factura || "ticket";
            
            const spanTasa = document.getElementById('txt-tasa');
            if (spanTasa) {
                spanTasa.innerText = tasaActual.toLocaleString('es-VE', {minimumFractionDigits: 2});
            }
        }
    } catch (e) {
        console.error("Error al cargar configuración:", e);
    }
}

function inicializarClientes() {
    const clientesRef = collection(db, "usuarios", USER_ID, "clientes");
    onSnapshot(clientesRef, (snapshot) => {
        clientesMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Clientes cargados:", clientesMaster.length);
    });
}

function inicializarProductos() {
    const productosRef = collection(db, "usuarios", USER_ID, "productos");
    onSnapshot(productosRef, (snapshot) => {
        productosMaster = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Productos cargados:", productosMaster.length);
    });
}

// ==========================================
// 2. MOTORES DE BÚSQUEDA Y CARRITO
// ==========================================
window.buscarProducto = (texto) => {
    const criterio = texto.toLowerCase().trim();
    return !criterio ? [] : productosMaster.filter(p => (p.id?.toLowerCase().includes(criterio) || p.nombre?.toLowerCase().includes(criterio) || p.barras?.toLowerCase().includes(criterio)));
};

window.buscarCliente = (texto) => {
    const criterio = texto.toLowerCase().trim();
    return !criterio ? [] : clientesMaster.filter(c => (c.id?.toLowerCase().includes(criterio) || c.nombre?.toLowerCase().includes(criterio)));
};

window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    if (item) item.cantidad++; else carrito.push({ ...p, cantidad: 1 });
    window.actualizarCarritoUI();
};

// ==========================================
// 3. REGISTRO DE VENTA (EL CORAZÓN DEL SISTEMA)
// ==========================================
window.registrarVenta = async () => {
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    try {
        const ventaData = {
            cliente_id: window.clienteSeleccionadoID || "anonimo",
            items: carrito,
            total_usd: window.totalVentaUSD || 0,
            tasa_aplicada: tasaActual,
            pagos: {
                punto_bs: parseFloat(document.getElementById('in-punto-bs')?.value) || 0,
                pago_movil_bs: parseFloat(document.getElementById('in-pagomovil-bs')?.value) || 0,
                efectivo_bs: parseFloat(document.getElementById('in-efectivo-bs')?.value) || 0,
                divisas_usd: parseFloat(document.getElementById('in-divisas-usd')?.value) || 0
            },
            fecha: serverTimestamp(),
            nro_factura: proximoNumeroFacturaStr // Usando tu contador original
        };

        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), ventaData);

        alert("✅ Venta registrada. Factura N°: " + proximoNumeroFacturaStr);

        // Limpieza y actualización del contador
        carrito = [];
        window.clienteSeleccionadoID = null;
        window.actualizarCarritoUI();
        document.getElementById('modalPago').style.display = 'none';
        
        // Incremento del contador original
        proximoNumeroFacturaStr = (parseInt(proximoNumeroFacturaStr) + 1).toString().padStart(6, '0');
        
        // Reset inputs
        ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = "0";
        });

    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error al guardar: " + error.message);
    }
};

// ==========================================
// 4. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    cargarConfiguracionGlobal().then(() => {
        inicializarClientes();
        inicializarProductos();
    });
});

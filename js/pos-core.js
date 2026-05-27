/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas (pos-core.js)
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc,
    query, orderBy, limit, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

if (!USER_ID) {
    window.location.href = "index.html";
}

// Variables Globales
let productosMaster = [];
let clientesMaster = [];
let carrito = [];
let tasaActual = 1.0;
let formatoFactura = "ticket";

window.indiceProd = -1;
window.indiceClie = -1;

// ==========================================
// 1. CARGA DE CONFIGURACIÓN Y DATOS
// ==========================================
async function cargarConfiguracionGlobal() {
    try {
        const snapConfig = await getDoc(doc(db, "usuarios", USER_ID));
        if (snapConfig.exists()) {
            const data = snapConfig.data();
            tasaActual = data.tasa_bcv || 1.0;
            formatoFactura = data.formato_factura || "ticket";
            const spanTasa = document.getElementById('txt-tasa');
            if (spanTasa) spanTasa.innerText = tasaActual.toLocaleString('es-VE', {minimumFractionDigits: 2});
        }
    } catch (e) { console.error("Error al cargar configuración:", e); }
}

function inicializarClientes() {
    onSnapshot(collection(db, "usuarios", USER_ID, "clientes"), (snap) => {
        clientesMaster = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });
}

function inicializarProductos() {
    onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
        productosMaster = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });
}

// ==========================================
// 2. LÓGICA DE VENTA (FACTURA DINÁMICA)
// ==========================================
async function obtenerSiguienteFactura() {
    const q = query(collection(db, "usuarios", USER_ID, "ventas"), orderBy("nro_factura", "desc"), limit(1));
    const snap = await getDocs(q);
    let ultimoNro = 0;
    snap.forEach(d => { if (d.data().nro_factura) ultimoNro = parseInt(d.data().nro_factura); });
    return (ultimoNro + 1).toString().padStart(6, '0');
}

window.registrarVenta = async () => {
    if (carrito.length === 0) return alert("El carrito está vacío.");

    try {
        // Cálculo de factura en tiempo real (evita duplicados o errores)
        const nroFacturaActual = await obtenerSiguienteFactura();
        
        const ventaData = {
            cliente_id: window.clienteSeleccionadoID || "anonimo",
            nombre_cliente: window.nombreClienteSeleccionado || document.getElementById('buscar-cliente-pos')?.value || "Anónimo",
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
            nro_factura: nroFacturaActual
        };

        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), ventaData);
        alert(`✅ Venta registrada. Factura N°: ${nroFacturaActual}`);

        // Limpieza
        carrito = [];
        window.clienteSeleccionadoID = null;
        window.nombreClienteSeleccionado = null;
        document.getElementById('buscar-cliente-pos').value = '';
        document.getElementById('modalPago').style.display = 'none';
        ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = "0";
        });
        window.actualizarCarritoUI();

    } catch (error) {
        console.error("Error:", error);
        alert("Error al guardar: " + error.message);
    }
};

// ==========================================
// 3. MOTORES Y UI (Búsqueda, Navegación, Pagos)
// ==========================================
// (Aquí incluirías tus funciones de buscarProducto, buscarCliente, 
//  manejarNavegacion, initBuscadores, initLogicaPagos y actualizarCarritoUI 
//  que ya tenías funcionando)

// ==========================================
// 4. INICIALIZACIÓN FINAL
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    cargarConfiguracionGlobal().then(() => {
        inicializarClientes();
        inicializarProductos();
    });
});

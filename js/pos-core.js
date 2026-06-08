/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas (pos-core.js)
 */

import { db } from './firebase-config.js'; 
import { collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { doc, runTransaction, addDoc, collection, updateDoc, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ejecutarF4, ejecutarF5, ejecutarF6, abrirModalCobro } from './pos-core-teclas.js';

// --- VALIDACIÓN DE SESIÓN ---
const USER_ID = localStorage.getItem('youcontrol_empresa_id');
if (!USER_ID) {
    window.location.href = "index.html"; 
}

// --- VARIABLES GLOBALES (Todo centralizado en 'window') ---
window.USER_ID = USER_ID;
window.productosMaster = [];
window.clientesMaster = []; 
window.carrito = [];
window.tasaActual = 1.0; 
window.totalVentaUSD = 0;
window.proximoNumeroFacturaStr = "000001";
window.formatoFactura = "ticket";
window.indiceProd = -1;
window.indiceClie = -1;

// --- VINCULACIÓN PARA MÓDULOS Y HTML ---
window.ejecutarF4 = ejecutarF4;
window.ejecutarF5 = ejecutarF5;
window.ejecutarF6 = ejecutarF6;
window.abrirModalCobro = abrirModalCobro;

// ==========================================
// CARGA DE CONFIGURACIÓN GLOBAL
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

// ==========================================
// 1. CARGA DE DATOS
// ==========================================
function inicializarClientes() {
    const clientesRef = collection(db, "usuarios", USER_ID, "clientes");
    onSnapshot(clientesRef, (snapshot) => {
        clientesMaster = [];
        snapshot.forEach(docSnap => {
            clientesMaster.push({ id: docSnap.id, ...docSnap.data() });
        });
        console.log("Clientes cargados:", clientesMaster.length);
    });
}

function inicializarProductos() {
    const productosRef = collection(db, "usuarios", USER_ID, "productos");
    onSnapshot(productosRef, (snapshot) => {
        productosMaster = [];
        snapshot.forEach(docSnap => {
            productosMaster.push({ id: docSnap.id, ...docSnap.data() });
        });
        console.log("Productos cargados:", productosMaster.length);
    });
}

// ==========================================
// 2. MOTORES DE BÚSQUEDA
// ==========================================
window.buscarProducto = (texto) => {
    const criterio = texto.toLowerCase().trim();
    if (!criterio) return [];
    return productosMaster.filter(p => 
        (p.id || '').toLowerCase().includes(criterio) || 
        (p.nombre || '').toLowerCase().includes(criterio) ||
        (p.barras || '').toLowerCase().includes(criterio)
    );
};

window.buscarCliente = (texto) => {
    const criterio = texto.toLowerCase().trim();
    if (!criterio) return [];
    return clientesMaster.filter(c => 
        (c.id || '').toLowerCase().includes(criterio) || 
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

// ==========================================
// NUEVA FUNCIÓN: REGISTRAR VENTA
// ==========================================
// --- ACTUALIZA TU FUNCIÓN registrarVenta ---
window.registrarVenta = async () => {
    if (carrito.length === 0) return alert("El carrito está vacío.");

    try {
        // Obtenemos el número real en el momento de la venta
        const nroFactura = await obtenerSiguienteNumero(USER_ID);

        const ventaData = {
            cliente_id: window.clienteSeleccionadoID || "anonimo",
            nombre_cliente: window.nombreClienteSeleccionado || "Anónimo",
            items: carrito,
            total_usd: window.totalVentaUSD || 0,
            nro_factura: nroFactura, // <--- Aquí usamos el número calculado
            fecha: serverTimestamp(),
            // ... resto de tus campos de pago
        };

        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), ventaData);
        
        // ... (Tu lógica de descontar inventario y limpieza)

        alert("✅ Venta registrada con Nro: " + nroFactura);
        
        // Recargamos el número para la siguiente venta
        const proximoNro = await obtenerSiguienteNumero(USER_ID); 
        document.getElementById('factura-display').innerText = `FACTURA: ${proximoNro}`;
        
    } catch (error) {
        alert("Error: " + error.message);
    }
};

// --- ACTUALIZA TU DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', async () => {
    await cargarConfiguracionGlobal();
    
    // Obtenemos el número inicial para mostrar
    const contadorRef = doc(db, "usuarios", USER_ID, "config", "contador_facturas");
    const snap = await getDoc(contadorRef);
    const ultimo = snap.exists() ? snap.data().ultimo : 0;
    document.getElementById('factura-display').innerText = `FACTURA: ${(ultimo + 1).toString().padStart(6, '0')}`;

    inicializarClientes();
    inicializarProductos();
});

// ==========================================
// 4. INTEGRACIÓN UI: SELECCIÓN Y NAVEGACIÓN
// ==========================================
window.seleccionarCliente = (id, nombre) => {
    const inputCliente = document.getElementById('buscar-cliente-pos');
    const divResultados = document.getElementById('resultados-cliente-pos');
    
    inputCliente.value = nombre;
    divResultados.style.display = 'none';
    
    window.clienteSeleccionadoID = id; 
    window.nombreClienteSeleccionado = nombre; // <--- AGREGA ESTA LÍNEA
    
    document.getElementById('buscar-producto-pos')?.focus();
};

window.seleccionarProducto = (id) => {
    window.agregarCarrito(id);
    document.getElementById('buscar-producto-pos').value = '';
    document.getElementById('resultados-producto-pos').style.display = 'none';
    document.getElementById('buscar-producto-pos').focus();
};

// Lógica de navegación con flechas unificada
window.manejarNavegacion = (e, contenedorId, indiceVar) => {
    const cont = document.getElementById(contenedorId);
    if (!cont || cont.style.display === 'none') return -1;
    const items = cont.querySelectorAll('.resultado-item');
    if (!items.length) return -1;

    if (e.key === 'ArrowDown') {
        indiceVar = (indiceVar < items.length - 1) ? indiceVar + 1 : 0;
    } else if (e.key === 'ArrowUp') {
        indiceVar = (indiceVar > 0) ? indiceVar - 1 : items.length - 1;
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[indiceVar]) items[indiceVar].click();
        return -1;
    } else return indiceVar;

    items.forEach((it, i) => it.classList.toggle('seleccionado', i === indiceVar));
    items[indiceVar].scrollIntoView({ block: 'nearest' });
    return indiceVar;
};

// ==========================================
// 5. INICIALIZACIÓN POR SECCIONES
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM cargado - Inicializando módulos...");

    // Inicializar buscadores (Responsabilidad: Selección de datos)
    initBuscadores();

    // Inicializar pagos (Responsabilidad: Cierre de venta)
    initLogicaPagos();
});

// Bloque 1: Separado y modular
function initBuscadores() {
    const inputCliente = document.getElementById('buscar-cliente-pos');
    const inputProd = document.getElementById('buscar-producto-pos');

    // Listener Cliente
    inputCliente?.addEventListener('input', (e) => {
        const resultados = window.buscarCliente(e.target.value);
        const divRes = document.getElementById('resultados-cliente-pos');
        if (resultados.length > 0 && e.target.value.trim() !== "") {
            divRes.style.display = 'block';
            divRes.innerHTML = resultados.map(c => `
                <div class="resultado-item" style="padding: 10px; cursor: pointer;"
                     onclick="window.seleccionarCliente('${c.id}', '${c.nombre.replace(/'/g, "\\'")}')">
                     <strong>${c.id}</strong> - ${c.nombre}
                </div>`).join('');
        } else { divRes.style.display = 'none'; }
    });

    // Listener Producto
    inputProd?.addEventListener('input', (e) => {
        const resultados = window.buscarProducto(e.target.value);
        const divRes = document.getElementById('resultados-producto-pos');
        if (resultados.length > 0 && e.target.value.trim() !== "") {
            divRes.style.display = 'block';
            divRes.innerHTML = resultados.map(p => `
                <div class="resultado-item" style="padding: 10px; cursor: pointer;"
                     onclick="window.seleccionarProducto('${p.id}')">
                     <strong>${p.nombre}</strong> - $${p.precio}
                </div>`).join('');
        } else { divRes.style.display = 'none'; }
    });
}

// Bloque 2: Separado y modular
function initLogicaPagos() {
    const camposBs = ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs'];
    const inputDivisas = document.getElementById('in-divisas-usd');

    // Eventos Click en Bs
    camposBs.forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            const el = document.getElementById(id);
            const totalBs = (window.totalVentaUSD || 0) * tasaActual;
            const valorDivisasBs = (parseFloat(inputDivisas?.value) || 0) * tasaActual;
            const sumOtrosBs = camposBs
                .filter(c => c !== id)
                .reduce((acc, cId) => acc + (parseFloat(document.getElementById(cId)?.value) || 0), 0);
            
            const pendiente = totalBs - sumOtrosBs - valorDivisasBs;
            el.value = (pendiente > 0 ? pendiente : 0).toFixed(2);
        });
    });

    // Evento Divisas
    inputDivisas?.addEventListener('click', () => {
        const totalBs = (window.totalVentaUSD || 0) * tasaActual;
        const sumBs = camposBs.reduce((acc, cId) => acc + (parseFloat(document.getElementById(cId)?.value) || 0), 0);
        const pendienteBs = totalBs - sumBs;
        inputDivisas.value = (pendienteBs / tasaActual > 0 ? (pendienteBs / tasaActual) : 0).toFixed(2);
    });
}

// ==========================================
// 7. ACTUALIZACIÓN VISUAL Y COMANDOS
// ==========================================
window.actualizarCarritoUI = () => {
    const contenedor = document.getElementById('lista-carrito');
    if (!contenedor) return;
    contenedor.innerHTML = carrito.map(item => `
        <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
            <div><strong>${item.nombre}</strong><br><small>${item.cantidad} x $${item.precio || 0}</small></div>
            <div>$${(item.cantidad * (item.precio || 0)).toFixed(2)}</div>
        </div>
    `).join('');
    
    const totalUSD = carrito.reduce((sum, item) => sum + (item.cantidad * (item.precio || 0)), 0);
    window.totalVentaUSD = totalUSD;
    if(document.getElementById('total-usd')) document.getElementById('total-usd').innerText = `$ ${totalUSD.toFixed(2)}`;
    const totalBs = totalUSD * tasaActual;
    if(document.getElementById('total-bs')) document.getElementById('total-bs').innerText = `${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.`;
};

// ==========================================
// 8. COMANDOS DE TECLADO (BLOQUEO FORZADO)
// ==========================================
// Asegúrate de que al inicio de tu archivo pos-core.js tengas esta línea:
// import { ejecutarF4, ejecutarF5, ejecutarF6, abrirModalCobro } from './pos-core-teclas.js';

document.addEventListener('keydown', (event) => {
    // 1. Manejo del F5
    if (event.key === 'F5') {
        event.preventDefault();
        event.stopImmediatePropagation();
        
        const modalPago = document.getElementById('modalPago');
        const estaEnPago = modalPago && (window.getComputedStyle(modalPago).display !== 'none');

        if (estaEnPago) {
            if (confirm("¿Deseas refrescar la página? Se perderán los datos del carrito.")) {
                window.location.reload();
            }
        } else {
            // Llamada directa a la función importada (sin window.)
            ejecutarF5(); 
        }
        return;
    }

    // 2. Manejo de otros comandos
    // Usamos las funciones importadas directamente
    const comandos = {
        'F4': ejecutarF4,
        'F6': ejecutarF6,
        'F9': abrirModalCobro
    };

    if (comandos[event.key]) {
        event.preventDefault();
        comandos[event.key]();
    }
}, true);

// ==========================================
// ACTIVACIÓN DINÁMICA DEL BOTÓN DE VENTA
// ==========================================
// Esto escucha cambios dentro del modal de pago para activar el botón
document.addEventListener('input', (e) => {
    const targetId = e.target.id;
    // Lista de IDs de campos de pago
    const camposPago = ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd'];
    
    if (camposPago.includes(targetId)) {
        const btn = document.getElementById('btn-confirmar-venta');
        if (btn) {
            btn.disabled = false; // Habilita el botón al escribir en los campos de pago
        }
    }
});

async function obtenerSiguienteNumero(userId) {
    const contadorRef = doc(db, "usuarios", userId, "config", "contador_facturas");
    try {
        const nuevoNro = await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(contadorRef);
            let nuevoValor = 1;
            if (sfDoc.exists()) {
                nuevoValor = sfDoc.data().ultimo + 1;
            }
            transaction.set(contadorRef, { ultimo: nuevoValor });
            return nuevoValor;
        });
        return nuevoNro.toString().padStart(6, '0');
    } catch (e) {
        console.error("Error al obtener contador:", e);
        return "000001";
    }
}

// ==========================================
// INICIALIZACIÓN FINAL
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM cargado - Inicializando módulos...");

    // 1. Cargamos configuración
    await cargarConfiguracionGlobal();

    // 2. Cargamos el número de factura (NUEVA LÍNEA)
    const nuevoNro = await obtenerUltimoNumero(USER_ID);
    const elFactura = document.getElementById('factura-display');
    if (elFactura) elFactura.innerText = `FACTURA: ${nuevoNro}`;

    // 3. Inicializamos el resto
    inicializarClientes();
    inicializarProductos();
    initBuscadores();
    initLogicaPagos();
});

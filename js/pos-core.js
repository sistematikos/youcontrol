/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas (pos-core.js)
 */

import { 
    collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, 
    query, orderBy, limit, getDocs // <--- AGREGA ESTAS
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

if (!USER_ID) {
    window.location.href = "index.html"; 
}

let productosMaster = [];
let clientesMaster = []; 
let carrito = [];
let proximoNumeroFacturaStr = "000001";
let tasaActual = 1.0; 
let formatoFactura = "ticket";

// Variables globales para navegación
window.indiceProd = -1;
window.indiceClie = -1;


async function obtenerUltimoNumeroFactura() {
    try {
        const ventasRef = collection(db, "usuarios", USER_ID, "ventas");
        // Consultamos las ventas ordenadas por fecha para obtener la última
        const q = query(ventasRef, orderBy("fecha", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const ultimaVenta = querySnapshot.docs[0].data();
            const ultimoNro = parseInt(ultimaVenta.nro_factura || "0");
            proximoNumeroFacturaStr = (ultimoNro + 1).toString().padStart(6, '0');
        } else {
            proximoNumeroFacturaStr = "000001";
        }
    } catch (e) {
        console.error("Error al obtener último número:", e);
    }
}


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

window.registrarVenta = async () => {
    try {
        // En lugar de usar una variable global fija, aseguramos el número al momento de guardar
        // Opcional: podrías llamar a una función que busque el último ID en Firestore aquí mismo
        
        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), {
            fecha: serverTimestamp(),
            nro_factura: proximoNumeroFacturaStr, // Usa la variable que ya tienes
            total_usd: window.totalVentaUSD,
            tasa: tasaActual,
            formato: formatoFactura,
            items: carrito
        });

        alert("✅ Venta registrada correctamente.");
        
        // Limpiamos
        carrito = [];
        window.actualizarCarritoUI();
        document.getElementById('modalPago').style.display = 'none';
        
        // IMPORTANTE: Incrementamos el contador para la próxima venta
        const ultimoNro = parseInt(proximoNumeroFacturaStr);
        proximoNumeroFacturaStr = (ultimoNro + 1).toString().padStart(6, '0');
        
    } catch (e) { alert("Error al guardar: " + e.message); }
};

// ==========================================
// 4. INTEGRACIÓN UI: SELECCIÓN Y NAVEGACIÓN
// ==========================================
window.seleccionarCliente = (id, nombre) => {
    const inputCliente = document.getElementById('buscar-cliente-pos');
    const divResultados = document.getElementById('resultados-cliente-pos');
    inputCliente.value = nombre;
    divResultados.style.display = 'none';
    window.clienteSeleccionadoID = id; 
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
document.addEventListener('keydown', (event) => {
    // 1. Manejo del F5 (Control de refresco)
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
            window.ejecutarF5();
        }
        return;
    }

    // 2. Manejo de otros comandos (F4, F6, F9)
    const comandos = {
        'F4': window.ejecutarF4,
        'F6': window.ejecutarF6,
        'F9': window.abrirModalCobro
    };

    if (comandos[event.key]) {
        event.preventDefault();
        comandos[event.key]();
    }
}, true);

// --- Funciones de Comandos ---
window.ejecutarF4 = () => { 
    if (carrito.length === 0) return;
    const item = carrito[carrito.length - 1];
    const nuevaCant = prompt(`Cantidad para ${item.nombre}:`, item.cantidad);
    if (nuevaCant !== null && !isNaN(nuevaCant) && nuevaCant > 0) {
        item.cantidad = parseInt(nuevaCant);
        window.actualizarCarritoUI();
    }
};

window.ejecutarF5 = () => { 
    if (carrito.length === 0) return;
    const item = carrito[carrito.length - 1];
    const nuevoPrecio = prompt(`Precio para ${item.nombre} ($):`, item.precio);
    if (nuevoPrecio !== null && !isNaN(nuevoPrecio)) {
        item.precio = parseFloat(nuevoPrecio);
        window.actualizarCarritoUI();
    }
};

window.ejecutarF6 = () => { 
    if (carrito.length > 0) {
        carrito.pop();
        window.actualizarCarritoUI();
    }
};

window.abrirModalCobro = () => {
    if (carrito.length === 0) { alert("El carrito está vacío."); return; }
    
    const modal = document.getElementById('modalPago');
    if (modal) {
        const totalUSD = window.totalVentaUSD || 0;
        const totalBs = totalUSD * tasaActual;
        
        const dUSD = document.getElementById('totalModalUSD');
        const dBS = document.getElementById('totalModalBS');
        
        if (dUSD) dUSD.innerText = `$ ${totalUSD.toFixed(2)}`;
        if (dBS) dBS.innerText = `${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.`;
        
        modal.style.display = 'flex';
        document.getElementById('in-punto-bs')?.focus();
    }
};

// ==========================================
// NUEVA FUNCIÓN: REGISTRAR VENTA
// ==========================================
window.registrarVenta = async () => {
    // 1. Obtener datos del DOM
    const puntoBs = parseFloat(document.getElementById('in-punto-bs')?.value) || 0;
    const pagoMovilBs = parseFloat(document.getElementById('in-pagomovil-bs')?.value) || 0;
    const efectivoBs = parseFloat(document.getElementById('in-efectivo-bs')?.value) || 0;
    const divisasUsd = parseFloat(document.getElementById('in-divisas-usd')?.value) || 0;
    
    // 2. Validar que la venta no esté vacía
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    try {
        // 3. Crear el objeto de la venta
        const ventaData = {
            cliente_id: window.clienteSeleccionadoID || "anonimo",
            items: carrito,
            total_usd: window.totalVentaUSD,
            tasa_aplicada: tasaActual,
            pagos: {
                punto_bs: puntoBs,
                pago_movil_bs: pagoMovilBs,
                efectivo_bs: efectivoBs,
                divisas_usd: divisasUsd
            },
            fecha: serverTimestamp(),
            nro_factura: proximoNumeroFacturaStr
        };

        // 4. Guardar en Firestore
        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), ventaData);

        alert("✅ Venta registrada con éxito.");

        // 5. Limpiar y resetear
        carrito = [];
        window.clienteSeleccionadoID = null;
        document.getElementById('buscar-cliente-pos').value = '';
        document.getElementById('modalPago').style.display = 'none';
        
        // Resetear campos de pago
        ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = "0";
        });

        window.actualizarCarritoUI();

    } catch (error) {
        console.error("Error al guardar venta:", error);
        alert("Error al guardar la venta: " + error.message);
    }
};

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

// ==========================================
// INICIALIZACIÓN FINAL
// ==========================================
cargarConfiguracionGlobal().then(async () => {
    await obtenerUltimoNumeroFactura(); // <--- AGREGAR ESTO
    inicializarClientes();
    inicializarProductos();
});

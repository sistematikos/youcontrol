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
let proximoNumeroFacturaStr = "000001";
let tasaActual = 1.0; 
let formatoFactura = "ticket";

// Variables globales para navegación
window.indiceProd = -1;
window.indiceClie = -1;

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
    // 3. LÓGICA DE PAGOS (Cálculo automático)
    // ==========================================
    const idsBs = ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs'];
    const inputDivisas = document.getElementById('in-divisas-usd');

    // Función que recalcula el pendiente
    const calcularPendiente = (campoActualId) => {
        const totalVentaBs = (window.totalVentaUSD || 0) * tasaActual;
        
        // Sumar lo que ya hay en los otros campos de Bs
        let sumOtrosBs = 0;
        idsBs.forEach(id => {
            if (id !== campoActualId) {
                sumOtrosBs += parseFloat(document.getElementById(id)?.value) || 0;
            }
        });

        // Sumar lo que hay en divisas convertido a Bs
        const valorDivisasBs = (parseFloat(inputDivisas?.value) || 0) * tasaActual;
        
        const totalYaPagado = sumOtrosBs + (campoActualId === 'divisas' ? 0 : valorDivisasBs);
        const pendiente = totalVentaBs - totalYaPagado;
        
        return pendiente > 0 ? pendiente : 0;
    };

    // Listener para campos de Bolívares (click para completar)
    idsBs.forEach(id => {
        const el = document.getElementById(id);
        el?.addEventListener('click', () => {
            const faltante = calcularPendiente(id);
            el.value = faltante.toFixed(2);
        });
    });

    // Listener para campo de Divisas (click para completar en dólares)
    inputDivisas?.addEventListener('click', () => {
        const totalVentaBs = (window.totalVentaUSD || 0) * tasaActual;
        let sumOtrosBs = 0;
        idsBs.forEach(id => { sumOtrosBs += parseFloat(document.getElementById(id)?.value) || 0; });
        
        const pendienteBs = totalVentaBs - sumOtrosBs;
        const pendienteUsd = pendienteBs / tasaActual;
        
        inputDivisas.value = (pendienteUsd > 0 ? pendienteUsd : 0).toFixed(2);
    });

        alert("✅ Venta registrada correctamente.");
        
        // Limpiamos
        carrito = [];
        window.actualizarCarritoUI();
        document.getElementById('modalPago').style.display = 'none';
        
        // Reset de campos de pago
        document.getElementById('in-divisas-usd').value = "";
        document.getElementById('in-punto-bs').value = "";
        document.getElementById('in-pagomovil-bs').value = "";
        document.getElementById('in-efectivo-bs').value = "";
        
        proximoNumeroFacturaStr = (parseInt(proximoNumeroFacturaStr) + 1).toString().padStart(6, '0');
        
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
// 5. LISTENERS DE UI (Evento Input y Teclas)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM cargado - Inicializando listeners");

    // 1. Búsqueda Cliente
    const inputCliente = document.getElementById('buscar-cliente-pos');
    if (inputCliente) {
        inputCliente.addEventListener('input', (e) => {
            const resultados = window.buscarCliente(e.target.value);
            const divRes = document.getElementById('resultados-cliente-pos');
            if (resultados.length > 0 && e.target.value.trim() !== "") {
                divRes.style.display = 'block';
                divRes.innerHTML = resultados.map(c => `
                    <div class="resultado-item" style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;"
                         onclick="window.seleccionarCliente('${c.id}', '${c.nombre.replace(/'/g, "\\'")}')">
                         <strong>${c.id}</strong> - ${c.nombre}
                    </div>`).join('');
            } else { divRes.style.display = 'none'; }
        });
        inputCliente.addEventListener('keydown', (e) => {
            window.indiceClie = window.manejarNavegacion(e, 'resultados-cliente-pos', window.indiceClie);
        });
    }

    // 2. Búsqueda Producto
    const inputProd = document.getElementById('buscar-producto-pos');
    if (inputProd) {
        inputProd.addEventListener('input', (e) => {
            const resultados = window.buscarProducto(e.target.value);
            const divRes = document.getElementById('resultados-producto-pos');
            if (resultados.length > 0 && e.target.value.trim() !== "") {
                divRes.style.display = 'block';
                divRes.innerHTML = resultados.map(p => `
                    <div class="resultado-item" style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;"
                         onclick="window.seleccionarProducto('${p.id}')">
                         <strong>${p.nombre}</strong> - $${p.precio}
                    </div>`).join('');
            } else { divRes.style.display = 'none'; }
        });
        inputProd.addEventListener('keydown', (e) => {
            window.indiceProd = window.manejarNavegacion(e, 'resultados-producto-pos', window.indiceProd);
        });
    }

    // 3. LÓGICA DE PAGOS
    const camposBs = ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs'];
    const inputDivisas = document.getElementById('in-divisas-usd');

    camposBs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', () => {
                const totalBs = (window.totalVentaUSD || 0) * tasaActual;
                const valorDivisasBs = (parseFloat(inputDivisas?.value) || 0) * tasaActual;
                const sumOtrosBs = camposBs
                    .filter(c => c !== id)
                    .reduce((acc, cId) => acc + (parseFloat(document.getElementById(cId)?.value) || 0), 0);
                
                const pendiente = totalBs - sumOtrosBs - valorDivisasBs;
                el.value = (pendiente > 0 ? pendiente : 0).toFixed(2);
            });
        }
    });

    if (inputDivisas) {
        inputDivisas.addEventListener('input', function() {
            const totalBs = (window.totalVentaUSD || 0) * tasaActual;
            const valorDivisasBs = (parseFloat(this.value) || 0) * tasaActual;
            const sumPuntoMovil = (parseFloat(document.getElementById('in-punto-bs')?.value) || 0) + 
                                  (parseFloat(document.getElementById('in-pagomovil-bs')?.value) || 0);
            const resto = totalBs - valorDivisasBs - sumPuntoMovil;
            document.getElementById('in-efectivo-bs').value = (resto > 0 ? resto : 0).toFixed(2);
        });
    }
}); // <--- ESTA LLAVE CIERRA EL DOMContentLoaded


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
    // 1. SIEMPRE capturamos F5 para tener control total
    if (event.key === 'F5') {
        event.preventDefault(); // Esto detiene el refresco nativo del navegador SIEMPRE
        event.stopImmediatePropagation(); // Detiene cualquier otro listener que interfiera

        const modalPago = document.getElementById('modalPago');
        // Verificamos si está visible (display block, flex, o grid)
        const estaEnPago = modalPago && (window.getComputedStyle(modalPago).display !== 'none');

        if (estaEnPago) {
            // Si estamos en pago, damos la opción de refrescar manualmente
            if (confirm("¿Deseas refrescar la página? Se perderán los datos del carrito.")) {
                window.location.reload();
            }
        } else {
            // Si NO estamos en pago, ejecutamos la función de precio
            window.ejecutarF5();
        }
        return;
    }

    // 2. Lógica para F4, F6, F9
    const teclasValidas = ['F4', 'F6', 'F9'];
    if (teclasValidas.includes(event.key)) {
        event.preventDefault();
        switch(event.key) {
            case 'F4': window.ejecutarF4(); break;
            case 'F6': window.ejecutarF6(); break;
            case 'F9': window.abrirModalCobro(); break;
        }
    }
}, true); // El 'true' en el addEventListener es CLAVE: activa el modo captura

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
        
        // Solo actualizamos los totales visuales
        const dUSD = document.getElementById('totalModalUSD');
        const dBS = document.getElementById('totalModalBS');
        
        if (dUSD) dUSD.innerText = `$ ${totalUSD.toFixed(2)}`;
        if (dBS) dBS.innerText = `${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.`;
        
        modal.style.display = 'flex';
        document.getElementById('in-divisas-usd')?.focus();
    }
};

// ==========================================
// INICIALIZACIÓN FINAL
// ==========================================
cargarConfiguracionGlobal().then(() => {
    inicializarClientes();
    inicializarProductos();
});

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
            formato: formatoFactura,
            items: carrito
        });
        alert("✅ Venta registrada: " + proximoNumeroFacturaStr);
        carrito = [];
        window.actualizarCarritoUI();
        document.getElementById('modalPago').style.display = 'none';
    } catch (e) { alert("Error: " + e.message); }
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

    // 3. LÓGICA DE PAGOS (Cálculo automático de diferencia)
    const camposPago = ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs'];
    
    camposPago.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Al hacer clic, calcula lo que falta para llegar al total
            el.addEventListener('click', () => {
                const totalBs = (window.totalVentaUSD || 0) * tasaActual;
                
                // Sumamos lo que ya tienen escrito los OTROS campos de pago
                const sumOtros = camposPago
                    .filter(c => c !== id)
                    .reduce((acc, cId) => {
                        const valor = parseFloat(document.getElementById(cId)?.value) || 0;
                        return acc + valor;
                    }, 0);
                
                // Calculamos cuánto falta para completar la venta
                const pendiente = totalBs - sumOtros;
                el.value = (pendiente > 0 ? pendiente : 0).toFixed(2);
            });
            
            // Opcional: También permitimos que al tabular o escribir cambie el valor
            el.addEventListener('input', () => {
                // Si el usuario escribe manualmente, el sistema no bloquea el valor
            });
        }
    });
});


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
// 8. COMANDOS DE TECLADO (ORGANIZADOS)
// ==========================================
document.addEventListener('keydown', (event) => {
    // 1. Detección del estado del modal
    const modalPago = document.getElementById('modalPago');
    const estaEnPago = modalPago && modalPago.style.display !== 'none';

    // 2. Si estamos en el modal, permitimos que F5 refresque la página (acción nativa)
    if (estaEnPago && event.key === 'F5') {
        return; // Salimos sin ejecutar preventDefault
    }

    // 3. Captura de teclas para funciones del sistema
    const teclasValidas = ['F4', 'F5', 'F6', 'F9'];
    
    if (teclasValidas.includes(event.key)) {
        event.preventDefault(); // Bloqueamos acción nativa del navegador
        
        switch(event.key) {
            case 'F4': window.ejecutarF4(); break;
            case 'F5': window.ejecutarF5(); break;
            case 'F6': window.ejecutarF6(); break;
            case 'F9': window.abrirModalCobro(); break;
        }
    }
});

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
        
        // Actualizar valores en el modal
        const dUSD = document.getElementById('totalModalUSD');
        const dBS = document.getElementById('totalModalBS');
        const inputFactura = document.getElementById('nro_control_factura');
        
        if (dUSD) dUSD.innerText = `$ ${totalUSD.toFixed(2)}`;
        if (dBS) dBS.innerText = `${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.`;
        if (inputFactura) inputFactura.value = proximoNumeroFacturaStr;
        
        modal.style.display = 'flex';
        // Foco al primer input de pago
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

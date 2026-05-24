/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas (pos-core.js)
 */

import { 
    collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, query, orderBy, limit, getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

if (!USER_ID) {
    window.location.href = "index.html"; 
}

let productosMaster = [];
let clientesMaster = []; 
let carrito = [];
let proximoNumeroFacturaStr = "000001";

// Variables de Configuración
let tasaActual = 1.0; 
let formatoFactura = "ticket";

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
            
            // --- AQUÍ ESTÁ EL CAMBIO PARA TU HTML ---
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
        // --- RE-VERIFICAR NÚMERO ANTES DE GUARDAR ---
        await obtenerSiguienteNumeroFactura(); 

        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), {
            fecha: serverTimestamp(),
            nro_factura: proximoNumeroFacturaStr, // Usará el valor recién obtenido
            total_usd: window.totalVentaUSD,
            tasa: tasaActual,
            formato: formatoFactura,
            items: carrito
        });
        
        alert("✅ Venta registrada: " + proximoNumeroFacturaStr);
        
        // Limpieza post-venta
        carrito = [];
        window.actualizarCarritoUI();
        document.getElementById('modalPago').style.display = 'none';
        
        // Limpiar inputs del modal
        document.getElementById('in-punto-bs').value = '0';
        document.getElementById('in-pagomovil-bs').value = '0';
        document.getElementById('in-efectivo-bs').value = '0';
        document.getElementById('in-divisas-usd').value = '0';
        document.getElementById('btnConfirmarVenta').disabled = true;
        
    } catch (e) { 
        alert("Error al registrar: " + e.message); 
    }
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
                <div class="resultado-item" style="padding: 10px; cursor: pointer; border-bottom: 1px solid #f1f5f9;"
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
    inputCliente.value = nombre;
    divResultados.style.display = 'none';
    window.clienteSeleccionadoID = id; 
};

// ==========================================
// 5. INTEGRACIÓN UI: BÚSQUEDA DE PRODUCTOS
// ==========================================
const inputProducto = document.getElementById('buscar-producto-pos');
const divResultadosProd = document.getElementById('resultados-producto-pos');

if (inputProducto) {
    inputProducto.addEventListener('input', (e) => {
        const texto = e.target.value;
        const resultados = window.buscarProducto(texto);
        if (resultados.length > 0 && texto.trim() !== "") {
            divResultadosProd.style.display = 'block';
            divResultadosProd.innerHTML = resultados.map(p => `
                <div class="resultado-item" style="padding: 10px; cursor: pointer; border-bottom: 1px solid #f1f5f9;"
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

window.seleccionarProducto = (id) => {
    window.agregarCarrito(id);
    inputProducto.value = '';
    divResultadosProd.style.display = 'none';
    inputProducto.focus();
};

// ==========================================
// 7. ACTUALIZACIÓN VISUAL DEL CARRITO
// ==========================================
window.actualizarCarritoUI = () => {
    const contenedor = document.getElementById('lista-carrito');
    if (!contenedor) return;

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

    const totalUSD = carrito.reduce((sum, item) => sum + (item.cantidad * (item.precio || 0)), 0);
    window.totalVentaUSD = totalUSD;
    
    // Total en USD
    if(document.getElementById('total-usd')) 
        document.getElementById('total-usd').innerText = `$ ${totalUSD.toFixed(2)}`;

    // --- ESTA ES LA PARTE QUE DEBES ASEGURAR ---
    // Cálculo y actualización del total en Bolívares
    const totalBs = totalUSD * tasaActual;
    const displayBs = document.getElementById('total-bs');
    if (displayBs) {
        displayBs.innerText = `${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.`;
    }
};

// ==========================================
// 8. COMANDOS DE TECLADO (F4, F5, F6, F9)
// ==========================================
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey) return; 
    switch(event.key) {
        case 'F4': event.preventDefault(); window.ejecutarF4(); break;
        case 'F5': event.preventDefault(); window.ejecutarF5(); break;
        case 'F6': event.preventDefault(); window.ejecutarF6(); break;
        case 'F9': event.preventDefault(); window.abrirModalCobro(); break;
    }
});

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

async function obtenerSiguienteNumeroFactura() {
    try {
        const ventasRef = collection(db, "usuarios", USER_ID, "ventas");
        const q = query(ventasRef, orderBy("nro_factura", "desc"), limit(1));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const ultimaFactura = parseInt(snapshot.docs[0].data().nro_factura);
            proximoNumeroFacturaStr = String(ultimaFactura + 1).padStart(6, '0');
        } else {
            proximoNumeroFacturaStr = "000001";
        }
    } catch (e) {
        console.error("Error al obtener correlativo:", e);
        proximoNumeroFacturaStr = "000001";
    }
}

// ==========================================
// MODAL COBRO:
// ==========================================
// MODIFICADA A ASYNC
window.abrirModalCobro = async () => {
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    // --- LLAMADA PARA OBTENER EL NÚMERO AUTOMÁTICO ---
    await obtenerSiguienteNumeroFactura();

    const modal = document.getElementById('modalPago');
    if (modal) {
        const totalUSD = window.totalVentaUSD;
        const totalBs = totalUSD * tasaActual;

        const displayTotalUSD = document.getElementById('totalModalUSD');
        const displayTotalBS = document.getElementById('totalModalBS');
        const inputFactura = document.getElementById('in-nro-factura');

        if (displayTotalUSD) displayTotalUSD.innerText = `$ ${totalUSD.toFixed(2)}`;
        if (displayTotalBS) displayTotalBS.innerText = `${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.`;
        
        // Aquí se inserta el número autocalculado
        if (inputFactura) inputFactura.value = proximoNumeroFacturaStr;

        modal.style.display = 'flex';
        document.getElementById('in-divisas-usd')?.focus();
    }
};

// ==========================================
// INICIALIZACIÓN GLOBAL
// ==========================================
cargarConfiguracionGlobal().then(() => {
    inicializarClientes();
    inicializarProductos();
});

/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas (pos-core.js)
 */

import { db } from './firebase-config.js'; 
import { collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ejecutarF4, ejecutarF5, ejecutarF6, abrirModalCobro } from './pos-core-teclas.js';

// --- VALIDACIÓN DE SESIÓN ---
const USER_ID = localStorage.getItem('youcontrol_empresa_id');
if (!USER_ID) {
    window.location.href = "index.html"; 
}

// --- VARIABLES GLOBALES ---
window.USER_ID = USER_ID;
window.productosMaster = [];
window.clientesMaster = []; 
window.carrito = [];
window.tasaActual = 1.0; 
window.totalVentaUSD = 0;
window.formatoFactura = "ticket";
window.indiceProd = -1;
window.indiceClie = -1;

window.ejecutarF4 = ejecutarF4;
window.ejecutarF5 = ejecutarF5;
window.ejecutarF6 = ejecutarF6;
window.abrirModalCobro = abrirModalCobro;

// --- FUNCIÓN DE CONTADOR AUTOMÁTICO ---
async function obtenerSiguienteNumero(userId) {
    const contadorRef = doc(db, "usuarios", userId, "config", "contador_facturas");
    try {
        return await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(contadorRef);
            let nuevoValor = sfDoc.exists() ? sfDoc.data().ultimo + 1 : 1;
            transaction.set(contadorRef, { ultimo: nuevoValor });
            return nuevoValor.toString().padStart(6, '0');
        });
    } catch (e) {
        console.error("Error al obtener contador:", e);
        return "000001";
    }
}

async function cargarConfiguracionGlobal() {
    try {
        const userDocRef = doc(db, "usuarios", USER_ID);
        const snapConfig = await getDoc(userDocRef);
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
    const clientesRef = collection(db, "usuarios", USER_ID, "clientes");
    onSnapshot(clientesRef, (snapshot) => {
        clientesMaster = [];
        snapshot.forEach(docSnap => clientesMaster.push({ id: docSnap.id, ...docSnap.data() }));
    });
}

function inicializarProductos() {
    const productosRef = collection(db, "usuarios", USER_ID, "productos");
    onSnapshot(productosRef, (snapshot) => {
        productosMaster = [];
        snapshot.forEach(docSnap => productosMaster.push({ id: docSnap.id, ...docSnap.data() }));
    });
}

window.buscarProducto = (texto) => {
    const criterio = texto.toLowerCase().trim();
    if (!criterio) return [];
    return productosMaster.filter(p => (p.id || '').toLowerCase().includes(criterio) || (p.nombre || '').toLowerCase().includes(criterio) || (p.barras || '').toLowerCase().includes(criterio));
};

window.buscarCliente = (texto) => {
    const criterio = texto.toLowerCase().trim();
    if (!criterio) return [];
    return clientesMaster.filter(c => (c.id || '').toLowerCase().includes(criterio) || (c.nombre || '').toLowerCase().includes(criterio));
};

window.agregarCarrito = (id) => {
    const p = productosMaster.find(x => x.id === id);
    if (!p) return;
    const item = carrito.find(c => c.id === id);
    if (item) item.cantidad++; else carrito.push({ ...p, cantidad: 1 });
    window.actualizarCarritoUI();
};

window.registrarVenta = async () => {
    if (carrito.length === 0) return alert("El carrito está vacío.");
    try {
        const nroFactura = await obtenerSiguienteNumero(USER_ID);
        const nombreParaGuardar = window.nombreClienteSeleccionado || document.getElementById('buscar-cliente-pos')?.value || "Anónimo";
        const montoCreditoUSD = parseFloat(document.getElementById('in-credito-usd')?.value) || 0;

        const ventaData = {
            cliente_id: window.clienteSeleccionadoID || "anonimo",
            nombre_cliente: nombreParaGuardar,
            items: carrito,
            total_usd: window.totalVentaUSD || 0,
            tasa_aplicada: tasaActual,
            pagos: {
                punto_bs: parseFloat(document.getElementById('in-punto-bs')?.value) || 0,
                pago_movil_bs: parseFloat(document.getElementById('in-pagomovil-bs')?.value) || 0,
                efectivo_bs: parseFloat(document.getElementById('in-efectivo-bs')?.value) || 0,
                divisas_usd: parseFloat(document.getElementById('in-divisas-usd')?.value) || 0,
                credito_usd: montoCreditoUSD
            },
            fecha: serverTimestamp(),
            nro_factura: nroFactura
        };

        await addDoc(collection(db, "usuarios", USER_ID, "ventas"), ventaData);

        // Si hay monto a crédito, lo registramos también en Cuentas por Cobrar
        if (montoCreditoUSD > 0 && ventaData.cliente_id !== "anonimo") {
            await addDoc(collection(db, "usuarios", USER_ID, "cuentas_por_cobrar"), {
                cliente_id: ventaData.cliente_id,
                nombre_cliente: nombreParaGuardar,
                nro_factura: nroFactura,
                monto_usd: montoCreditoUSD,
                monto_bs: montoCreditoUSD * tasaActual,
                estado: "pendiente",
                fecha: serverTimestamp()
            });
        }

        for (const item of carrito) {
            const productoRef = doc(db, "usuarios", USER_ID, "productos", item.id);
            await updateDoc(productoRef, { stock: increment(-item.cantidad) });
        }

        alert("✅ Venta registrada: " + nroFactura);
        
        carrito = [];
        window.clienteSeleccionadoID = null;
        window.nombreClienteSeleccionado = null;
        document.getElementById('modalPago').style.display = 'none';
        window.actualizarCarritoUI();
        
        const siguiente = (parseInt(nroFactura) + 1).toString().padStart(6, '0');
        document.getElementById('factura-display').innerText = `FACTURA: ${siguiente}`;

    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error al guardar: " + error.message);
    }
};

window.seleccionarCliente = (id, nombre) => {
    const inputCliente = document.getElementById('buscar-cliente-pos');
    if (inputCliente) inputCliente.value = nombre;
    const divRes = document.getElementById('resultados-cliente-pos');
    if (divRes) divRes.style.display = 'none';
    window.clienteSeleccionadoID = id; 
    window.nombreClienteSeleccionado = nombre;
    document.getElementById('buscar-producto-pos')?.focus();
};

window.seleccionarProducto = (id) => {
    window.agregarCarrito(id);
    const inputProd = document.getElementById('buscar-producto-pos');
    if (inputProd) inputProd.value = '';
    const divRes = document.getElementById('resultados-producto-pos');
    if (divRes) divRes.style.display = 'none';
    inputProd?.focus();
};

window.manejarNavegacion = (e, contenedorId, indiceVar) => {
    const cont = document.getElementById(contenedorId);
    if (!cont || cont.style.display === 'none') return -1;
    const items = cont.querySelectorAll('.resultado-item');
    if (!items.length) return -1;
    if (e.key === 'ArrowDown') indiceVar = (indiceVar < items.length - 1) ? indiceVar + 1 : 0;
    else if (e.key === 'ArrowUp') indiceVar = (indiceVar > 0) ? indiceVar - 1 : items.length - 1;
    else if (e.key === 'Enter') { e.preventDefault(); if (items[indiceVar]) items[indiceVar].click(); return -1; }
    else return indiceVar;
    items.forEach((it, i) => it.classList.toggle('seleccionado', i === indiceVar));
    items[indiceVar].scrollIntoView({ block: 'nearest' });
    return indiceVar;
};

// --- INICIALIZACIÓN FINAL ---
document.addEventListener('DOMContentLoaded', async () => {
    await cargarConfiguracionGlobal();
    
    const contadorRef = doc(db, "usuarios", USER_ID, "config", "contador_facturas");
    const snap = await getDoc(contadorRef);
    const ultimo = snap.exists() ? snap.data().ultimo : 0;
    
    const elFactura = document.getElementById('factura-display');
    if (elFactura) {
        elFactura.innerText = `FACTURA: ${ultimo.toString().padStart(6, '0')}`;
    }

    inicializarClientes();
    inicializarProductos();
    initBuscadores();
    initLogicaPagos();
});

function initBuscadores() {
    const inputCliente = document.getElementById('buscar-cliente-pos');
    const inputProd = document.getElementById('buscar-producto-pos');

    inputCliente?.addEventListener('input', (e) => {
        const texto = e.target.value.trim();
        const divRes = document.getElementById('resultados-cliente-pos');
        if (!divRes) return;

        if (texto === "") {
            divRes.style.display = 'none';
            return;
        }

        const resultados = window.buscarCliente(texto);
        if (resultados.length > 0) {
            divRes.style.display = 'block';
            divRes.innerHTML = resultados.map(c => `<div class="resultado-item" style="padding: 10px; cursor: pointer;" onclick="window.seleccionarCliente('${c.id}', '${(c.nombre || '').replace(/'/g, "\\'")}')"><strong>${c.id}</strong> - ${c.nombre}</div>`).join('');
        } else {
            divRes.style.display = 'block';
            divRes.innerHTML = `<div style="padding: 10px; color: #64748b;">Sin resultados</div>`;
        }
    });

    inputProd?.addEventListener('input', (e) => {
        const texto = e.target.value.trim();
        const divRes = document.getElementById('resultados-producto-pos');
        if (!divRes) return;

        if (texto === "") {
            divRes.style.display = 'none';
            return;
        }

        const resultados = window.buscarProducto(texto);
        if (resultados.length > 0) {
            divRes.style.display = 'block';
            divRes.innerHTML = resultados.map(p => `<div class="resultado-item" style="padding: 10px; cursor: pointer;" onclick="window.seleccionarProducto('${p.id}')"><strong>${p.nombre}</strong> - $${p.precio || 0}</div>`).join('');
        } else {
            divRes.style.display = 'block';
            divRes.innerHTML = `<div style="padding: 10px; color: #64748b;">Sin resultados</div>`;
        }
    });
}

function initLogicaPagos() {
    const camposBs = ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs'];
    const inputDivisas = document.getElementById('in-divisas-usd');
    const inputCredito = document.getElementById('in-credito-usd');

    // 1. Clic en los métodos en Bolívares (Punto, Pago Móvil, Efectivo Bs)
    camposBs.forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            const el = document.getElementById(id);
            const totalBs = (window.totalVentaUSD || 0) * tasaActual;
            
            const valorDivisasBs = (parseFloat(inputDivisas?.value) || 0) * tasaActual;
            const valorCreditoBs = (parseFloat(inputCredito?.value) || 0) * tasaActual;
            
            const sumOtrosBs = camposBs.filter(c => c !== id).reduce((acc, cId) => acc + (parseFloat(document.getElementById(cId)?.value) || 0), 0);
            
            const pendiente = totalBs - sumOtrosBs - valorDivisasBs - valorCreditoBs;
            el.value = (pendiente > 0 ? pendiente : 0).toFixed(2);
        });
    });

    // 2. Clic en el método de Divisas USD
    inputDivisas?.addEventListener('click', () => {
        const totalBs = (window.totalVentaUSD || 0) * tasaActual;
        const valorCreditoBs = (parseFloat(inputCredito?.value) || 0) * tasaActual;
        const sumBs = camposBs.reduce((acc, cId) => acc + (parseFloat(document.getElementById(cId)?.value) || 0), 0);
        
        const pendienteBs = totalBs - sumBs - valorCreditoBs;
        inputDivisas.value = (pendienteBs / tasaActual > 0 ? (pendienteBs / tasaActual) : 0).toFixed(2);
    });

    // 3. Clic en el método de Crédito USD
    inputCredito?.addEventListener('click', () => {
        const totalUSD = window.totalVentaUSD || 0;
        const sumBs = camposBs.reduce((acc, cId) => acc + (parseFloat(document.getElementById(cId)?.value) || 0), 0);
        const sumDivisasUSD = parseFloat(inputDivisas?.value) || 0;
        
        const pagadoOtryUSD = sumDivisasUSD + (sumBs / tasaActual);
        const pendienteUSD = totalUSD - pagadoOtryUSD;

        inputCredito.value = (pendienteUSD > 0 ? pendienteUSD : 0).toFixed(2);
    });
}

window.actualizarCarritoUI = () => {
    const contenedor = document.getElementById('lista-carrito');
    if (!contenedor) return;
    contenedor.innerHTML = carrito.map(item => `<div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;"><div><strong>${item.nombre}</strong><br><small>${item.cantidad} x $${item.precio || 0}</small></div><div>$${(item.cantidad * (item.precio || 0)).toFixed(2)}</div></div>`).join('');
    const totalUSD = carrito.reduce((sum, item) => sum + (item.cantidad * (item.precio || 0)), 0);
    window.totalVentaUSD = totalUSD;
    if(document.getElementById('total-usd')) document.getElementById('total-usd').innerText = `$ ${totalUSD.toFixed(2)}`;
    const totalBs = totalUSD * tasaActual;
    if(document.getElementById('total-bs')) document.getElementById('total-bs').innerText = `${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.`;
};

document.addEventListener('keydown', (event) => {
    if (event.key === 'F5') {
        event.preventDefault();
        event.stopImmediatePropagation();
        const modalPago = document.getElementById('modalPago');
        const estaEnPago = modalPago && (window.getComputedStyle(modalPago).display !== 'none');
        if (estaEnPago) { if (confirm("¿Deseas refrescar la página?")) window.location.reload(); }
        else ejecutarF5();
        return;
    }
    const comandos = { 'F4': ejecutarF4, 'F6': ejecutarF6, 'F9': abrirModalCobro };
    if (comandos[event.key]) { event.preventDefault(); comandos[event.key](); }
}, true);

document.addEventListener('input', (e) => {
    const camposPago = ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd', 'in-credito-usd'];
    if (camposPago.includes(e.target.id)) {
        const btn = document.getElementById('btn-confirmar-venta');
        if (btn) btn.disabled = false;
    }
});

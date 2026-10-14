/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Facturación y Ventas (pos-core.js)
 */

import { db } from './firebase-config.js'; 
import { collection, onSnapshot, addDoc, setDoc, serverTimestamp, doc, getDoc, updateDoc, increment, runTransaction, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ejecutarF4, ejecutarF5, ejecutarF6, abrirModalCobro } from './pos-core-teclas.js';
import { imprimirTicketVenta } from './ticket-print.js';

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

// --- FUNCIÓN DE IMPRESIÓN TÉRMICA DINÁMICA ---
async function verificarEImprimirTicket(nroFactura, ventaData) {
    try {
        await imprimirTicketVenta(USER_ID, ventaData);
    } catch (e) {
        console.error("Error al intentar imprimir el ticket:", e);
        alert("Error al imprimir: " + e.message);
    }
}

// --- FUNCIÓN DE REGISTRO DE VENTA Y COBRO ---
async function registrarVenta() {
    if (!window.carrito || window.carrito.length === 0) {
        alert("El carrito está vacío. Agregue productos antes de cobrar.");
        return;
    }

    const btnConfirmar = document.getElementById('btn-confirmar-venta');
    if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Procesando...`;
    }

    try {
        const nroFactura = await obtenerSiguienteNumero(USER_ID);

        const pagoPunto = parseFloat(document.getElementById('in-punto-bs')?.value) || 0;
        const pagoMovil = parseFloat(document.getElementById('in-pagomovil-bs')?.value) || 0;
        const pagoEfectivoBs = parseFloat(document.getElementById('in-efectivo-bs')?.value) || 0;
        const pagoDivisas = parseFloat(document.getElementById('in-divisas-usd')?.value) || 0;
        const pagoCredito = parseFloat(document.getElementById('in-credito-usd')?.value) || 0;

        const totalUSD = window.totalVentaUSD || 0;

        const ventaData = {
            nro_factura: nroFactura,
            cliente_id: window.clienteSeleccionadoID || "general",
            nombre_cliente: window.nombreClienteSeleccionado || "Cliente General",
            items: window.carrito.map(i => ({
                id: i.id,
                nombre: i.nombre,
                cantidad: i.cantidad,
                precio: i.precio || 0
            })),
            total_usd: totalUSD,
            tasa_aplicada: tasaActual,
            pagos: {
                punto_bs: pagoPunto,
                pagomovil_bs: pagoMovil,
                efectivo_bs: pagoEfectivoBs,
                divisas_usd: pagoDivisas,
                credito_usd: pagoCredito
            },
            fecha: serverTimestamp()
        };

        // 1. Guardar la venta usando el número de factura como ID exacto del documento en Firestore
        const ventaRef = doc(db, "usuarios", USER_ID, "ventas", nroFactura);
        await setDoc(ventaRef, ventaData);

        // 2. DESCONTAR DEL INVENTARIO CADA PRODUCTO VENDIDO
        for (const item of window.carrito) {
            if (item.id) {
                const productoRef = doc(db, "usuarios", USER_ID, "productos", item.id);
                await updateDoc(productoRef, {
                    stock: increment(-item.cantidad)
                });
            }
        }

        // 3. REGISTRAR EN CUENTAS POR COBRAR SI LA VENTA TIENE CRÉDITO
        if (pagoCredito > 0) {
            const cxcRef = doc(db, "usuarios", USER_ID, "cuentas_por_cobrar", nroFactura);
            await setDoc(cxcRef, {
                nro_factura: nroFactura,
                cliente_id: window.clienteSeleccionadoID || "general",
                nombre_cliente: window.nombreClienteSeleccionado || "Cliente General",
                monto_total_usd: totalUSD,
                monto_credito_usd: pagoCredito,
                monto_abonado_usd: 0,
                saldo_pendiente_usd: pagoCredito,
                abonado: 0,
                pendiente: pagoCredito,
                estado: "pendiente",
                fecha: serverTimestamp()
            });
        }

        const modalPago = document.getElementById('modalPago');
        if (modalPago) modalPago.style.display = 'none';

        window.carrito = [];
        if (typeof window.actualizarCarritoUI === 'function') {
            window.actualizarCarritoUI();
        }

        ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs', 'in-divisas-usd', 'in-credito-usd'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = 0;
        });

        alert(`¡Venta registrada con éxito! Factura #${nroFactura}`);

        await verificarEImprimirTicket(nroFactura, ventaData);

    } catch (e) {
        console.error("Error al registrar la venta, inventario o CXC:", e);
        alert("Hubo un error al procesar la venta: " + e.message);
    } finally {
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.innerHTML = `CONFIRMAR VENTA`;
        }
    }
}

// EXPONER LA FUNCIÓN GLOBALMENTE
window.registrarVenta = registrarVenta;

window.abrirModalReimpresion = async () => {
    const modal = document.getElementById('modalBuscarFactura');
    if (modal) modal.style.display = 'flex';
    await cargarFacturasDelDia();
};

async function cargarFacturasDelDia() {
    const contenedor = document.getElementById('lista-facturas-dia');
    if (!contenedor) return;
    
    contenedor.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;">Cargando facturas...</div>`;

    try {
        const ventasRef = collection(db, "usuarios", USER_ID, "ventas");
        const q = query(ventasRef, orderBy("fecha", "desc"), limit(50));
        const snapshot = await getDocs(q);

        let ventasList = [];
        snapshot.forEach(docSnap => {
            ventasList.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (ventasList.length === 0) {
            contenedor.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;">No hay facturas registradas.</div>`;
            return;
        }

        renderizarListaFacturas(ventasList);

        const inputBuscar = document.getElementById('input-buscar-factura');
        inputBuscar.oninput = (e) => {
            const texto = e.target.value.toLowerCase().trim();
            const filtradas = ventasList.filter(v => 
                (v.nro_factura || '').toLowerCase().includes(texto) || 
                (v.nombre_cliente || '').toLowerCase().includes(texto)
            );
            renderizarListaFacturas(filtradas);
        };

    } catch (err) {
        console.error("Error al cargar ventas:", err);
        contenedor.innerHTML = `<div style="text-align:center; padding:20px; color:red;">Error al cargar las facturas.</div>`;
    }
}

function renderizarListaFacturas(ventas) {
    const contenedor = document.getElementById('lista-facturas-dia');
    if (!contenedor) return;

    if (ventas.length === 0) {
        contenedor.innerHTML = `<div style="text-align:center; padding:15px; color:#64748b;">Sin coincidencias</div>`;
        return;
    }

    contenedor.innerHTML = ventas.map(v => {
        const total = v.total_usd || 0;
        return `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid #e2e8f0; padding:10px 12px; border-radius:8px; font-size:13px;">
                <div>
                    <strong style="color:#006aff;">Nro: ${v.nro_factura}</strong> - ${v.nombre_cliente || 'Anónimo'}
                    <div style="font-size:11px; color:#64748b;">Total: $${total.toFixed(2)}</div>
                </div>
                <button onclick="window.reimprimirFacturaSeleccionada('${v.id}')" style="background:#0ea5e9; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:12px;">
                    <i class="fas fa-print"></i> Imprimir
                </button>
            </div>
        `;
    }).join('');
}

window.reimprimirFacturaSeleccionada = async (ventaId) => {
    try {
        const ventaRef = doc(db, "usuarios", USER_ID, "ventas", ventaId);
        const ventaSnap = await getDoc(ventaRef);
        
        if (!ventaSnap.exists()) {
            alert("No se encontró la venta.");
            return;
        }

        const ventaData = ventaSnap.data();
        await imprimirTicketVenta(USER_ID, ventaData);
        
        const modal = document.getElementById('modalBuscarFactura');
        if (modal) modal.style.display = 'none';

    } catch (err) {
        console.error("Error al reimprimir:", err);
        alert("Hubo un error al intentar reimprimir: " + err.message);
    }
};

window.seleccionarCliente = (id, nombre) => {
    const inputCliente = document.getElementById('buscar-cliente-pos');
    if (inputCliente) inputCliente.value = nombre;
    const divRes = document.getElementById('resultados-cliente-pos');
    if (divRes) divRes.style.display = 'none';
    window.clienteSeleccionadoID = id; 
    window.nombreClienteSeleccionado = nombre;
    const inputProd = document.getElementById('buscar-producto-pos');
    if (inputProd) inputProd.focus();
};

window.seleccionarProducto = (id) => {
    window.agregarCarrito(id);
    const inputProd = document.getElementById('buscar-producto-pos');
    if (inputProd) {
        inputProd.value = '';
        inputProd.focus();
    }
    const divRes = document.getElementById('resultados-producto-pos');
    if (divRes) divRes.style.display = 'none';
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
    if (items[indiceVar]) items[indiceVar].scrollIntoView({ block: 'nearest' });
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

        window.indiceClie = -1;
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

    inputCliente?.addEventListener('keydown', (e) => {
        window.indiceClie = window.manejarNavegacion(e, 'resultados-cliente-pos', window.indiceClie);
    });

    inputProd?.addEventListener('input', (e) => {
        const texto = e.target.value.trim();
        const divRes = document.getElementById('resultados-producto-pos');
        if (!divRes) return;

        window.indiceProd = -1;
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

    inputProd?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const texto = inputProd.value.trim();
            if (!texto) return;

            const divRes = document.getElementById('resultados-producto-pos');
            const resultados = window.buscarProducto(texto);

            const exacto = resultados.find(p => 
                (p.id && p.id.toLowerCase() === texto.toLowerCase()) || 
                (p.barras && p.barras.toLowerCase() === texto.toLowerCase())
            );

            if (exacto) {
                window.seleccionarProducto(exacto.id);
            } else if (resultados.length === 1) {
                window.seleccionarProducto(resultados[0].id);
            } else {
                if (window.indiceProd >= 0 && divRes) {
                    const items = divRes.querySelectorAll('.resultado-item');
                    if (items[window.indiceProd]) {
                        items[window.indiceProd].click();
                        return;
                    }
                }
                if (resultados.length > 0) {
                    window.seleccionarProducto(resultados[0].id);
                }
            }
            return;
        }

        window.indiceProd = window.manejarNavegacion(e, 'resultados-producto-pos', window.indiceProd);
    });
}

    inputCliente?.addEventListener('keydown', (e) => {
        window.indiceClie = window.manejarNavegacion(e, 'resultados-cliente-pos', window.indiceClie);
    });

    inputProd?.addEventListener('input', (e) => {
        const texto = e.target.value.trim();
        const divRes = document.getElementById('resultados-producto-pos');
        if (!divRes) return;

        window.indiceProd = -1;
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

    inputProd?.addEventListener('keydown', (e) => {
        window.indiceProd = window.manejarNavegacion(e, 'resultados-producto-pos', window.indiceProd);
    });
}

function initLogicaPagos() {
    const camposBs = ['in-punto-bs', 'in-pagomovil-bs', 'in-efectivo-bs'];
    const inputDivisas = document.getElementById('in-divisas-usd');
    const inputCredito = document.getElementById('in-credito-usd');

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

    inputDivisas?.addEventListener('click', () => {
        const totalBs = (window.totalVentaUSD || 0) * tasaActual;
        const valorCreditoBs = (parseFloat(inputCredito?.value) || 0) * tasaActual;
        const sumBs = camposBs.reduce((acc, cId) => acc + (parseFloat(document.getElementById(cId)?.value) || 0), 0);
        
        const pendienteBs = totalBs - sumBs - valorCreditoBs;
        inputDivisas.value = (pendienteBs / tasaActual > 0 ? (pendienteBs / tasaActual) : 0).toFixed(2);
    });

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

    contenedor.innerHTML = carrito.map(item => {
        const precioUnitUSD = item.precio || 0;
        const subtotalUSD = item.cantidad * precioUnitUSD;
        const subtotalBs = subtotalUSD * tasaActual;

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #fdfdfd; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; font-size: 13px; gap: 15px; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 10px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; flex: 1;">
                    <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 11px;">${item.cantidad}x</span>
                    <strong style="color: #1e293b; overflow: hidden; text-overflow: ellipsis;" title="${item.nombre}">${item.nombre}</strong>
                </div>
                <div style="display: flex; align-items: center; gap: 15px; white-space: nowrap;">
                    <span style="color: #64748b; font-size: 12px;">($${precioUnitUSD.toFixed(2)} c/u)</span>
                    <div style="text-align: right; display: flex; flex-direction: column; line-height: 1.2;">
                        <strong style="color: #006aff; font-size: 13px;">$ ${subtotalUSD.toFixed(2)}</strong>
                        <small style="color: #64748b; font-size: 11px; font-weight: 600;">${subtotalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})} Bs.</small>
                    </div>
                </div>
            </div>
        `;
    }).join('');

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

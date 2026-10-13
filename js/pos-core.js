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

// --- FUNCIÓN DE IMPRESIÓN TÉRMICA DETALLADA CON BS Y DATOS DE LA EMPRESA ---
async function verificarEImprimirTicket(nroFactura, ventaData) {
    try {
        const userDoc = await getDoc(doc(db, "usuarios", USER_ID));
        if (!userDoc.exists()) return;
        
        const userData = userDoc.data();
        const configTicket = userData.config_ticket || {};
        
        if (!configTicket.imprimir_automatico) return;

        const anchoMM = configTicket.ancho_mm || "58"; // "58" o "80"
        const piePag = configTicket.pie_pagina || "¡Gracias por su compra!";
        
        // Datos extendidos de la empresa guardados en Firebase
        const empresaNombre = userData.nombre || "YOU CONTROL";
        const empresaRif = userData.rif || userData.identificacion || "RIF: J-00000000-0";
        const empresaTelefono = userData.telefono || userData.tlf || "Tel: 0412-0000000";
        const empresaDireccion = userData.direccion || "Dirección Comercial";
        
        const tasa = ventaData.tasa_aplicada || tasaActual || 1.0;

        const ventanaPrint = window.open('', '_blank', 'width=350,height=500');
        if (!ventanaPrint) {
            console.warn("El navegador bloqueó la ventana emergente de impresión.");
            return;
        }

        // Construir la lista de productos con precio unitario y subtotal en USD y Bs
        let itemsHtml = (ventaData.items || []).map(i => {
            const cant = i.cantidad || 1;
            const precioUSD = i.precio || 0;
            const subtotalUSD = cant * precioUSD;
            const subtotalBs = subtotalUSD * tasa;

            return `
                <tr>
                    <td colspan="3" style="font-weight: bold; padding-top: 3px;">${i.nombre || 'Producto'}</td>
                </tr>
                <tr>
                    <td style="text-align:left; font-size: ${anchoMM === '58' ? '9px' : '11px'};">${cant} x $${precioUSD.toFixed(2)}</td>
                    <td style="text-align:right; font-size: ${anchoMM === '58' ? '9px' : '11px'};">$${subtotalUSD.toFixed(2)}</td>
                    <td style="text-align:right; font-size: ${anchoMM === '58' ? '9px' : '11px'};">Bs. ${subtotalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                </tr>
            `;
        }).join('');

        const totalUSD = ventaData.total_usd || 0;
        const totalBs = totalUSD * tasa;

        ventanaPrint.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Ticket #${nroFactura}</title>
                <style>
                    @page {
                        size: ${anchoMM === '58' ? '58mm auto' : '80mm auto'};
                        margin: 0;
                    }
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        font-size: ${anchoMM === '58' ? '10px' : '12px'};
                        width: ${anchoMM === '58' ? '58mm' : '80mm'};
                        margin: 0;
                        padding: 4px;
                        color: #000;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .bold { font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
                    th, td { font-size: ${anchoMM === '58' ? '9px' : '11px'}; padding: 1px 0; }
                    .line { border-bottom: 1px dashed #000; margin: 4px 0; }
                </style>
            </head>
            <body>
                <!-- ENCABEZADO DE LA EMPRESA -->
                <div class="text-center bold" style="font-size: 13px;">${empresaNombre.toUpperCase()}</div>
                <div class="text-center">${empresaRif}</div>
                <div class="text-center">${empresaTelefono}</div>
                <div class="text-center" style="font-size: 9px;">${empresaDireccion}</div>
                
                <div class="line"></div>
                <div class="text-center bold">FACTURA NRO: ${nroFactura}</div>
                <div class="text-center">CLIENTE: ${ventaData.nombre_cliente}</div>
                <div class="text-center" style="font-size: 9px;">Tasa BCV: Bs. ${tasa.toLocaleString('es-VE', {minimumFractionDigits: 2})}</div>
                
                <div class="line"></div>
                
                <!-- DETALLE DE PRODUCTOS -->
                <table>
                    <thead>
                        <tr>
                            <th style="text-align:left;">CANT x PRECIO</th>
                            <th style="text-align:right;">TOTAL ($)</th>
                            <th style="text-align:right;">TOTAL (Bs)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <div class="line"></div>
                
                <!-- TOTALES GENERALES -->
                <div class="text-right bold" style="font-size: 11px;">TOTAL USD: $${totalUSD.toFixed(2)}</div>
                <div class="text-right bold" style="font-size: 12px;">TOTAL Bs.: ${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                
                <div class="line"></div>
                <div class="text-center" style="margin-top: 6px;">${piePag}</div>
            </body>
            </html>
        `);

        ventanaPrint.document.close();
        ventanaPrint.focus();
        
        setTimeout(() => {
            ventanaPrint.print();
            ventanaPrint.close();
        }, 400);

    } catch (e) {
        console.error("Error al intentar imprimir el ticket automático:", e);
    }
}

// Variable global de bloqueo para evitar clics múltiples
window.procesandoVenta = false;

window.registrarVenta = async () => {
    if (window.procesandoVenta) return; // Si ya se está procesando, bloqueamos nuevos clics
    if (carrito.length === 0) return alert("El carrito está vacío.");

    const btnConfirmar = document.getElementById('btn-confirmar-venta');
    
    // Activamos el bloqueo inmediatamente
    window.procesandoVenta = true;
    if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.style.opacity = "0.6";
        btnConfirmar.innerText = "REGISTRANDO...";
    }

    try {
        const nroFactura = await obtenerSiguienteNumero(USER_ID);
        const nombreParaGuardar = window.nombreClienteSeleccionado || document.getElementById('buscar-cliente-pos')?.value || "Anónimo";
        const montoCreditoUSD = parseFloat(document.getElementById('in-credito-usd')?.value) || 0;
        const totalVenta = window.totalVentaUSD || 0;

        const ventaData = {
            cliente_id: window.clienteSeleccionadoID || "anonimo",
            nombre_cliente: nombreParaGuardar,
            items: carrito,
            total_usd: totalVenta,
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

        if (montoCreditoUSD > 0 && ventaData.cliente_id !== "anonimo") {
            await addDoc(collection(db, "usuarios", USER_ID, "cuentas_por_cobrar"), {
                cliente_id: ventaData.cliente_id,
                nombre_cliente: nombreParaGuardar,
                nro_factura: nroFactura,
                monto_total_usd: totalVenta,
                monto_credito_usd: montoCreditoUSD,
                abonado: 0,
                pendiente: montoCreditoUSD,
                estado: "pendiente",
                fecha: serverTimestamp()
            });
        }

        for (const item of carrito) {
            const productoRef = doc(db, "usuarios", USER_ID, "productos", item.id);
            await updateDoc(productoRef, { stock: increment(-item.cantidad) });
        }

        // --- DISPARAR IMPRESIÓN AUTOMÁTICA ---
        await verificarEImprimirTicket(nroFactura, ventaData);

        alert("✅ Venta registrada: " + nroFactura);
        
        carrito = [];
        window.clienteSeleccionadoID = null;
        window.nombreClienteSeleccionado = null;
        const modalPago = document.getElementById('modalPago');
        if (modalPago) modalPago.style.display = 'none';
        window.actualizarCarritoUI();
        
        const siguiente = (parseInt(nroFactura) + 1).toString().padStart(6, '0');
        const facturaDisplay = document.getElementById('factura-display');
        if (facturaDisplay) facturaDisplay.innerText = `FACTURA: ${siguiente}`;

    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error al guardar: " + error.message);
    } finally {
        // Liberamos el bloqueo y restauramos el botón de forma segura
        window.procesandoVenta = false;
        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.style.opacity = "1";
            btnConfirmar.innerText = "CONFIRMAR VENTA";
        }
    }
};

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
        // Obtenemos las ventas (puedes filtrar por fecha o traer las últimas 50 del día)
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

        // Configurar buscador en tiempo real dentro del modal
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
        await verificarEImprimirTicket(ventaData.nro_factura, ventaData);
        
        // Opcional: cerrar modal al imprimir
        document.getElementById('modalBuscarFactura').style.display = 'none';

    } catch (err) {
        console.error("Error al reimprimir:", err);
        alert("Hubo un error al intentar reimprimir.");
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

// --- ACTUALIZAR CARRITO UI EN UNA SOLA LÍNEA CON PRECIO EN BS ---
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

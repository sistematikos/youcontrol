/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Cuentas por Cobrar agrupadas por cliente (sys_v5_cxc.js)
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, addDoc, getDocs, where, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- VALIDACIÓN DE SESIÓN ---
const USER_ID = localStorage.getItem('youcontrol_empresa_id');
if (!USER_ID) {
    window.location.href = "index.html";
}

document.addEventListener('DOMContentLoaded', () => {
    cargarCuentasPorCobrar();
    initBuscador();
});

let listaCuentasGlobal = [];
let cuentaActualSeleccionada = null;

function cargarCuentasPorCobrar() {
    const tbody = document.getElementById('tabla-cxc');
    if (!tbody) return;

    const cxcRef = collection(db, "usuarios", USER_ID, "cuentas_por_cobrar");
    const q = query(cxcRef, orderBy("fecha", "desc"));

    onSnapshot(q, (snapshot) => {
        listaCuentasGlobal = [];
        snapshot.forEach(docSnap => {
            listaCuentasGlobal.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderizarTablaAgrupada(listaCuentasGlobal);
        calcularKPIs(listaCuentasGlobal);
    }, (error) => {
        console.error("Error al cargar cuentas por cobrar:", error);
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 20px; color: var(--rose);">Error al sincronizar los datos.</td></tr>`;
    });
}

function renderizarTablaAgrupada(datos) {
    const tbody = document.getElementById('tabla-cxc');
    if (!tbody) return;

    if (datos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 20px; color: var(--text-muted);">No hay cuentas por cobrar registradas.</td></tr>`;
        return;
    }

    // --- AGRUPAR POR CLIENTE ---
    const agrupadoPorCliente = {};

    datos.forEach(item => {
        // Usamos el cliente_id o el nombre como clave de agrupación
        const clienteKey = item.cliente_id || item.nombre_cliente || "Sin Nombre";
        const nombreCliente = item.nombre_cliente || 'Sin Nombre';

        if (!agrupadoPorCliente[clienteKey]) {
            agrupadoPorCliente[clienteKey] = {
                nombre: nombreCliente,
                totalDeudaCliente: 0,
                facturas: []
            };
        }

        const montoVal = item.monto !== undefined ? item.monto : (item.monto_credito_usd || item.monto_total || item.monto_total_usd || 0);
        const abonadoVal = item.abonado !== undefined ? item.abonado : (item.monto_abonado_usd || 0);
        const pendienteVal = item.pendiente !== undefined ? item.pendiente : (item.saldo_pendiente_usd || montoVal);

        // Sumar solo si tiene deuda pendiente relevante
        if (pendienteVal > 0.01) {
            agrupadoPorCliente[clienteKey].totalDeudaCliente += pendienteVal;
        }

        agrupadoPorCliente[clienteKey].facturas.push({
            ...item,
            montoVal,
            abonadoVal,
            pendienteVal
        });
    });

    let htmlFinal = "";

    // Construir filas agrupadas
    Object.keys(agrupadoPorCliente).forEach(key => {
        const grupo = agrupadoPorCliente[key];
        
        // Fila de Cabecera del Cliente con la suma total que debe
        htmlFinal += `
            <tr style="background-color: #f1f5f9; border-top: 2px solid #cbd5e1;">
                <td colspan="3"><strong>👤 CLIENTE: ${grupo.nombre.toUpperCase()}</strong></td>
                <td colspan="2" class="text-right"><strong>TOTAL GENERAL DEL CLIENTE:</strong></td>
                <td class="text-right" style="color: var(--rose); font-size: 1.05rem;"><strong>$ ${grupo.totalDeudaCliente.toFixed(2)}</strong></td>
                <td colspan="2"></td>
            </tr>
        `;

        // Filas de cada factura de ese cliente
        grupo.facturas.forEach(item => {
            let fechaStr = "N/D";
            if (item.fecha && item.fecha.toDate) {
                fechaStr = item.fecha.toDate().toLocaleString('es-VE', { 
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                });
            }

            let estadoClase = "status-pendiente";
            let estadoTexto = "Pendiente";

            if (item.pendienteVal <= 0.01) {
                estadoClase = "status-pagado";
                estadoTexto = "Pagado";
            } else if (item.abonadoVal > 0) {
                estadoClase = "status-parcial";
                estadoTexto = "Parcial";
            }

            htmlFinal += `
                <tr>
                    <td style="padding-left: 25px;">${fechaStr}</td>
                    <td>Factura: <strong>${item.nro_factura || 'N/D'}</strong></td>
                    <td>${item.detalle || 'Venta a crédito'}</td>
                    <td class="text-right"><strong>$ ${item.montoVal.toFixed(2)}</strong></td>
                    <td class="text-right" style="color: var(--emerald);">$ ${item.abonadoVal.toFixed(2)}</td>
                    <td class="text-right" style="color: var(--rose);"><strong>$ ${item.pendienteVal.toFixed(2)}</strong></td>
                    <td class="text-center"><span class="badge-status ${estadoClase}">${estadoTexto}</span></td>
                    <td class="text-center">
                        <button class="btn-accion" onclick="window.abrirAbono('${item.id}')">
                            <i class="fas fa-cash-register"></i> Abonar
                        </button>
                    </td>
                </tr>
            `;
        });
    });

    tbody.innerHTML = htmlFinal;
}

function calcularKPIs(datos) {
    let totalDeuda = 0;
    let totalAbonado = 0;
    let creditosPendientes = 0;
    const clientesSet = new Set();

    datos.forEach(item => {
        const montoVal = item.monto !== undefined ? item.monto : (item.monto_credito_usd || item.monto_total || item.monto_total_usd || 0);
        const abonado = item.abonado !== undefined ? item.abonado : (item.monto_abonado_usd || 0);
        const pendiente = item.pendiente !== undefined ? item.pendiente : (item.saldo_pendiente_usd || montoVal);

        totalAbonado += abonado;
        if (pendiente > 0.01) {
            totalDeuda += pendiente;
            creditosPendientes++;
            if (item.cliente_id) clientesSet.add(item.cliente_id);
            else if (item.nombre_cliente) clientesSet.add(item.nombre_cliente);
        }
    });

    const elDeuda = document.getElementById('tot-deuda');
    const elAbonado = document.getElementById('tot-abonado');
    const elPendientes = document.getElementById('tot-pendientes');
    const elClientes = document.getElementById('tot-clientes');

    if (elDeuda) elDeuda.innerText = `$ ${totalDeuda.toFixed(2)}`;
    if (elAbonado) elAbonado.innerText = `$ ${totalAbonado.toFixed(2)}`;
    if (elPendientes) elPendientes.innerText = creditosPendientes;
    if (elClientes) elClientes.innerText = clientesSet.size;
}

function initBuscador() {
    const inputBusqueda = document.getElementById('input-busqueda');
    inputBusqueda?.addEventListener('input', (e) => {
        const criterio = e.target.value.toLowerCase().trim();
        const filtrados = listaCuentasGlobal.filter(item => 
            (item.nombre_cliente || '').toLowerCase().includes(criterio) || 
            (item.detalle || '').toLowerCase().includes(criterio) ||
            (item.nro_factura || '').toLowerCase().includes(criterio)
        );
        renderizarTablaAgrupada(filtrados);
    });
}

// --- FUNCIONES DEL MODAL DE ABONOS ---
window.abrirAbono = async (id) => {
    cuentaActualSeleccionada = listaCuentasGlobal.find(c => c.id === id);
    if (!cuentaActualSeleccionada) return;

    const montoVal = cuentaActualSeleccionada.monto !== undefined ? cuentaActualSeleccionada.monto : (cuentaActualSeleccionada.monto_credito_usd || cuentaActualSeleccionada.monto_total || 0);
    const abonadoVal = cuentaActualSeleccionada.abonado !== undefined ? cuentaActualSeleccionada.abonado : (cuentaActualSeleccionada.monto_abonado_usd || 0);
    const pendienteVal = cuentaActualSeleccionada.pendiente !== undefined ? cuentaActualSeleccionada.pendiente : (cuentaActualSeleccionada.saldo_pendiente_usd || (montoVal - abonadoVal));

    cuentaActualSeleccionada.calculadoPendiente = pendienteVal;
    cuentaActualSeleccionada.calculadoAbonado = abonadoVal;

    document.getElementById('lbl-modal-cliente').innerText = cuentaActualSeleccionada.nombre_cliente || 'Cliente';
    document.getElementById('lbl-modal-pendiente').innerText = `$ ${pendienteVal.toFixed(2)}`;
    document.getElementById('input-monto-abono').value = '';

    const contenedorProductos = document.getElementById('lista-productos-abono');
    if (contenedorProductos) {
        contenedorProductos.innerHTML = `<span style="font-size: 12px; color: #94a3b8;">Buscando productos de la factura...</span>`;
    }

    document.getElementById('modal-abono').style.display = 'flex';

    try {
        let itemsFactura = [];

        if (cuentaActualSeleccionada.items && cuentaActualSeleccionada.items.length > 0) {
            itemsFactura = cuentaActualSeleccionada.items;
        } else if (cuentaActualSeleccionada.nro_factura) {
            const ventasRef = collection(db, "usuarios", USER_ID, "ventas");
            const q = query(ventasRef, where("nro_factura", "==", cuentaActualSeleccionada.nro_factura));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                itemsFactura = querySnapshot.docs[0].data().items || [];
            } else {
                const ventaDocRef = doc(db, "usuarios", USER_ID, "ventas", cuentaActualSeleccionada.nro_factura);
                const ventaDocSnap = await getDoc(ventaDocRef);
                if (ventaDocSnap.exists()) {
                    itemsFactura = ventaDocSnap.data().items || [];
                }
            }
        }

        if (contenedorProductos) {
            if (itemsFactura.length > 0) {
                contenedorProductos.innerHTML = itemsFactura.map(item => {
                    const cantidad = item.cantidad || 1;
                    const nombre = item.nombre || item.descripcion || 'Producto';
                    const precio = item.precio || item.precio_unitario || 0;
                    return `
                        <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; border-bottom: 1px dashed #e2e8f0;">
                            <span><strong>${cantidad}x</strong> ${nombre}</span>
                            <span>$${(cantidad * precio).toFixed(2)}</span>
                        </div>
                    `;
                }).join('');
            } else {
                contenedorProductos.innerHTML = `<span style="font-size: 12px; color: #94a3b8;">No hay detalles de productos registrados para esta factura.</span>`;
            }
        }
    } catch (error) {
        console.error("Error al buscar los productos de la venta:", error);
        if (contenedorProductos) {
            contenedorProductos.innerHTML = `<span style="font-size: 12px; color: var(--rose);">Error al cargar los productos de la factura.</span>`;
        }
    }
};

window.cerrarModalAbono = () => {
    document.getElementById('modal-abono').style.display = 'none';
    cuentaActualSeleccionada = null;
};

window.procesarAbonoFirebase = async () => {
    if (!cuentaActualSeleccionada) return;

    const inputMonto = document.getElementById('input-monto-abono');
    const metodoPago = document.getElementById('select-metodo-pago').value;
    const montoAbono = parseFloat(inputMonto?.value) || 0;

    if (montoAbono <= 0) {
        alert("Ingrese un monto válido para el abono.");
        return;
    }

    if (montoAbono > cuentaActualSeleccionada.calculadoPendiente) {
        alert("El monto del abono no puede ser mayor que la deuda pendiente.");
        return;
    }

    try {
        const nuevoAbonado = cuentaActualSeleccionada.calculadoAbonado + montoAbono;
        const nuevoPendiente = cuentaActualSeleccionada.calculadoPendiente - montoAbono;
        const nuevoEstado = nuevoPendiente <= 0.01 ? "pagado" : "parcial";

        const docRef = doc(db, "usuarios", USER_ID, "cuentas_por_cobrar", cuentaActualSeleccionada.id);
        
        await updateDoc(docRef, {
            abonado: nuevoAbonado,
            monto_abonado_usd: nuevoAbonado,
            pendiente: nuevoPendiente,
            saldo_pendiente_usd: nuevoPendiente,
            estado: nuevoEstado
        });

        await addDoc(collection(db, "usuarios", USER_ID, "historial_abonos"), {
            cuenta_id: cuentaActualSeleccionada.id,
            cliente: cuentaActualSeleccionada.nombre_cliente,
            monto: montoAbono,
            metodo: metodoPago,
            fecha: serverTimestamp()
        });

        alert("¡Abono registrado con éxito!");
        window.cerrarModalAbono();
    } catch (error) {
        console.error("Error al procesar el abono:", error);
        alert("Hubo un error al registrar el abono en Firebase.");
    }
};

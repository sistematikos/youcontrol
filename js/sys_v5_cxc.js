/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Cuentas por Cobrar (sys_v5_cxc.js)
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

        renderizarTabla(listaCuentasGlobal);
        calcularKPIs(listaCuentasGlobal);
    }, (error) => {
        console.error("Error al cargar cuentas por cobrar:", error);
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 20px; color: var(--rose);">Error al sincronizar los datos.</td></tr>`;
    });
}

function renderizarTabla(datos) {
    const tbody = document.getElementById('tabla-cxc');
    if (!tbody) return;

    if (datos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 20px; color: var(--text-muted);">No hay cuentas por cobrar registradas.</td></tr>`;
        return;
    }

    tbody.innerHTML = datos.map(item => {
        let fechaStr = "N/D";
        if (item.fecha && item.fecha.toDate) {
            fechaStr = item.fecha.toDate().toLocaleString('es-VE', { 
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
            });
        }

        const montoVal = item.monto !== undefined ? item.monto : (item.monto_credito_usd || item.monto_total || item.monto_total_usd || 0);
        const abonadoVal = item.abonado !== undefined ? item.abonado : (item.monto_abonado_usd || 0);
        const pendienteVal = item.pendiente !== undefined ? item.pendiente : (item.saldo_pendiente_usd || montoVal);

        let estadoClase = "status-pendiente";
        let estadoTexto = "Pendiente";

        if (pendienteVal <= 0.01) {
            estadoClase = "status-pagado";
            estadoTexto = "Pagado";
        } else if (abonadoVal > 0) {
            estadoClase = "status-parcial";
            estadoTexto = "Parcial";
        }

        return `
            <tr>
                <td>${fechaStr}</td>
                <td><strong>${item.nombre_cliente || 'Sin Nombre'}</strong></td>
                <td>${item.detalle || 'Venta a crédito'}</td>
                <td class="text-right"><strong>$ ${montoVal.toFixed(2)}</strong></td>
                <td class="text-right" style="color: var(--emerald);">$ ${abonadoVal.toFixed(2)}</td>
                <td class="text-right" style="color: var(--rose);"><strong>$ ${pendienteVal.toFixed(2)}</strong></td>
                <td class="text-center"><span class="badge-status ${estadoClase}">${estadoTexto}</span></td>
                <td class="text-center">
                    <button class="btn-accion" onclick="window.abrirAbono('${item.id}')">
                        <i class="fas fa-cash-register"></i> Abonar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
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
        renderizarTabla(filtrados);
    });
}

// --- FUNCIONES DEL MODAL DE ABONOS ---
window.abrirAbono = (id) => {
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
    document.getElementById('modal-abono').style.display = 'flex';
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
        
        // Actualizamos la cuenta por cobrar
        await updateDoc(docRef, {
            abonado: nuevoAbonado,
            monto_abonado_usd: nuevoAbonado,
            pendiente: nuevoPendiente,
            saldo_pendiente_usd: nuevoPendiente,
            estado: nuevoEstado
        });

        // Opcional: Registrar también en el historial de ingresos/pagos si tu sistema lo lleva
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

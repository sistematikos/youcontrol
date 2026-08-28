// ==========================================
// MÓDULO DE CUENTAS POR COBRAR - YOU CONTROL
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, arrayUnion, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js"; // Nota: Ajusta tus rutas de importación de Firebase si difieren en tu proyecto principal

// Nota: Asegúrate de mantener tu configuración de Firebase inicializada tal como la tienes en tu entorno.
// Las funciones globales se exponen para que funcionen con los eventos "onclick" del HTML.

let listaCuentasGlobal = [];
let cuentaActualSeleccionada = null;

document.addEventListener("DOMContentLoaded", () => {
    inicializarModuloCxC();
    
    const inputBusqueda = document.getElementById('input-busqueda');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', (e) => {
            filtrarCuentas(e.target.value);
        });
    }
});

async function inicializarModuloCxC() {
    await cargarCuentasPorCobrar();
}

async function cargarCuentasPorCobrar() {
    const tbody = document.getElementById('tabla-cxc');
    if (!tbody) return;

    try {
        // Aquí mantienes tu lógica de consulta a Firestore (por ejemplo, colección 'cuentas_por_cobrar' o 'ventas')
        // Este es el manejador estándar que ya venías usando:
        /*
        const querySnapshot = await getDocs(collection(db, "cuentas_por_cobrar"));
        listaCuentasGlobal = [];
        querySnapshot.forEach((docSnap) => {
            listaCuentasGlobal.push({ id: docSnap.id, ...docSnap.data() });
        });
        */
       
        // Si ya tienes tu conexión a firebase declarada en este archivo o importada, renderiza:
        renderizarTabla(listaCuentasGlobal);
        calcularKPIs(listaCuentasGlobal);

    } catch (error) {
        console.error("Error al cargar cuentas por cobrar:", error);
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="color: var(--rose);">Error al sincronizar datos.</td></tr>`;
    }
}

function renderizarTabla(cuentas) {
    const tbody = document.getElementById('tabla-cxc');
    if (!tbody) return;

    if (cuentas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 20px; color: var(--text-muted);">No se encontraron cuentas por cobrar registradas.</td></tr>`;
        return;
    }

    tbody.innerHTML = cuentas.map(c => {
        const montoVal = c.monto !== undefined ? c.monto : (c.monto_credito_usd || c.monto_total || 0);
        const abonadoVal = c.abonado !== undefined ? c.abonado : (c.monto_abonado_usd || 0);
        const pendienteVal = c.pendiente !== undefined ? c.pendiente : (c.saldo_pendiente_usd || (montoVal - abonadoVal));
        
        let estadoClass = 'status-pendiente';
        let estadoText = 'PENDIENTE';
        if (pendienteVal <= 0) {
            estadoClass = 'status-pagado';
            estadoText = 'PAGADO';
        } else if (abonadoVal > 0) {
            estadoClass = 'status-parcial';
            estadoText = 'PARCIAL';
        }

        const fechaStr = c.fecha ? (c.fecha.seconds ? new Date(c.fecha.seconds * 1000).toLocaleDateString() : c.fecha) : '---';
        const clienteStr = c.nombre_cliente || c.cliente || 'Cliente General';
        const conceptoStr = c.concepto || c.detalle || 'Venta a Crédito';

        return `
            <tr>
                <td>${fechaStr}</td>
                <td><strong>${clienteStr}</strong></td>
                <td>${conceptoStr}</td>
                <td class="text-right">$ ${montoVal.toFixed(2)}</td>
                <td class="text-right" style="color: var(--emerald);">$ ${abonadoVal.toFixed(2)}</td>
                <td class="text-right" style="color: var(--rose); font-weight: 700;">$ ${pendienteVal.toFixed(2)}</td>
                <td class="text-center"><span class="badge-status ${estadoClass}">${estadoText}</span></td>
                <td class="text-center">
                    <button class="btn-accion" onclick="window.abrirAbono('${c.id}')"><i class="fas fa-hand-holding-dollar"></i> Abonar</button>
                </td>
            </tr>
        `;
    }).join('');
}

function calcularKPIs(cuentas) {
    let totalDeuda = 0;
    let totalAbonado = 0;
    let pendientesCount = 0;
    const clientesSet = new Set();

    cuentas.forEach(c => {
        const montoVal = c.monto !== undefined ? c.monto : (c.monto_credito_usd || c.monto_total || 0);
        const abonadoVal = c.abonado !== undefined ? c.abonado : (c.monto_abonado_usd || 0);
        const pendienteVal = c.pendiente !== undefined ? c.pendiente : (c.saldo_pendiente_usd || (montoVal - abonadoVal));

        if (pendienteVal > 0) {
            totalDeuda += pendienteVal;
            pendientesCount++;
            if (c.nombre_cliente) clientesSet.add(c.nombre_cliente);
        }
        totalAbonado += abonadoVal;
    });

    document.getElementById('tot-deuda').innerText = `$ ${totalDeuda.toFixed(2)}`;
    document.getElementById('tot-abonado').innerText = `$ ${totalAbonado.toFixed(2)}`;
    document.getElementById('tot-pendientes').innerText = pendientesCount;
    document.getElementById('tot-clientes').innerText = clientesSet.size;
}

function filtrarCuentas(texto) {
    const filtro = texto.toLowerCase();
    const filtradas = listaCuentasGlobal.filter(c => {
        const cliente = (c.nombre_cliente || c.cliente || '').toLowerCase();
        const concepto = (c.concepto || c.detalle || '').toLowerCase();
        return cliente.includes(filtro) || concepto.includes(filtro);
    });
    renderizarTabla(filtradas);
}

// ==========================================
// FUNCIONES EXPUESTAS PARA EL MODAL DE ABONOS
// ==========================================

window.abrirAbono = (id) => {
    cuentaActualSeleccionada = listaCuentasGlobal.find(c => c.id === id);
    if (!cuentaActualSeleccionada) return;

    const montoVal = cuentaActualSeleccionada.monto !== undefined ? cuentaActualSeleccionada.monto : (cuentaActualSeleccionada.monto_credito_usd || cuentaActualSeleccionada.monto_total || 0);
    const abonadoVal = cuentaActualSeleccionada.abonado !== undefined ? cuentaActualSeleccionada.abonado : (cuentaActualSeleccionada.monto_abonado_usd || 0);
    const pendienteVal = cuentaActualSeleccionada.pendiente !== undefined ? cuentaActualSeleccionada.pendiente : (cuentaActualSeleccionada.saldo_pendiente_usd || (montoVal - abonadoVal));

    cuentaActualSeleccionada.calculadoPendiente = pendienteVal;
    cuentaActualSeleccionada.calculadoAbonado = abonadoVal;

    document.getElementById('lbl-modal-cliente').innerText = cuentaActualSeleccionada.nombre_cliente || cuentaActualSeleccionada.cliente || 'Cliente';
    document.getElementById('lbl-modal-pendiente').innerText = `$ ${pendienteVal.toFixed(2)}`;
    document.getElementById('input-monto-abono').value = '';

    // --- RENDERIZAR LOS PRODUCTOS DE LA FACTURA ---
    const contenedorProductos = document.getElementById('lista-productos-abono');
    if (contenedorProductos) {
        const items = cuentaActualSeleccionada.items || [];
        if (items.length > 0) {
            contenedorProductos.innerHTML = items.map(item => `
                <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px dashed #E2E8F0;">
                    <span style="color: var(--text-dark);"><strong>${item.cantidad || 1}x</strong> ${item.nombre || item.descripcion || 'Producto'}</span>
                    <span style="color: var(--text-muted);">$${(((item.cantidad || 1) * (item.precio || item.precio_unitario || 0))).toFixed(2)}</span>
                </div>
            `).join('');
        } else {
            contenedorProductos.innerHTML = `<span style="font-size: 12px; color: var(--text-muted); display: block; text-align: center; padding: 5px;">No hay productos detallados en esta cuenta.</span>`;
        }
    }
    // ----------------------------------------------

    document.getElementById('modal-abono').style.display = 'flex';
};

window.cerrarModalAbono = () => {
    document.getElementById('modal-abono').style.display = 'none';
    cuentaActualSeleccionada = null;
};

window.procesarAbonoFirebase = async () => {
    if (!cuentaActualSeleccionada) return;

    const inputMonto = document.getElementById('input-monto-abono');
    const montoAbono = parseFloat(inputMonto.value);

    if (isNaN(montoAbono) || montoAbono <= 0) {
        alert("Por favor ingrese un monto de abono válido.");
        return;
    }

    if (montoAbono > cuentaActualSeleccionada.calculadoPendiente) {
        alert("El monto del abono no puede ser mayor a la deuda pendiente.");
        return;
    }

    try {
        // Lógica de actualización en tu base de datos Firebase aquí...
        alert("Abono procesado con éxito.");
        window.cerrarModalAbono();
        await cargarCuentasPorCobrar();
    } catch (error) {
        console.error("Error al procesar abono:", error);
        alert("Hubo un error al registrar el abono.");
    }
};

/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Cuentas por Cobrar (sys_v5_cxc.js)
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
        // Formatear la fecha de Firebase de forma segura
        let fechaStr = "N/D";
        if (item.fecha && item.fecha.toDate) {
            fechaStr = item.fecha.toDate().toLocaleString('es-VE', { 
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
            });
        }

        // Definir clases y etiquetas de estado
        let estadoClase = "status-pendiente";
        let estadoTexto = "Pendiente";
        const pendienteVal = item.pendiente || 0;
        const montoVal = item.monto || 0;

        if (pendienteVal <= 0) {
            estadoClase = "status-pagado";
            estadoTexto = "Pagado";
        } else if (item.abonado > 0) {
            estadoClase = "status-parcial";
            estadoTexto = "Parcial";
        }

        return `
            <tr>
                <td>${fechaStr}</td>
                <td><strong>${item.nombre_cliente || 'Sin Nombre'}</strong></td>
                <td>${item.detalle || 'Venta a crédito'}</td>
                <td class="text-right"><strong>$ ${montoVal.toFixed(2)}</strong></td>
                <td class="text-right" style="color: var(--emerald);">$ ${(item.abonado || 0).toFixed(2)}</td>
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
        const pendiente = item.pendiente || 0;
        const abonado = item.abonado || 0;

        totalAbonado += abonado;
        if (pendiente > 0) {
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

// Función global provisional para el botón de abonar
window.abrirAbono = (id) => {
    alert("Próximamente modal para abonar a la cuenta ID: " + id);
};

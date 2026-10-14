/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Reporte y Auditoría de Movimientos de Inventario (sys_v3_mov_inv_rep.js)
 */

import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.getElementById('btn-buscar').addEventListener('click', cargarReporteMovimientos);

async function cargarReporteMovimientos() {
    const tbody = document.getElementById('tabla-reporte-movimientos');
    const empresaId = localStorage.getItem('youcontrol_empresa_id');
    const filtroTipo = document.getElementById('filtro-tipo').value;

    if (!empresaId) {
        alert("No se encontró la empresa activa en el sistema.");
        return;
    }

    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Buscando movimientos de inventario...</td></tr>`;

    try {
        const movRef = collection(db, "usuarios", empresaId, "mov_inventario");
        const querySnapshot = await getDocs(movRef);

        let movimientosArray = [];

        querySnapshot.forEach((docSnap) => {
            const m = docSnap.data();
            const tipoOp = m.tipo_operacion || 'ENTRADA';

            if (filtroTipo !== 'TODOS' && tipoOp !== filtroTipo) {
                return;
            }

            let fechaDate = new Date(0);
            let fechaStr = "N/A";
            
            if (m.fecha && typeof m.fecha.toDate === 'function') {
                fechaDate = m.fecha.toDate();
                fechaStr = fechaDate.toLocaleString();
            } else if (m.fecha) {
                fechaStr = m.fecha;
            }

            const correlativoNum = Number(m.correlativo || 0);
            const nroMovStr = m.nro_movimiento || docSnap.id;

            // CASO A: El documento tiene un array de "items" (Lotes múltiples)
            if (m.items && Array.isArray(m.items) && m.items.length > 0) {
                m.items.forEach((item) => {
                    movimientosArray.push({
                        id: docSnap.id,
                        nroMovStr: nroMovStr,
                        fechaDate: fechaDate,
                        fechaStr: fechaStr,
                        tipoOp: tipoOp,
                        correlativoNum: correlativoNum,
                        sku: item.sku || item.producto_id || 'N/A',
                        nombre_producto: item.nombre_producto || item.nombre || 'Sin nombre',
                        cantidad: Number(item.cantidad || 0),
                        stock_anterior: item.stock_anterior ?? 0,
                        stock_nuevo: item.stock_nuevo ?? 0,
                        concepto: m.concepto || 'Movimiento por lote'
                    });
                });
            } else {
                // CASO B: Formato individual o registros antiguos donde los datos están en la raíz
                const cantidadIndividual = Number(m.cantidad || m.stock_cambio || 0);
                movimientosArray.push({
                    id: docSnap.id,
                    nroMovStr: nroMovStr,
                    fechaDate: fechaDate,
                    fechaStr: fechaStr,
                    tipoOp: tipoOp,
                    correlativoNum: correlativoNum,
                    sku: m.sku || m.producto_id || 'N/A',
                    nombre_producto: m.nombre_producto || m.nombre || 'Sin nombre',
                    cantidad: cantidadIndividual,
                    stock_anterior: m.stock_anterior ?? 0,
                    stock_nuevo: m.stock_nuevo ?? 0,
                    concepto: m.concepto || 'Ajuste de inventario'
                });
            }
        });

        // Ordenar por correlativo descendente
        movimientosArray.sort((a, b) => b.correlativoNum - a.correlativoNum);

        let totalMovimientos = 0;
        let totalUnidades = 0;
        let html = "";

        if (movimientosArray.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No se encontraron movimientos registrados.</td></tr>`;
            document.getElementById('kpi-total-movimientos').innerText = "0";
            document.getElementById('kpi-total-unidades').innerText = "0";
            return;
        }

        movimientosArray.forEach((m) => {
            totalMovimientos++;
            totalUnidades += m.cantidad;

            let badgeClass = "badge-entrada";
            let signoStock = "+";
            if (m.tipoOp === 'SALIDA') {
                badgeClass = "badge-salida";
                signoStock = "-";
            } else if (m.tipoOp === 'AJUSTE') {
                badgeClass = "badge-ajuste";
                signoStock = "=";
            }

            html += `
                <tr class="fila-mov">
                    <td><strong>${m.nroMovStr}</strong></td>
                    <td>${m.fechaStr}</td>
                    <td><span class="badge-tipo ${badgeClass}">${m.tipoOp}</span></td>
                    <td>
                        <strong>${m.sku}</strong><br>
                        <span style="font-size: 13px; color: #4b5563;">${m.nombre_producto}</span>
                    </td>
                    <td>${m.concepto}</td>
                    <td class="text-center">
                        <span style="font-size: 12px; color: #64748B;">(${m.stock_anterior} ➔ ${m.stock_nuevo})</span><br>
                        <strong style="font-size: 15px;">${signoStock}${m.cantidad}</strong>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        document.getElementById('kpi-total-movimientos').innerText = totalMovimientos;
        document.getElementById('kpi-total-unidades').innerText = totalUnidades;

    } catch (error) {
        console.error("Error cargando movimientos de inventario: ", error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger); padding: 20px;">Error al conectar con la base de datos: ${error.message}</td></tr>`;
    }
}

// Cargar automáticamente al abrir la página
window.addEventListener('DOMContentLoaded', () => {
    cargarReporteMovimientos();
});

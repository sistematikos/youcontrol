/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Reporte y Auditoría de Movimientos de Inventario (sys_v3_mov_inv_rep.js)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "youcontrol-1d60a.firebaseapp.com",
    projectId: "youcontrol-1d60a",
    storageBucket: "youcontrol-1d60a.appspot.com",
    messagingSenderId: "812100760013",
    appId: "1:812100760013:web:7574906aa285555faf5484"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
        // Ordenamos por correlativo descendente (del más reciente al más antiguo)
        const q = query(movRef, orderBy("correlativo", "desc"));
        const querySnapshot = await getDocs(q);

        let totalMovimientos = 0;
        let totalUnidades = 0;
        tbody.innerHTML = "";

        if (querySnapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No se encontraron movimientos registrados.</td></tr>`;
            document.getElementById('kpi-total-movimientos').innerText = "0";
            document.getElementById('kpi-total-unidades').innerText = "0";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const m = docSnap.data();
            const tipoOp = m.tipo_operacion || 'ENTRADA';

            // Filtrar si el usuario seleccionó un tipo específico
            if (filtroTipo !== 'TODOS' && tipoOp !== filtroTipo) {
                return;
            }

            totalMovimientos++;
            totalUnidades += Number(m.cantidad || 0);

            // Formato de fecha
            let fechaStr = "N/A";
            if (m.fecha && typeof m.fecha.toDate === 'function') {
                fechaStr = m.fecha.toDate().toLocaleString();
            } else if (m.fecha) {
                fechaStr = m.fecha;
            }

            // Identificador numérico limpio (ej: 00001)
            const nroMovStr = m.nro_movimiento || docSnap.id;

            // Insignia visual según tipo de operación
            let badgeClass = "badge-entrada";
            let signoStock = "+";
            if (tipoOp === 'SALIDA') {
                badgeClass = "badge-salida";
                signoStock = "-";
            } else if (tipoOp === 'AJUSTE') {
                badgeClass = "badge-ajuste";
                signoStock = "=";
            }

            const tr = document.createElement('tr');
            tr.className = "fila-mov";

            tr.innerHTML = `
                <td><strong>${nroMovStr}</strong></td>
                <td>${fechaStr}</td>
                <td><span class="badge-tipo ${badgeClass}">${tipoOp}</span></td>
                <td>
                    <strong>${m.sku || 'N/A'}</strong><br>
                    <span style="font-size: 13px; color: #4b5563;">${m.nombre_producto || 'Sin nombre'}</span>
                </td>
                <td>${m.concepto || 'Ajuste de inventario'}</td>
                <td class="text-center">
                    <span style="font-size: 12px; color: #64748B;">(${m.stock_anterior || 0} ➔ ${m.stock_nuevo || 0})</span><br>
                    <strong style="font-size: 15px;">${signoStock}${m.cantidad}</strong>
                </td>
            `;

            tbody.appendChild(tr);
        });

        document.getElementById('kpi-total-movimientos').innerText = totalMovimientos;
        document.getElementById('kpi-total-unidades').innerText = totalUnidades;

    } catch (error) {
        console.error("Error cargando movimientos de inventario: ", error);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--danger); padding: 20px;">Error al conectar con la base de datos o índices pendientes en Firestore.</td></tr>`;
    }
}

// Cargar automáticamente al abrir la página
window.addEventListener('DOMContentLoaded', () => {
    cargarReporteMovimientos();
});

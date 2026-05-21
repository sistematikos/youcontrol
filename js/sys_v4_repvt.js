/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Auditoría y Reportes de Ventas por Fechas (sys_v4_repvt.js)
 */

import { db } from './firebase-config.js';
import { 
    collection, query, where, getDocs, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";

// Vinculaciones del DOM
const inputDesde = document.getElementById('filtro-desde');
const inputHasta = document.getElementById('filtro-hasta');
const tablaReporte = document.getElementById('tabla-reporte-ventas');
const statusBar = document.getElementById('status-bar-report');

// Elementos KPI
const kpiVentas = document.getElementById('kpi-total-ventas');
const kpiGanancia = document.getElementById('kpi-margen-estimado');
const kpiArticulos = document.getElementById('kpi-total-articulos');

function mostrarEstado(mensaje, tipo) {
    if (!statusBar) return;
    statusBar.className = `status-${tipo}`;
    statusBar.innerText = mensaje;
    statusBar.style.display = 'block';
    if (tipo === 'success') {
        setTimeout(() => { statusBar.style.display = 'none'; }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Establecer por defecto las fechas del día de hoy
    const hoy = new Date().toISOString().split('T')[0];
    if (inputDesde) inputDesde.value = hoy;
    if (inputHasta) inputHasta.value = hoy;
    
    // Consulta automatizada inicial al abrir la pantalla
    window.cargarReporteVentas();
});

window.cargarReporteVentas = async () => {
    const desde = inputDesde.value;
    const hasta = inputHasta.value;

    if (!desde || !hasta) {
        mostrarEstado("❌ Ambos rangos de fechas son obligatorios.", "loading");
        return;
    }

    if (desde > hasta) {
        mostrarEstado("❌ La fecha inicial no puede ser mayor que la fecha final.", "loading");
        return;
    }

    mostrarEstado("⏳ Consultando transacciones en el periodo...", "loading");
    if (tablaReporte) tablaReporte.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Filtrando base de datos...</td></tr>`;

    try {
        const ventasRef = collection(db, "usuarios", USER_ID, "ventas");
        const q = query(
            ventasRef,
            where("fecha", ">=", desde),
            where("fecha", "<=", hasta),
            orderBy("fecha", "desc")
        );

        const querySnapshot = await getDocs(q);
        
        let acumTotalFacturado = 0;
        let acumTotalCosto = 0;
        let acumArticulosVendidos = 0;
        
        if (querySnapshot.empty) {
            tablaReporte.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:30px;">No se encontraron registros de ventas en las fechas seleccionadas.</td></tr>`;
            resetearKPIs();
            mostrarEstado("📌 Consulta lista. Sin registros.", "success");
            return;
        }

        tablaReporte.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const venta = doc.data();
            const idVenta = doc.id;

            const ventaTotal = parseFloat(venta.total_usd) || 0;
            const costoTotal = parseFloat(venta.total_costo_usd) || 0;
            const cantItems = parseInt(venta.total_items) || 0;

            acumTotalFacturado += ventaTotal;
            acumTotalCosto += costoTotal;
            acumArticulosVendidos += cantItems;

            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td><b>#${idVenta.substring(0, 8).toUpperCase()}</b><br><small style="color:var(--text-muted);">${venta.fecha}</small></td>
                <td>${venta.cliente || 'Consumidor Final'}<br><small style="color:var(--text-muted);">${venta.tipo_pago || 'Efectivo'}</small></td>
                <td style="text-align: center;">${cantItems}</td>
                <td style="text-align: right; color: var(--text-muted);">$ ${costoTotal.toFixed(2)}</td>
                <td style="text-align: right; font-weight: 600;">$ ${ventaTotal.toFixed(2)}</td>
            `;
            tablaReporte.appendChild(fila);
        });

        const gananciaEstimada = acumTotalFacturado - acumTotalCosto;

        kpiVentas.innerText = `$ ${acumTotalFacturado.toFixed(2)}`;
        kpiGanancia.innerText = `$ ${gananciaEstimada.toFixed(2)}`;
        kpiArticulos.innerText = acumArticulosVendidos.toString();

        mostrarEstado("✅ Reporte consolidado con éxito.", "success");

    } catch (e) {
        console.error("Error al generar el reporte de ventas:", e);
        mostrarEstado("❌ Error de lectura en base de datos de ventas.", "loading");
    }
};

function resetearKPIs() {
    kpiVentas.innerText = "$ 0.00";
    kpiGanancia.innerText = "$ 0.00";
    kpiArticulos.innerText = "0";
}

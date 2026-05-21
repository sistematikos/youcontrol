/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Auditoría y Reportes de Ventas por Fechas (sys_v4_repvt.js)
 * Optimización: Muestra el desglose de artículos comprados en lugar del costo total.
 */

import { db } from './firebase-config.js';
import { 
    collection, query, where, getDocs, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id') || "sUhfZI9Fy3M9UlInTYw2wFWZmB12";

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
    const hoy = new Date().toISOString().split('T')[0];
    if (inputDesde && !inputDesde.value) inputDesde.value = hoy;
    if (inputHasta && !inputHasta.value) inputHasta.value = hoy;
    
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
            tablaReporte.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#64748B; padding:30px;">No se encontraron registros de ventas en las fechas seleccionadas.</td></tr>`;
            resetearKPIs();
            mostrarEstado("📌 Consulta lista. Sin registros.", "success");
            return;
        }

        // Modificamos también los encabezados de la tabla dinámicamente si es necesario, 
        // o puedes asegurar que tu HTML coincida con estas 5 columnas: 
        // ID VENTA / FECHA | CLIENTE / TIPO | ARTÍCULOS DETALLE | CANT. TOTAL | TOTAL VENTA ($)
        tablaReporte.innerHTML = '';

        querySnapshot.forEach((docSnap) => {
            const venta = docSnap.data();
            const idVenta = docSnap.id;

            const identificadorFactura = venta.nro_factura ? venta.nro_factura : `#${idVenta.substring(0, 8).toUpperCase()}`;

            let totalVentaDolar = 0;
            let totalCostoDolar = 0;
            let totalUnidadesVenta = 0;
            let listaArticulosHTML = "";

            // Procesar ítems y armar el bloque de texto con los nombres de productos
            if (Array.isArray(venta.items)) {
                venta.items.forEach(prod => {
                    const cant = parseFloat(prod.cantidad) || parseFloat(prod.cant) || 0;
                    const precio = parseFloat(prod.precio) || 0;
                    const costo = parseFloat(prod.costo) || 0;
                    const descripcion = prod.descripcion || prod.nombre || "Artículo sin nombre";

                    totalVentaDolar += (cant * precio);
                    totalCostoDolar += (cant * costo);
                    totalUnidadesVenta += cant;

                    // Construimos una lista limpia y compacta de los productos comprados
                    listaArticulosHTML += `<div style="font-size: 0.85rem; color: #334155; margin-bottom: 2px;">• ${descripcion} <b style="color:#64748B;">(x${cant})</b></div>`;
                });
            } 
            
            if (totalVentaDolar === 0) {
                totalVentaDolar = parseFloat(venta.total_usd) || 0;
                totalCostoDolar = parseFloat(venta.total_costo_usd) || 0;
                totalUnidadesVenta = parseInt(venta.total_items) || 0;
                listaArticulosHTML = `<span style="color:#94A3B8; font-style:italic; font-size:0.85rem;">Ver detalle en POS</span>`;
            }

            acumTotalFacturado += totalVentaDolar;
            acumTotalCosto += totalCostoDolar;
            acumArticulosVendidos += totalUnidadesVenta;

            let metodoPago = "Efectivo/Otros";
            if (venta.pagos) {
                const p = venta.pagos;
                if ((p.point || p.punto) > 0) metodoPago = "Punto de Venta";
                else if (p.movil > 0) metodoPago = "Pago Móvil";
                else if (p.divisas > 0) metodoPago = "Divisas ($)";
                else if (p.efectivo > 0) metodoPago = "Efectivo (Bs)";
            }

            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td><b>${identificadorFactura}</b><br><small style="color:#64748B;">${venta.fecha_completa || venta.fecha}</small></td>
                <td>${venta.cliente_nombre || 'Consumidor Final'}<br><small style="color:#006aff; font-weight:600;">${metodoPago}</small></td>
                <td style="text-align: left; padding-left: 10px;">${listaArticulosHTML}</td>
                <td style="text-align: center; font-weight: 600;">${totalUnidadesVenta}</td>
                <td style="text-align: right; font-weight: 800; color: #1E293B;">$ ${totalVentaDolar.toFixed(2)}</td>
            `;
            tablaReporte.appendChild(fila);
        });

        const gananciaEstimada = acumTotalFacturado - acumTotalCosto;

        if (kpiVentas) kpiVentas.innerText = `$ ${acumTotalFacturado.toFixed(2)}`;
        if (kpiGanancia) kpiGanancia.innerText = `$ ${gananciaEstimada.toFixed(2)}`;
        if (kpiArticulos) kpiArticulos.innerText = acumArticulosVendidos.toString();

        mostrarEstado("✅ Reporte consolidado con éxito.", "success");

    } catch (e) {
        console.error("Error al generar el reporte de ventas:", e);
        mostrarEstado("❌ Error de lectura en la base de datos.", "loading");
    }
};

function resetearKPIs() {
    if (kpiVentas) kpiVentas.innerText = "$ 0.00";
    if (kpiGanancia) kpiGanancia.innerText = "$ 0.00";
    if (kpiArticulos) kpiArticulos.innerText = "0";
}

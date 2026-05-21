/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Auditoría y Reportes de Ventas por Fechas (sys_v4_repvt.js)
 */

import { db } from './firebase-config.js';
import { 
    collection, getDocs, query, orderBy 
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

// Mapeo de meses en español para procesar el string de tu Firestore
const MESES = {
    "enero": 0, "febrero": 1, "marzo": 2, "abril": 3, "mayo": 4, "junio": 5,
    "julio": 6, "agosto": 7, "septiembre": 8, "octubre": 9, "noviembre": 10, "diciembre": 11
};

function mostrarEstado(mensaje, tipo) {
    if (!statusBar) return;
    statusBar.className = `status-${tipo}`;
    statusBar.innerText = mensaje;
    statusBar.style.display = 'block';
    if (tipo === 'success') {
        setTimeout(() => { statusBar.style.display = 'none'; }, 3000);
    }
}

/**
 * Convierte el formato de fecha de tu base de datos:
 * "21 de mayo de 2026 a las 5:02:54 p.m. UTC-4" -> Objeto Date ejecutable
 */
function parsearFechaFirestore(fechaString) {
    try {
        if (!fechaString || typeof fechaString !== 'string') return null;
        
        // Limpiamos y normalizamos la cadena
        const partes = fechaString.toLowerCase().split(" a las ");
        const fechaParte = partes[0].trim(); // "21 de mayo de 2026"
        
        const fragmentos = fechaParte.split(" de ");
        if (fragmentos.length < 3) return null;
        
        const dia = parseInt(fragmentos[0]);
        const mesTexto = fragmentos[1].trim();
        const anio = parseInt(fragmentos[2]);
        
        const mes = MESES[mesTexto] !== undefined ? MESES[mesTexto] : 0;
        
        return new Date(anio, mes, dia, 0, 0, 0, 0);
    } catch (e) {
        console.error("Error al parsear fecha:", e);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar los selectores visuales con la fecha local de hoy
    const hoy = new Date().toISOString().split('T')[0];
    if (inputDesde) inputDesde.value = hoy;
    if (inputHasta) inputHasta.value = hoy;
    
    window.cargarReporteVentas();
});

window.cargarReporteVentas = async () => {
    const desdeStr = inputDesde.value; // "YYYY-MM-DD"
    const hastaStr = inputHasta.value; // "YYYY-MM-DD"

    if (!desdeStr || !hastaStr) {
        mostrarEstado("❌ Ambos rangos de fechas son obligatorios.", "loading");
        return;
    }

    // Convertir filtros de interfaz a objetos Date de comparación (a las 00:00:00)
    const [a1, m1, d1] = desdeStr.split('-');
    const [a2, m2, d2] = hastaStr.split('-');
    const fechaLimiteDesde = new Date(a1, m1 - 1, d1, 0, 0, 0, 0);
    const fechaLimiteHasta = new Date(a2, m2 - 1, d2, 23, 59, 59, 999);

    if (fechaLimiteDesde > fechaLimiteHasta) {
        mostrarEstado("❌ La fecha inicial no puede ser mayor que la fecha final.", "loading");
        return;
    }

    mostrarEstado("⏳ Procesando transacciones en Firestore...", "loading");
    if (tablaReporte) tablaReporte.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Filtrando base de datos...</td></tr>`;

    try {
        // Traemos los documentos de la colección
        const ventasRef = collection(db, "usuarios", USER_ID, "ventas");
        const querySnapshot = await getDocs(ventasRef);
        
        let acumTotalFacturado = 0;
        let acumTotalCosto = 0;
        let acumArticulosVendidos = 0;
        let registrosAgregados = 0;

        if (querySnapshot.empty) {
            tablaReporte.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:30px;">No existen transacciones en la base de datos.</td></tr>`;
            resetearKPIs();
            mostrarEstado("📌 Sin registros totales en el sistema.", "success");
            return;
        }

        // Estructura temporal para ordenar los datos filtrados cronológicamente descendente
        let ventasFiltradas = [];

        querySnapshot.forEach((doc) => {
            const venta = doc.data();
            const idVenta = doc.id;
            
            // Extraer y transformar el string de fecha nativo de tu Firestore
            const fechaObjeto = parsearFechaFirestore(venta.fecha);
            
            if (fechaObjeto) {
                // Aplicar el filtro de rango requerido por el usuario
                if (fechaObjeto >= fechaLimiteDesde && fechaObjeto <= fechaLimiteHasta) {
                    ventasFiltradas.push({
                        id: idVenta,
                        data: venta,
                        timestamp: fechaObjeto.getTime()
                    });
                }
            }
        });

        // Ordenar de más reciente a más antigua
        ventasFiltradas.sort((a, b) => b.timestamp - a.timestamp);

        if (ventasFiltradas.length === 0) {
            tablaReporte.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:30px;">No se encontraron registros de ventas en las fechas seleccionadas.</td></tr>`;
            resetearKPIs();
            mostrarEstado("📌 Filtro aplicado. Sin coincidencias.", "success");
            return;
        }

        tablaReporte.innerHTML = '';

        ventasFiltradas.forEach((item) => {
            const venta = item.data;
            const idVenta = item.id;

            // Procesamiento dinámico del array de ítems internos para calcular costos y totales de forma real
            let totalVentaDolar = 0;
            let totalCostoDolar = 0;
            let totalUnidadesVenta = 0;

            if (Array.isArray(venta.items)) {
                venta.items.forEach(prod => {
                    const cant = parseFloat(prod.cantidad) || 0;
                    const precio = parseFloat(prod.precio) || 0;
                    const costo = parseFloat(prod.costo) || 0; // Si no manejas costo individual por ítem aún, por defecto será 0

                    totalVentaDolar += (cant * precio);
                    totalCostoDolar += (cant * costo);
                    totalUnidadesVenta += cant;
                });
            } else {
                // Fallback por si la estructura guardó los datos en la raíz
                totalVentaDolar = parseFloat(venta.total_usd) || 0;
                totalCostoDolar = parseFloat(venta.total_costo_usd) || 0;
                totalUnidadesVenta = parseInt(venta.total_items) || 0;
            }

            acumTotalFacturado += totalVentaDolar;
            acumTotalCosto += totalCostoDolar;
            acumArticulosVendidos += totalUnidadesVenta;
            registrosAgregados++;

            // Imprimir fila con el formato real de tu base de datos (cliente_nombre)
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td><b>#${idVenta.substring(0, 8).toUpperCase()}</b><br><small style="color:var(--text-muted); font-size: 0.75rem;">${venta.fecha ? venta.fecha.split(' a las ')[0] : 'S/F'}</small></td>
                <td>${venta.cliente_nombre || 'Consumidor Final'}<br><small style="color:var(--text-muted); font-size: 0.75rem;">${venta.tipo_pago || 'Efectivo'}</small></td>
                <td style="text-align: center; font-weight: 600;">${totalUnidadesVenta}</td>
                <td style="text-align: right; color: var(--text-muted);">$ ${totalCostoDolar.toFixed(2)}</td>
                <td style="text-align: right; font-weight: 800; color: var(--slate-dark);">$ ${totalVentaDolar.toFixed(2)}</td>
            `;
            tablaReporte.appendChild(fila);
        });

        // Calcular ganancias finales reflejadas en los KPI superiores
        const gananciaEstimada = acumTotalFacturado - acumTotalCosto;

        kpiVentas.innerText = `$ ${acumTotalFacturado.toFixed(2)}`;
        kpiGanancia.innerText = `$ ${gananciaEstimada.toFixed(2)}`;
        kpiArticulos.innerText = acumArticulosVendidos.toString();

        mostrarEstado(`✅ Se procesaron ${registrosAgregados} ventas exitosamente.`, "success");

    } catch (e) {
        console.error("Error al generar el reporte de ventas:", e);
        mostrarEstado("❌ Error de comunicación con la subcolección de ventas.", "loading");
    }
};

function resetearKPIs() {
    kpiVentas.innerText = "$ 0.00";
    kpiGanancia.innerText = "$ 0.00";
    kpiArticulos.innerText = "0";
}

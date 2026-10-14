import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

// Función para obtener la fecha local correcta en Venezuela (YYYY-MM-DD)
function obtenerFechaLocalVenezuela() {
    const d = new Date();
    // Ajuste por zona horaria de Venezuela (UTC-4)
    const localTime = d.getTime() - (4 * 60 * 60 * 1000);
    const localDate = new Date(localTime);
    return localDate.toISOString().split('T')[0];
}

window.cargarReporteVentas = async () => {
    const inputDesde = document.getElementById('filtro-desde');
    const inputHasta = document.getElementById('filtro-hasta');
    
    // Obtenemos estrictamente los valores escritos en los inputs de la interfaz
    const desde = inputDesde ? inputDesde.value : "";
    let hasta = inputHasta ? inputHasta.value : desde;

    if (!desde) {
        alert("Por favor selecciona una fecha inicial.");
        return;
    }

    try {
        const ventasRef = collection(db, "usuarios", USER_ID, "ventas");
        const snapshot = await getDocs(ventasRef);

        let ventasArray = [];

        snapshot.forEach(vDoc => {
            const data = vDoc.data();
            
            if (data.fecha && typeof data.fecha.toDate === 'function') {
                const d = data.fecha.toDate();
                // Ajuste de zona horaria de Venezuela (UTC-4) para sacar la fecha local YYYY-MM-DD exacta
                const localTimeDoc = d.getTime() - (4 * 60 * 60 * 1000);
                const dLocal = new Date(localTimeDoc);
                const yyyy = dLocal.getUTCFullYear();
                const mm = String(dLocal.getUTCMonth() + 1).padStart(2, '0');
                const dd = String(dLocal.getUTCDate()).padStart(2, '0');
                const fechaStr = `${yyyy}-${mm}-${dd}`;

                // FILTRADO ESTRICTO POR RANGO DE FECHAS SELECCIONADO EN PANTALLA
                if (fechaStr >= desde && fechaStr <= hasta) {
                    ventasArray.push({
                        id: vDoc.id,
                        fechaDate: d,
                        fechaStr: `${dd}/${mm}/${yyyy}, ${d.toLocaleTimeString()}`,
                        ...data
                    });
                }
            }
        });

        // Ordenar de más reciente a más antiguo
        ventasArray.sort((a, b) => b.fechaDate - a.fechaDate);

        let html = '';
        let totalVendido = 0;
        let contadorFacturas = 0;

        ventasArray.forEach(v => {
            totalVendido += (v.total_usd || 0);
            contadorFacturas++;
            
            const nombreCliente = v.nombre_cliente || "Cliente General";
            const listaItems = (v.items || []).map(i => 
                `<li>${i.nombre} (${i.cantidad} x $${(i.precio || 0).toFixed(2)})</li>`
            ).join('');

            html += `<tr>
                <td><input type="checkbox" class="sel-venta" value="${v.id}"></td>
                <td>${v.fechaStr}</td>
                <td><strong>${v.nro_factura || v.id}</strong></td>
                <td>${nombreCliente}</td>
                <td><ul style="margin:0; padding-left:15px;">${listaItems}</ul></td>
                <td style="text-align:right;"><strong>$${(v.total_usd || 0).toFixed(2)}</strong></td>
            </tr>`;
        });

        const tbody = document.getElementById('tabla-reporte-ventas');
        if (tbody) {
            tbody.innerHTML = html || '<tr><td colspan="6" style="text-align:center; padding:20px;">No hay ventas registradas en este rango de fechas.</td></tr>';
        }
        
        if (document.getElementById('kpi-total-usd')) {
            document.getElementById('kpi-total-usd').textContent = `$ ${totalVendido.toFixed(2)}`;
        }
        if (document.getElementById('kpi-total-facturas')) {
            document.getElementById('kpi-total-facturas').textContent = contadorFacturas;
        }

    } catch (error) {
        console.error("Error al cargar reporte de ventas:", error);
        alert("Error al cargar el reporte: " + error.message);
    }
};

// Autoejecutar al cargar la página con la fecha de hoy en Venezuela
document.addEventListener('DOMContentLoaded', () => {
    const hoyStr = obtenerFechaLocalVenezuela();
    const inputDesde = document.getElementById('filtro-desde');
    const inputHasta = document.getElementById('filtro-hasta');
    
    if (inputDesde) inputDesde.value = hoyStr;
    if (inputHasta) inputHasta.value = hoyStr;

    window.cargarReporteVentas();

    // Vincular botón de búsqueda si existe
    const btnBuscar = document.getElementById('btn-buscar-ventas') || document.querySelector('button[onclick*="cargarReporteVentas"]') || document.querySelector('.btn-primary');
    // Asegurar que el botón de buscar dispare la función al hacer clic
    const botones = document.querySelectorAll('button');
    botones.forEach(btn => {
        if (btn.textContent.includes('Buscar Ventas')) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.cargarReporteVentas();
            });
        }
    });
});

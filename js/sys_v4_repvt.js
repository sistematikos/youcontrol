import { db } from './firebase-config.js';
import { collection, query, getDocs, orderBy, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

window.cargarReporteVentas = async () => {
    const desde = document.getElementById('filtro-desde').value;
    const hasta = document.getElementById('filtro-hasta').value;
    
    if (!desde || !hasta) {
        alert("Selecciona un rango de fechas válido.");
        return;
    }

    const fechaInicio = new Date(desde);
    const fechaFin = new Date(hasta);
    fechaFin.setHours(23, 59, 59, 999);

    try {
        const ventasRef = collection(db, "usuarios", USER_ID, "ventas");
        const q = query(ventasRef, orderBy("fecha", "desc"));
        const snapshot = await getDocs(q);

        let html = '';

        for (const vDoc of snapshot.docs) {
            const data = vDoc.data();
            const fechaVenta = data.fecha.toDate();

            if (fechaVenta >= fechaInicio && fechaVenta <= fechaFin) {
                
                const nombreCliente = data.nombre_cliente || "Anónimo";

                // Lista de productos con precio unitario
                const listaItems = data.items.map(i => 
                    `<li>${i.nombre} (${i.cantidad} x $${(i.precio || 0).toFixed(2)})</li>`
                ).join('');

                html += `<tr>
                    <td><strong>${data.nro_factura}</strong><br><small>${fechaVenta.toLocaleDateString()}</small></td>
                    <td>${nombreCliente}</td>
                    <td><ul style="margin:0; padding-left:15px;">${listaItems}</ul></td>
                    <td style="text-align:right;"><strong>$${(data.total_usd || 0).toFixed(2)}</strong></td>
                </tr>`;
            }
        }

        // Solo actualizamos la tabla, los KPIs ya no se tocan ni se muestran
        document.getElementById('tabla-reporte-ventas').innerHTML = html || '<tr><td colspan="4" style="text-align:center;">No hay ventas en este rango.</td></tr>';

    } catch (error) {
        console.error("Error al cargar reporte:", error);
        alert("Error al cargar el reporte.");
    }
};

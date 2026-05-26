import { db } from './firebase-config.js';
import { collection, query, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

window.cargarReporteVentas = async () => {
    const desde = document.getElementById('filtro-desde').value;
    const hasta = document.getElementById('filtro-hasta').value;
    
    if (!desde || !hasta) {
        alert("Selecciona un rango de fechas válido.");
        return;
    }

    // Convertimos las fechas del input a objetos de JavaScript
    const fechaInicio = new Date(desde);
    const fechaFin = new Date(hasta);
    fechaFin.setHours(23, 59, 59, 999); // Incluye todo el día final

    try {
        const ventasRef = collection(db, "usuarios", USER_ID, "ventas");
        // Traemos todas las ventas ordenadas por fecha
        const q = query(ventasRef, orderBy("fecha", "desc"));
        const snapshot = await getDocs(q);

        let html = '';
        let total = 0;
        let articulos = 0;

        snapshot.forEach((doc) => {
            const data = doc.data();
            const fechaVenta = data.fecha.toDate();

            // AQUÍ ESTÁ EL FILTRO: Solo procesamos lo que está en el rango
            if (fechaVenta >= fechaInicio && fechaVenta <= fechaFin) {
                total += data.total_usd || 0;
                
                // Sumamos cantidad de artículos
                data.items.forEach(i => articulos += i.cantidad);

                html += `<tr>
                    <td><strong>${data.nro_factura}</strong><br><small>${fechaVenta.toLocaleDateString()}</small></td>
                    <td>Cliente</td>
                    <td>${data.items.map(i => i.nombre).join(', ')}</td>
                    <td style="text-align:right;">$${(data.total_usd || 0).toFixed(2)}</td>
                </tr>`;
            }
        });

        // Actualizamos la tabla
        document.getElementById('tabla-reporte-ventas').innerHTML = html || '<tr><td colspan="4" style="text-align:center;">No hay ventas en este rango.</td></tr>';
        document.getElementById('kpi-total-ventas').innerText = `$ ${total.toFixed(2)}`;
        document.getElementById('kpi-total-articulos').innerText = articulos;

    } catch (error) {
        console.error("Error al filtrar:", error);
        alert("Asegúrate de que la empresa ya tenga ventas registradas.");
    }
};

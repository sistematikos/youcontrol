import { db } from './firebase-config.js';
import { collection, query, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

window.cargarReporteVentas = async () => {
    const desde = document.getElementById('filtro-desde').value;
    let hasta = document.getElementById('filtro-hasta').value; // Usamos 'let' para poder modificarlo
    
    if (!desde) {
        alert("Selecciona al menos una fecha inicial.");
        return;
    }

    // Si no se selecciona fecha fin, asumimos que es el mismo día que 'desde'
    if (!hasta) {
        hasta = desde;
    }

    const fechaInicio = new Date(desde);
    fechaInicio.setHours(0, 0, 0, 0); // Inicio del día
    
    const fechaFin = new Date(hasta);
    fechaFin.setHours(23, 59, 59, 999); // Fin del día

    try {
        const ventasRef = collection(db, "usuarios", USER_ID, "ventas");
        const q = query(ventasRef, orderBy("fecha", "desc"));
        const snapshot = await getDocs(q);

        let html = '';
        let totalVendido = 0; // Acumulador para KPI
        let contadorFacturas = 0; // Acumulador para KPI

        for (const vDoc of snapshot.docs) {
            const data = vDoc.data();
            const fechaVenta = data.fecha.toDate();

            if (fechaVenta >= fechaInicio && fechaVenta <= fechaFin) {
                totalVendido += (data.total_usd || 0);
                contadorFacturas++;
                
                const nombreCliente = data.nombre_cliente || "Anónimo";
                
                // Nota: He mantenido tu estructura, si quieres quitar los detalles, 
                // simplemente elimina la fila de <td> que contiene la lista.
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

        // Actualizar Tabla
        document.getElementById('tabla-reporte-ventas').innerHTML = html || '<tr><td colspan="4" style="text-align:center;">No hay ventas en este rango.</td></tr>';

        // ACTUALIZAR TARJETAS KPI
        document.getElementById('kpi-total-usd').textContent = `$ ${totalVendido.toFixed(2)}`;
        document.getElementById('kpi-total-facturas').textContent = contadorFacturas;

    } catch (error) {
        console.error("Error al cargar reporte:", error);
        alert("Error al cargar el reporte.");
    }
};

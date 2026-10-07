import { db } from './firebase-config.js';
import { collection, query, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

window.cargarReporteVentas = async () => {
    const desde = document.getElementById('filtro-desde').value;
    let hasta = document.getElementById('filtro-hasta').value || desde;
    
    if (!desde) {
        alert("Selecciona al menos una fecha inicial.");
        return;
    }

    try {
        const ventasRef = collection(db, "usuarios", USER_ID, "ventas");
        const q = query(ventasRef, orderBy("fecha", "desc"));
        const snapshot = await getDocs(q);

        let html = '';
        let totalVendido = 0;
        let contadorFacturas = 0;

        for (const vDoc of snapshot.docs) {
            const data = vDoc.data();
            
            // CORRECCIÓN: Convertimos el Timestamp a fecha local YYYY-MM-DD
            if (data.fecha && typeof data.fecha.toDate === 'function') {
                const d = data.fecha.toDate();
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const fechaStr = `${yyyy}-${mm}-${dd}`;

                // Comparamos cadenas (ej: "2026-05-26" >= "2026-05-26")
                if (fechaStr >= desde && fechaStr <= hasta) {
                    totalVendido += (data.total_usd || 0);
                    contadorFacturas++;
                    
                    const nombreCliente = data.nombre_cliente || "Anónimo";
                    const listaItems = (data.items || []).map(i => 
                        `<li>${i.nombre} (${i.cantidad} x $${(i.precio || 0).toFixed(2)})</li>`
                    ).join('');

                    html += `<tr>
                        <td><strong>${data.nro_factura}</strong><br><small>${fechaStr}</small></td>
                        <td>${nombreCliente}</td>
                        <td><ul style="margin:0; padding-left:15px;">${listaItems}</ul></td>
                        <td style="text-align:right;"><strong>$${(data.total_usd || 0).toFixed(2)}</strong></td>
                    </tr>`;
                }
            }
        }

        document.getElementById('tabla-reporte-ventas').innerHTML = html || '<tr><td colspan="4" style="text-align:center;">No hay ventas en este rango.</td></tr>';
        document.getElementById('kpi-total-usd').textContent = `$ ${totalVendido.toFixed(2)}`;
        document.getElementById('kpi-total-facturas').textContent = contadorFacturas;

    } catch (error) {
        console.error("Error al cargar reporte:", error);
        alert("Error al cargar el reporte.");
    }
};

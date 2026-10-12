import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

window.cargarReporteVentas = async () => {
    const desde = document.getElementById('filtro-desde').value;
    let hasta = document.getElementById('filtro-hasta').value || desde;
    
    if (!desde) {
        alert("Selecciona al menos una fecha inicial.");
        return;
    }

    try {
        // Consultamos sin orderBy para evitar errores por índices faltantes en proyectos nuevos
        const ventasRef = collection(db, "usuarios", USER_ID, "ventas");
        const snapshot = await getDocs(ventasRef);

        let ventasArray = [];

        // Recorremos y filtramos/convertimos las fechas
        snapshot.forEach(vDoc => {
            const data = vDoc.data();
            if (data.fecha && typeof data.fecha.toDate === 'function') {
                const d = data.fecha.toDate();
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const fechaStr = `${yyyy}-${mm}-${dd}`;

                if (fechaStr >= desde && fechaStr <= hasta) {
                    ventasArray.push({
                        id: vDoc.id,
                        fechaDate: d, // Guardamos el objeto Date real para ordenar después
                        fechaStr: fechaStr,
                        ...data
                    });
                }
            }
        });

        // Ordenamos de más reciente a más antiguo directamente en JS (descendente)
        ventasArray.sort((a, b) => b.fechaDate - a.fechaDate);

        let html = '';
        let totalVendido = 0;
        let contadorFacturas = 0;

        ventasArray.forEach(v => {
            totalVendido += (v.total_usd || 0);
            contadorFacturas++;
            
            const nombreCliente = v.nombre_cliente || "Anónimo";
            const listaItems = (v.items || []).map(i => 
                `<li>${i.nombre} (${i.cantidad} x $${(i.precio || 0).toFixed(2)})</li>`
            ).join('');

            html += `<tr>
                <td><strong>${v.nro_factura || 'S/N'}</strong><br><small>${v.fechaStr}</small></td>
                <td>${nombreCliente}</td>
                <td><ul style="margin:0; padding-left:15px;">${listaItems}</ul></td>
                <td style="text-align:right;"><strong>$${(v.total_usd || 0).toFixed(2)}</strong></td>
            </tr>`;
        });

        document.getElementById('tabla-reporte-ventas').innerHTML = html || '<tr><td colspan="4" style="text-align:center;">No hay ventas en este rango.</td></tr>';
        document.getElementById('kpi-total-usd').textContent = `$ ${totalVendido.toFixed(2)}`;
        document.getElementById('kpi-total-facturas').textContent = contadorFacturas;

    } catch (error) {
        console.error("Error al cargar reporte:", error);
        alert("Error al cargar el reporte: " + error.message);
    }
};

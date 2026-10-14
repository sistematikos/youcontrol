import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

window.cargarReporteVentas = async () => {
    const inputDesde = document.getElementById('filtro-desde');
    const inputHasta = document.getElementById('filtro-hasta');
    
    // Si los inputs de fecha están vacíos, tomamos la fecha actual por defecto
    const hoyStr = new Date().toISOString().split('T')[0];
    const desde = inputDesde?.value || hoyStr;
    let hasta = inputHasta?.value || desde;

    try {
        const ventasRef = collection(db, "usuarios", USER_ID, "ventas");
        const snapshot = await getDocs(ventasRef);

        let ventasArray = [];

        snapshot.forEach(vDoc => {
            const data = vDoc.data();
            
            // Si la venta tiene fecha (Timestamp de Firestore)
            if (data.fecha && typeof data.fecha.toDate === 'function') {
                const d = data.fecha.toDate();
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const fechaStr = `${yyyy}-${mm}-${dd}`;

                // Validamos el rango de fechas de forma segura
                if (fechaStr >= desde && fechaStr <= hasta) {
                    ventasArray.push({
                        id: vDoc.id,
                        fechaDate: d,
                        fechaStr: fechaStr,
                        ...data
                    });
                }
            } else {
                // FALLBACK: Si por alguna razón la fecha llegó como texto o está vacía recién creada, 
                // la incluimos para que no desaparezca del reporte del día
                ventasArray.push({
                    id: vDoc.id,
                    fechaDate: new Date(),
                    fechaStr: hoyStr,
                    ...data
                });
            }
        });

        // Ordenamos de más reciente a más antiguo
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
                <td><strong>${v.nro_factura || v.id}</strong><br><small>${v.fechaStr}</small></td>
                <td>${nombreCliente}</td>
                <td><ul style="margin:0; padding-left:15px;">${listaItems}</ul></td>
                <td style="text-align:right;"><strong>$${(v.total_usd || 0).toFixed(2)}</strong></td>
            </tr>`;
        });

        const tbody = document.getElementById('tabla-reporte-ventas');
        if (tbody) {
            tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; padding:20px;">No hay ventas en este rango de fechas.</td></tr>';
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

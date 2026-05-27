/**
 * YOU CONTROL - SISTEMATIKOS
 * sys_v4_cuadre.js - Sincronizado con lógica de Reporte de Ventas
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Usamos el mismo ID dinámico que en tu otro reporte
const USER_ID = localStorage.getItem('youcontrol_empresa_id') || "YC-2026-001"; 
const inputFecha = document.getElementById('filtro-fecha');
const tablaCuerpo = document.getElementById('tabla-cuerpo');

function cargarCuadre(fechaSeleccionada) {
    const colRef = collection(db, "usuarios", USER_ID, "ventas");

    onSnapshot(colRef, (snapshot) => {
        let t = { usd: 0, efecBs: 0, punto: 0, pmovil: 0, global: 0 };
        tablaCuerpo.innerHTML = "";

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // 1. Extraer fecha igual que en tu otro reporte (buscando en items[0] o raíz)
            const items = data.items || [];
            const fechaVenta = items.length > 0 ? items[0].ultima_actualizacion : null;

            if (fechaVenta === fechaSeleccionada) {
                const p = data.pagos || {};
                const nombreCliente = data.nombre_cliente || "Anónimo";
                
                // 2. Mapeo de items igual que en tu otro reporte
                const listaItems = items.map(i => 
                    `<li>${i.nombre} (${i.cantidad})</li>`
                ).join('');

                // 3. Acumular totales
                t.usd += parseFloat(p.divisas_usd || 0);
                t.efecBs += parseFloat(p.efectivo_bs || 0);
                t.punto += parseFloat(p.punto_bs || 0);
                t.pmovil += parseFloat(p.pago_movil_bs || 0);
                t.global += parseFloat(data.total_usd || 0);

                // 4. Pintar la fila igual que tu otro reporte
                tablaCuerpo.innerHTML += `<tr>
                    <td><strong>${data.nro_factura || '---'}</strong><br><small>${data.hora || '--:--'}</small></td>
                    <td>${nombreCliente}</td>
                    <td><ul style="margin:0; padding-left:15px; font-size: 0.7rem;">${listaItems}</ul></td>
                    <td style="text-align:right;"><strong>$${(data.total_usd || 0).toFixed(2)}</strong></td>
                </tr>`;
            }
        });

        // Actualizar tarjetas (igual que antes)
        document.getElementById('tot-dolar').innerText = `$ ${t.usd.toFixed(2)}`;
        document.getElementById('tot-efec-bs').innerText = `Bs. ${t.efecBs.toFixed(2)}`;
        document.getElementById('tot-punto').innerText = `Bs. ${t.punto.toFixed(2)}`;
        document.getElementById('tot-pmovil').innerText = `Bs. ${t.pmovil.toFixed(2)}`;
        document.getElementById('tot-venta-dia').innerText = `Venta Total: $ ${t.global.toFixed(2)}`;
    });
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    inputFecha.value = new Date().toISOString().split('T')[0];
    cargarCuadre(inputFecha.value);
    inputFecha.addEventListener('change', (e) => cargarCuadre(e.target.value));
});

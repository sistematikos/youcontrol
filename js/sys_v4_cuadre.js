/**
 * YOU CONTROL - SISTEMATIKOS
 * sys_v4_cuadre.js - Versión optimizada (Solo totales y resumen)
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
            
            // Obtenemos la fecha real de la raíz del documento
            let fechaVenta = "";
            if (data.fecha && typeof data.fecha.toDate === 'function') {
                fechaVenta = data.fecha.toDate().toISOString().split('T')[0];
            }

            if (fechaVenta === fechaSeleccionada) {
                const p = data.pagos || {};
                const nombreCliente = data.nombre_cliente || "Anónimo";
                
                // Acumular totales
                t.usd += parseFloat(p.divisas_usd || 0);
                t.efecBs += parseFloat(p.efectivo_bs || 0);
                t.punto += parseFloat(p.punto_bs || 0);
                t.pmovil += parseFloat(p.pago_movil_bs || 0);
                t.global += parseFloat(data.total_usd || 0);

                // Pintar fila simplificada (sin detalles de productos)
                tablaCuerpo.innerHTML += `<tr>
                    <td><strong>${data.nro_factura || '---'}</strong><br><small>${data.hora || '--:--'}</small></td>
                    <td>${nombreCliente}</td>
                    <td>$ ${parseFloat(data.total_usd || 0).toFixed(2)}</td>
                    <td style="text-align:right;">Bs. ${(parseFloat(p.efectivo_bs||0) + parseFloat(p.punto_bs||0) + parseFloat(p.pago_movil_bs||0)).toFixed(2)}</td>
                </tr>`;
            }
        });

        if (tablaCuerpo.innerHTML === "") {
            tablaCuerpo.innerHTML = `<tr><td colspan="4" style="text-align:center;">No hay ventas registradas para ${fechaSeleccionada}</td></tr>`;
        }

        actualizarUI(t);
    });
}

function actualizarUI(t) {
    document.getElementById('tot-dolar').innerText = `$ ${t.usd.toFixed(2)}`;
    document.getElementById('tot-efec-bs').innerText = `Bs. ${t.efecBs.toFixed(2)}`;
    document.getElementById('tot-punto').innerText = `Bs. ${t.punto.toFixed(2)}`;
    document.getElementById('tot-pmovil').innerText = `Bs. ${t.pmovil.toFixed(2)}`;
    document.getElementById('tot-venta-dia').innerText = `Venta Total: $ ${t.global.toFixed(2)}`;
}

document.addEventListener('DOMContentLoaded', () => {
    inputFecha.value = new Date().toISOString().split('T')[0];
    cargarCuadre(inputFecha.value);
    inputFecha.addEventListener('change', (e) => cargarCuadre(e.target.value));
});

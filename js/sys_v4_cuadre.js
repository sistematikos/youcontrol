/**
 * YOU CONTROL - SISTEMATIKOS
 * sys_v4_cuadre.js - Versión Corregida para estructura YC-2026-001
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ID corregido según tu captura de Firebase
const USER_ID = "YC-2026-001"; 
const inputFecha = document.getElementById('filtro-fecha');
const tablaCuerpo = document.getElementById('tabla-cuerpo');

document.addEventListener('DOMContentLoaded', () => {
    inputFecha.value = new Date().toISOString().split('T')[0];
    cargarCuadre(inputFecha.value);
    inputFecha.addEventListener('change', (e) => cargarCuadre(e.target.value));
});

function cargarCuadre(fechaSeleccionada) {
    const colRef = collection(db, "usuarios", USER_ID, "ventas");

    onSnapshot(colRef, (snapshot) => {
        let t = { usd: 0, efecBs: 0, punto: 0, pmovil: 0, global: 0 };
        tablaCuerpo.innerHTML = "";

        snapshot.forEach(doc => {
            const v = doc.data();
            
            // BUSCAMOS LA FECHA EN EL ARREGLO 'items' (según tu captura image_ec5749)
            const items = v.items || [];
            const fechaEnItems = items.length > 0 ? items[0].ultima_actualizacion : null;

            if (fechaEnItems === fechaSeleccionada) {
                const p = v.pagos || {};
                
                // Sumamos los valores del objeto 'pagos'
                t.usd += parseFloat(p.divisas_usd || 0);
                t.efecBs += parseFloat(p.efectivo_bs || 0);
                t.punto += parseFloat(p.punto_bs || 0);
                t.pmovil += parseFloat(p.pago_movil_bs || 0);
                t.global += parseFloat(v.total_usd || 0);

                tablaCuerpo.innerHTML += `<tr>
                    <td>${v.hora || '--:--'}</td>
                    <td>#${v.nro_factura || '---'}</td>
                    <td>Multimétodo</td>
                    <td>$ ${parseFloat(v.total_usd || 0).toFixed(2)}</td>
                    <td>Bs. ${(parseFloat(p.efectivo_bs||0) + parseFloat(p.punto_bs||0) + parseFloat(p.pago_movil_bs||0)).toFixed(2)}</td>
                </tr>`;
            }
        });

        // Si no hay datos, mostrar mensaje
        if (tablaCuerpo.innerHTML === "") {
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay registros para ${fechaSeleccionada}</td></tr>`;
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

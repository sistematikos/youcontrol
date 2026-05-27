/**
 * YOU CONTROL - SISTEMATIKOS
 * Controlador de Cuadre de Caja Diario (sys_v4_cuadre.js)
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let desuscripcionActiva = null;

// Elementos DOM
const inputFecha = document.getElementById('filtro-fecha');
const tablaCuerpo = document.getElementById('tabla-cuerpo');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Establecer fecha actual por defecto
    inputFecha.value = new Date().toISOString().split('T')[0];
    cargarCuadre(inputFecha.value);

    // Escuchar cambios en el selector de fecha
    inputFecha.addEventListener('change', (e) => {
        cargarCuadre(e.target.value);
    });
});

function cargarCuadre(fechaSeleccionada) {
    if (desuscripcionActiva) desuscripcionActiva();

    const colRef = collection(db, "usuarios", USER_ID, "ventas");

    desuscripcionActiva = onSnapshot(colRef, (snapshot) => {
        let totales = { usd: 0, bs: 0, punto: 0, pmovil: 0, global: 0 };
        tablaCuerpo.innerHTML = "";

        // Filtramos por el campo 'ultima_actualizacion' que identificamos en tu DB
        const registros = snapshot.docs.filter(doc => doc.data().ultima_actualizacion === fechaSeleccionada);

        if (registros.length === 0) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay registros para ${fechaSeleccionada}</td></tr>`;
            actualizarUI(totales);
            return;
        }

        registros.forEach(doc => {
            const v = doc.data();
            const montoUSD = parseFloat(v.total_usd || v.monto || 0);
            const montoBS = parseFloat(v.total_bs || 0);
            const metodo = v.metodo_pago || v.metodo || "efectivo_dolar";
            
            totales.global += montoUSD;

            // Sumatoria según método
            if (metodo.includes("dolar")) totales.usd += montoUSD;
            if (metodo.includes("efectivo_bs")) totales.bs += montoBS;
            if (metodo.includes("punto")) totales.punto += montoBS;
            if (metodo.includes("pago_movil")) totales.pmovil += montoBS;

            tablaCuerpo.innerHTML += `<tr>
                <td>${v.hora || '--:--'}</td>
                <td>#${doc.id.substring(0, 8).toUpperCase()}</td>
                <td>${metodo.replace('_', ' ')}</td>
                <td>$ ${montoUSD.toFixed(2)}</td>
                <td>Bs. ${montoBS.toFixed(2).replace('.', ',')}</td>
            </tr>`;
        });

        actualizarUI(totales);
    });
}

function actualizarUI(t) {
    document.getElementById('tot-dolar').innerText = `$ ${t.usd.toFixed(2)}`;
    document.getElementById('tot-efec-bs').innerText = `Bs. ${t.bs.toFixed(2).replace('.', ',')}`;
    document.getElementById('tot-punto').innerText = `Bs. ${t.punto.toFixed(2).replace('.', ',')}`;
    document.getElementById('tot-pmovil').innerText = `Bs. ${t.pmovil.toFixed(2).replace('.', ',')}`;
    document.getElementById('tot-venta-dia').innerText = `Venta Total: $ ${t.global.toFixed(2)}`;
}

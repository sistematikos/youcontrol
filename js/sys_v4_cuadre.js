/**
 * YOU CONTROL - SISTEMATIKOS
 * sys_v4_cuadre.js
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
const inputFecha = document.getElementById('filtro-fecha');
const tablaCuerpo = document.getElementById('tabla-cuerpo');

// Inicialización
inputFecha.value = new Date().toISOString().split('T')[0];
inputFecha.addEventListener('change', () => cargarCuadre(inputFecha.value));

function cargarCuadre(fechaSeleccionada) {
    const colRef = collection(db, "usuarios", USER_ID, "ventas");

    onSnapshot(colRef, (snapshot) => {
        let totales = { usd: 0, bs: 0, punto: 0, pmovil: 0 };
        tablaCuerpo.innerHTML = "";

        // Filtramos por el campo que existe en tu DB: 'ultima_actualizacion'
        const registros = snapshot.docs.filter(doc => doc.data().ultima_actualizacion === fechaSeleccionada);

        if (registros.length === 0) {
            tablaCuerpo.innerHTML = `<tr><td colspan="4" style="text-align:center;">No hay registros para ${fechaSeleccionada}</td></tr>`;
        }

        registros.forEach(doc => {
            const v = doc.data();
            const monto = parseFloat(v.monto || v.total_usd || 0);
            
            // Sumatoria dinámica
            if (v.metodo === "dolar") totales.usd += monto;
            if (v.metodo === "efectivo_bs") totales.bs += monto;
            if (v.metodo === "punto") totales.punto += monto;
            if (v.metodo === "pago_movil") totales.pmovil += monto;

            tablaCuerpo.innerHTML += `<tr>
                <td>${v.hora || '--:--'}</td>
                <td>${v.ref || '---'}</td>
                <td>${v.metodo || 'N/A'}</td>
                <td>$ ${monto.toFixed(2)}</td>
            </tr>`;
        });

        // Actualizar UI
        document.getElementById('tot-dolar').innerText = `$ ${totales.usd.toFixed(2)}`;
        document.getElementById('tot-efec-bs').innerText = `Bs. ${totales.bs.toFixed(2)}`;
        document.getElementById('tot-punto').innerText = `Bs. ${totales.punto.toFixed(2)}`;
        document.getElementById('tot-pmovil').innerText = `Bs. ${totales.pmovil.toFixed(2)}`;
    });
}

// Carga inicial
cargarCuadre(inputFecha.value);

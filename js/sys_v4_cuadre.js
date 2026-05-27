import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
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

        // 1. Filtramos usando 'ultima_actualizacion'
        const registros = snapshot.docs.filter(doc => doc.data().ultima_actualizacion === fechaSeleccionada);

        if (registros.length === 0) {
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay registros para ${fechaSeleccionada}</td></tr>`;
            actualizarUI(t);
            return;
        }

        registros.forEach(doc => {
            const v = doc.data();
            const p = v.pagos || {}; // Accedemos al objeto 'pagos'
            
            // Sumamos los montos que vienen dentro del objeto 'pagos'
            const usd = parseFloat(p.divisas_usd || 0);
            const efecBs = parseFloat(p.efectivo_bs || 0);
            const punto = parseFloat(p.punto_bs || 0);
            const pmovil = parseFloat(p.pago_movil_bs || 0);

            t.usd += usd;
            t.efecBs += efecBs;
            t.punto += punto;
            t.pmovil += pmovil;
            t.global += v.total_usd || 0;

            tablaCuerpo.innerHTML += `<tr>
                <td>${v.hora || '--:--'}</td>
                <td>#${v.nro_factura || '---'}</td>
                <td>Multimétodo</td>
                <td>$ ${usd.toFixed(2)}</td>
                <td>Bs. ${(efecBs + punto + pmovil).toFixed(2)}</td>
            </tr>`;
        });

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

/**
 * YOU CONTROL - SISTEMATIKOS
 * Controlador de Cuadre de Caja Diario (sys_v4_cuadre.js)
 */

import { db } from './firebase-config.js';
import { 
    collection, query, where, onSnapshot, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasaActual = 1.00;
let desuscripcionActiva = null;

// Elementos DOM
const inputFecha = document.getElementById('filtro-fecha');
const tablaCuerpo = document.getElementById('tabla-cuerpo');
const txtTotDolar = document.getElementById('tot-dolar');
const txtTotEfecBs = document.getElementById('tot-efec-bs');
const txtTotPunto = document.getElementById('tot-punto');
const txtTotPMovil = document.getElementById('tot-pmovil');
const txtTotVentaDia = document.getElementById('tot-venta-dia');

async function inicializarCuadre() {
    const hoy = new Date().toISOString().split('T')[0];
    inputFecha.value = hoy;

    try {
        const tasaSnap = await getDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"));
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
        }

        cargarVentasPorFecha(hoy);

        inputFecha.addEventListener('change', (e) => {
            console.log("Fecha seleccionada:", e.target.value);
            cargarVentasPorFecha(e.target.value);
        });
    } catch (error) {
        console.error("Error inicializando:", error);
    }
}

function cargarVentasPorFecha(fechaFormato) {
    if (desuscripcionActiva) desuscripcionActiva();

    const colRef = collection(db, "usuarios", USER_ID, "ventas");
    const q = query(colRef, where("fecha", "==", fechaFormato));

    desuscripcionActiva = onSnapshot(q, (snapshot) => {
        let acumDolar = 0, acumEfecBs = 0, acumPunto = 0, acumPMovil = 0, totalUSDInterfaz = 0;

        tablaCuerpo.innerHTML = "";

        if (snapshot.empty) {
            console.log("No hay documentos para la fecha:", fechaFormato);
            tablaCuerpo.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No hay ventas registradas este día.</td></tr>`;
            actualizarTotalesPantalla(0, 0, 0, 0, 0);
            return;
        }

        snapshot.forEach((docSnap) => {
            const v = docSnap.data();
            const idFactura = docSnap.id.substring(0, 8).toUpperCase();
            const hora = v.hora || "--:--";
            const metodo = v.metodo_pago || "efectivo_dolar";
            const totalUSD = parseFloat(v.total_usd || 0);
            const totalBS = parseFloat(v.total_bs || (totalUSD * tasaActual));

            totalUSDInterfaz += totalUSD;

            let badgeMetodo = "";
            switch (metodo) {
                case "efectivo_dolar":
                    acumDolar += totalUSD;
                    badgeMetodo = `<span class="badge b-dolar">Efectivo $</span>`;
                    break;
                case "efectivo_bs":
                    acumEfecBs += totalBS;
                    badgeMetodo = `<span class="badge b-efec-bs">Efectivo Bs</span>`;
                    break;
                case "punto_venta":
                    acumPunto += totalBS;
                    badgeMetodo = `<span class="badge b-punto">Punto de Venta</span>`;
                    break;
                case "pago_movil":
                    acumPMovil += totalBS;
                    badgeMetodo = `<span class="badge b-pmovil">Pago Móvil</span>`;
                    break;
            }

            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${hora}</td>
                <td style="font-family: monospace; font-weight:700;">#${idFactura}</td>
                <td>${badgeMetodo}</td>
                <td style="font-weight:700;">$ ${totalUSD.toFixed(2)}</td>
                <td style="color: var(--text-muted);">Bs. ${totalBS.toFixed(2).replace('.', ',')}</td>
            `;
            tablaCuerpo.appendChild(fila);
        });

        actualizarTotalesPantalla(acumDolar, acumEfecBs, acumPunto, acumPMovil, totalUSDInterfaz);
    }, (error) => {
        console.error("Error en el snapshot de Firestore:", error);
    });
}

function actualizarTotalesPantalla(dolar, efecBs, punto, pmovil, globalUSD) {
    txtTotDolar.innerText = `$ ${dolar.toFixed(2)}`;
    txtTotEfecBs.innerText = `Bs. ${efecBs.toFixed(2).replace('.', ',')}`;
    txtTotPunto.innerText = `Bs. ${punto.toFixed(2).replace('.', ',')}`;
    txtTotPMovil.innerText = `Bs. ${pmovil.toFixed(2).replace('.', ',')}`;
    txtTotVentaDia.innerText = `Venta Total: $ ${globalUSD.toFixed(2)}`;
}

document.addEventListener('DOMContentLoaded', inicializarCuadre);

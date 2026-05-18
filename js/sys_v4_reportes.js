/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Consolidado y Reportes Gerenciales (sys_v4_reportes.js)
 * Sincronizado con Cloud Firestore
 */

import { db } from './firebase-config.js'; 
import { 
    collection, onSnapshot, doc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasaActual = 1.00;

// Vinculaciones del DOM
const txtTasa = document.getElementById('txt-tasa');
const txtTotalCosto = document.getElementById('total-costo');
const txtTotalCostoBs = document.getElementById('total-costo-bs');
const txtTotalVenta = document.getElementById('total-venta');
const txtTotalVentaBs = document.getElementById('total-venta-bs');
const txtTotalGanancia = document.getElementById('total-ganancia');
const txtTotalGananciaBs = document.getElementById('total-ganancia-bs');
const txtTotalItems = document.getElementById('total-items');
const txtTotalUnidades = document.getElementById('total-unidades');

// ==========================================
// 1. CARGA DE TASA Y PRODUCTOS
// ==========================================
async function inicializarReportesV4() {
    try {
        // Obtener la tasa configurada
        const tasaSnap = await getDoc(doc(db, "usuarios", USER_ID, "configuracion", "tasa"));
        if (tasaSnap.exists()) {
            tasaActual = parseFloat(tasaSnap.data().valor) || 1.00;
            if (txtTasa) txtTasa.innerText = `Tasa: ${tasaActual.toFixed(2).replace('.', ',')} Bs.`;
        }

        // Escuchar cambios en inventario para el Resumen
        onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
            let inversion = 0;
            let venta = 0;
            let items = 0;
            let unidades = 0;

            snapshot.forEach(doc => {
                const p = doc.data();
                const stock = parseInt(p.stock || 0);
                const costo = parseFloat(p.costo || 0);
                const precio = parseFloat(p.precio || 0);

                if (stock > 0) {
                    inversion += (costo * stock);
                    venta += (precio * stock);
                    unidades += stock;
                }
                items++;
            });

            const ganancia = venta - inversion;
            actualizarInterfaz(inversion, venta, ganancia, items, unidades);
        });

    } catch (e) {
        console.error("Error inicializando reportes:", e);
    }
}

// ==========================================
// 2. ACTUALIZACIÓN DE LA INTERFAZ
// ==========================================
function actualizarInterfaz(inversion, venta, ganancia, items, unidades) {
    // USD
    txtTotalCosto.innerText = `$ ${inversion.toFixed(2)}`;
    txtTotalVenta.innerText = `$ ${venta.toFixed(2)}`;
    txtTotalGanancia.innerText = `$ ${ganancia.toFixed(2)}`;
    txtTotalItems.innerText = items;
    txtTotalUnidades.innerText = `${unidades} Unidades físicas`;

    // BS
    txtTotalCostoBs.innerText = `Bs. ${(inversion * tasaActual).toFixed(2).replace('.', ',')}`;
    txtTotalVentaBs.innerText = `Bs. ${(venta * tasaActual).toFixed(2).replace('.', ',')}`;
    txtTotalGananciaBs.innerText = `Bs. ${(ganancia * tasaActual).toFixed(2).replace('.', ',')}`;
}

document.addEventListener('DOMContentLoaded', inicializarReportesV4);

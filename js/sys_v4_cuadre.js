/**
 * YOU CONTROL - SISTEMATIKOS
 * sys_v4_cuadre.js - Versión corregida para zona horaria y extracción de hora de factura
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id') || "YC-2026-001"; 
const inputFecha = document.getElementById('filtro-fecha');
const tablaCuerpo = document.getElementById('tabla-cuerpo');

let todasLasVentas = []; // Caché local para filtrar al cambiar la fecha sin reabrir listeners

// Función para normalizar cualquier formato de fecha de Firestore a "YYYY-MM-DD" local
function extraerFechaLocal(campoFecha) {
    if (!campoFecha) return "";
    
    let d;
    // Si es un Timestamp de Firebase
    if (typeof campoFecha.toDate === 'function') {
        d = campoFecha.toDate();
    } else {
        // Si es un string o un objeto Date estándar
        d = new Date(campoFecha);
    }

    if (isNaN(d.getTime())) return "";

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Renderizar los datos según la fecha elegida
function procesarYMostrarCuadre(fechaSeleccionada) {
    let t = { usd: 0, efecBs: 0, punto: 0, pmovil: 0, global: 0 };
    tablaCuerpo.innerHTML = "";

    const ventasFiltradas = todasLasVentas.filter(v => v.fechaLocal === fechaSeleccionada);

    ventasFiltradas.forEach(data => {
        const p = data.pagos || {};
        const nombreCliente = data.nombre_cliente || "Anónimo";
        
        // Acumular totales
        t.usd += parseFloat(p.divisas_usd || 0);
        t.efecBs += parseFloat(p.efectivo_bs || 0);
        t.punto += parseFloat(p.punto_bs || 0);
        t.pmovil += parseFloat(p.pago_movil_bs || 0);
        t.global += parseFloat(data.total_usd || 0);

        // Obtener la hora de forma segura (si data.hora no existe, la saca de la fecha)
        let horaFormateada = data.hora;
        if (!horaFormateada || horaFormateada === '--:--') {
            let dTemp;
            if (data.fecha && typeof data.fecha.toDate === 'function') {
                dTemp = data.fecha.toDate();
            } else if (data.fecha) {
                dTemp = new Date(data.fecha);
            }
            
            if (dTemp && !isNaN(dTemp.getTime())) {
                const hh = String(dTemp.getHours()).padStart(2, '0');
                const min = String(dTemp.getMinutes()).padStart(2, '0');
                horaFormateada = `${hh}:${min}`;
            } else {
                horaFormateada = '--:--';
            }
        }

        // Pintar fila en la tabla con la hora corregida
        tablaCuerpo.innerHTML += `<tr>
            <td><strong>${data.nro_factura || '---'}</strong><br><small>${horaFormateada}</small></td>
            <td>${nombreCliente}</td>
            <td>$ ${parseFloat(data.total_usd || 0).toFixed(2)}</td>
            <td style="text-align:right;">Bs. ${(parseFloat(p.efectivo_bs||0) + parseFloat(p.punto_bs||0) + parseFloat(p.pago_movil_bs||0)).toFixed(2)}</td>
        </tr>`;
    });

    if (ventasFiltradas.length === 0) {
        tablaCuerpo.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#64748B;">No hay ventas registradas para la fecha ${fechaSeleccionada}</td></tr>`;
    }

    // Actualizar UI de tarjetas y totales
    document.getElementById('tot-dolar').innerText = `$ ${t.usd.toFixed(2)}`;
    document.getElementById('tot-efec-bs').innerText = `Bs. ${t.efecBs.toFixed(2)}`;
    document.getElementById('tot-punto').innerText = `Bs. ${t.punto.toFixed(2)}`;
    document.getElementById('tot-pmovil').innerText = `Bs. ${t.pmovil.toFixed(2)}`;
    document.getElementById('tot-venta-dia').innerText = `Venta Total: $ ${t.global.toFixed(2)}`;
}

// Inicialización y escucha en tiempo real única
document.addEventListener('DOMContentLoaded', () => {
    // 1. Establecer fecha actual local en el input
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    const fechaHoyStr = `${yyyy}-${mm}-${dd}`;
    
    if (inputFecha) {
        inputFecha.value = fechaHoyStr;
    }

    const colRef = collection(db, "usuarios", USER_ID, "ventas");

    // 2. Escuchar la base de datos una sola vez
    onSnapshot(colRef, (snapshot) => {
        todasLasVentas = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const fechaLocal = extraerFechaLocal(data.fecha);
            todasLasVentas.push({ id: doc.id, fechaLocal, ...data });
        });

        // Procesar con la fecha actual del input
        const fechaActiva = inputFecha ? inputFecha.value : fechaHoyStr;
        procesarYMostrarCuadre(fechaActiva);
    });

    // 3. Evento al cambiar la fecha en el selector
    if (inputFecha) {
        inputFecha.addEventListener('change', (e) => {
            procesarYMostrarCuadre(e.target.value);
        });
    }
});

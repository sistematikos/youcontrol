/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Reporte de Compras (sys_v3_rep_compras.js)
 */

import { db } from './firebase-config.js'; 
import { collection, query, getDocs, orderBy, doc, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- VALIDACIÓN DE SESIÓN ---
const USER_ID = localStorage.getItem('youcontrol_empresa_id');
if (!USER_ID) {
    window.location.href = "index.html"; 
}

// --- VARIABLES GLOBALES ---
window.compraSeleccionadaId = null;
window.compraSeleccionadaData = null;

// --- BUSCAR Y CARGAR REPORTE DE COMPRAS ---
window.cargarReporteCompras = async () => {
    const desde = document.getElementById('filtro-desde').value;
    let hasta = document.getElementById('filtro-hasta').value || desde;
    const tbody = document.getElementById('tabla-reporte-compras');
    
    if (!desde) {
        alert("Por favor selecciona al menos una fecha inicial.");
        return;
    }

    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Buscando documentos de compras...</td></tr>`;

    // Limpiar selección previa
    window.compraSeleccionadaId = null;
    window.compraSeleccionadaData = null;

    try {
        const comprasRef = collection(db, "usuarios", USER_ID, "compras");
        const q = query(comprasRef, orderBy("fecha", "desc"));
        const snapshot = await getDocs(q);

        let totalUSD = 0;
        let cantidadFacturas = 0;
        tbody.innerHTML = "";

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #6b7280; padding: 20px;">No se encontraron registros de compras.</td></tr>`;
            document.getElementById('kpi-total-usd').innerText = "$ 0.00";
            document.getElementById('kpi-total-facturas').innerText = "0";
            return;
        }

        for (const docSnap of snapshot.docs) {
            const c = docSnap.data();
            const id = docSnap.id;

            // Formateo de fecha Timestamp a YYYY-MM-DD
            if (c.fecha && typeof c.fecha.toDate === 'function') {
                const d = c.fecha.toDate();
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const fechaStr = `${yyyy}-${mm}-${dd}`;
                const horaStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                // Filtro por rango de fechas
                if (fechaStr >= desde && fechaStr <= hasta) {
                    cantidadFacturas++;

                    const tr = document.createElement('tr');
                    tr.className = "fila-factura";

                    // Manejo de compras anuladas
                    if (c.anulada === true) {
                        tr.classList.add('fila-anulada');
                        tr.innerHTML = `
                            <td class="text-center"><input type="radio" name="select_compra" class="radio-factura" disabled></td>
                            <td>${fechaStr} <br><small>${horaStr}</small></td>
                            <td><strong>${c.nro_factura || id.slice(0, 6)}</strong></td>
                            <td colspan="3" class="text-center font-bold text-red-600">*** COMPRA ANULADA ***</td>
                        `;
                    } else {
                        const montoCompra = parseFloat(c.total_usd || c.monto || 0);
                        totalUSD += montoCompra;

                        const listaItems = (c.items || c.productos || []).map(p => 
                            `<li>${p.nombre || 'Producto'} (${p.cantidad \vert{}\vert{} 1} x$${parseFloat(p.costo || p.precio || 0).toFixed(2)})</li>`
                        ).join('');

                        tr.innerHTML = `
                            <td class="text-center"><input type="radio" name="select_compra" class="radio-factura" data-id="${id}"></td>
                            <td>${fechaStr} <br><small>${horaStr}</small></td>
                            <td><strong>${c.nro_factura || id.slice(0, 6)}</strong></td>
                            <td>${c.nombre_proveedor || c.proveedor || 'Casual / General'}</td>
                            <td><ul class="lista-productos">${listaItems \vert{}\vert{} '<li>Sin detalle</li>'}</ul></td>                             <td class="text-right"><strong>$${montoCompra.toFixed(2)}</strong></td>
                        `;

                        tr.addEventListener('click', () => {
                            document.querySelectorAll('.fila-factura').forEach(f => f.classList.remove('seleccionada'));
                            document.querySelectorAll('.radio-factura').forEach(r => r.checked = false);

                            tr.classList.add('seleccionada');
                            const radio = tr.querySelector('.radio-factura');
                            if (radio) radio.checked = true;
                            
                            window.compraSeleccionadaId = id;
                            window.compraSeleccionadaData = c;
                        });
                    }

                    tbody.appendChild(tr);
                }
            }
        }

        if (cantidadFacturas === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #6b72

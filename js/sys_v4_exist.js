/**
 * YOU CONTROL - SISTEMATIKOS
 * Controlador de Existencia Valorizada en Tiempo Real (sys_v4_exist.js)
 */

import { db } from './firebase-config.js';
import { 
    collection, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";

// Elementos DOM
const tablaExistencia = document.getElementById('tabla-existencia');
const inputBusqueda = document.getElementById('input-busqueda');

const txtTotCosto = document.getElementById('tot-costo');
const txtTotPvp = document.getElementById('tot-pvp');
const txtTotGanancia = document.getElementById('tot-ganancia');
const txtTotAlertas = document.getElementById('tot-alertas');
const txtTotItemsConteo = document.getElementById('tot-items-conteo');

let arrayProductosGlobal = [];

// ==========================================
// 1. ESCUCHA FIRESTORE EN TIEMPO REAL
// ==========================================
function inicializarExistencia() {
    const colRef = collection(db, "usuarios", USER_ID, "productos");

    onSnapshot(colRef, (snapshot) => {
        arrayProductosGlobal = [];
        
        if (snapshot.empty) {
            tablaExistencia.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No hay productos registrados en la base de datos.</td></tr>`;
            renderizarTotales(0, 0, 0, 0);
            return;
        }

        snapshot.forEach((docSnap) => {
            const p = docSnap.data();
            arrayProductosGlobal.push({
                codigo: p.codigo || "S/C",
                nombre: p.nombre || "Producto sin nombre",
                stock: parseFloat(p.stock || 0),
                stock_min: parseFloat(p.stock_minimo || 2),
                costo: parseFloat(p.precio_costo || 0),
                pvp: parseFloat(p.precio_venta || 0)
            });
        });

        arrayProductosGlobal.sort((a, b) => a.nombre.localeCompare(b.nombre));
        procesarYFiltrarInventario();
    });

    inputBusqueda.addEventListener('input', () => {
        procesarYFiltrarInventario();
    });
}

// ==========================================
// 2. FILTRADO Y RENDERIZACIÓN DINÁMICA
// ==========================================
function procesarYFiltrarInventario() {
    const filtro = inputBusqueda.value.toLowerCase().trim();
    tablaExistencia.innerHTML = "";

    let globalCosto = 0;
    let globalPvp = 0;
    let globalAlertas = 0;

    arrayProductosGlobal.forEach(p => {
        const invTotalItem = p.stock * p.costo;
        globalCosto += invTotalItem;
        globalPvp += (p.stock * p.pvp);

        if (p.stock <= p.stock_min) {
            globalAlertas++;
        }
    });

    const productosFiltrados = arrayProductosGlobal.filter(p => {
        return p.nombre.toLowerCase().includes(filtro) || p.codigo.toLowerCase().includes(filtro);
    });

    txtTotItemsConteo.innerText = `Items: ${productosFiltrados.length}`;

    if (productosFiltrados.length === 0) {
        tablaExistencia.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Ningún ítem coincide con la búsqueda.</td></tr>`;
        renderizarTotales(globalCosto, globalPvp, (globalPvp - globalCosto), globalAlertas);
        return;
    }

    productosFiltrados.forEach(p => {
        const totalInversionItem = p.stock * p.costo;
        
        let badgeEstado = "";
        if (p.stock <= 0) {
            badgeEstado = `<span class="badge-stock stock-empty">Agotado</span>`;
        } else if (p.stock <= p.stock_min) {
            badgeEstado = `<span class="badge-stock stock-low">Stock Bajo</span>`;
        } else {
            badgeEstado = `<span class="badge-stock stock-ok">Disponible</span>`;
        }

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td style="font-family: monospace; font-weight:700; color: var(--text-muted);">${p.codigo}</td>
            <td style="font-weight:600;">${p.nombre}</td>
            <td style="text-align: center; font-weight:700; font-size:0.85rem;">${p.stock}</td>
            <td>$ ${p.costo.toFixed(2)}</td>
            <td>$ ${p.pvp.toFixed(2)}</td>
            <td style="font-weight:700; color: var(--text-dark);">$ ${totalInversionItem.toFixed(2)}</td>
            <td>${badgeEstado}</td>
        `;
        tablaExistencia.appendChild(fila);
    });

    renderizarTotales(globalCosto, globalPvp, (globalPvp - globalCosto), globalAlertas);
}

// ==========================================
// 3. ACTUALIZAR DASHBOARD SUPERIOR
// ==========================================
function renderizarTotales(costo, pvp, ganancia, alertas) {
    txtTotCosto.innerText = `$ ${costo.toFixed(2)}`;
    txtTotPvp.innerText = `$ ${pvp.toFixed(2)}`;
    txtTotGanancia.innerText = `$ ${ganancia.toFixed(2)}`;
    txtTotAlertas.innerText = alertas;
}

document.addEventListener('DOMContentLoaded', inicializarExistencia);

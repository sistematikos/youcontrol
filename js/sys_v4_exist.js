/**
 * YOU CONTROL - SISTEMATIKOS
 * Controlador de Existencia Valorizada (sys_v4_exist.js)
 * Sincronizado con la nueva estructura visual 2026
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');

// Elementos DOM
const tablaExistencia = document.getElementById('tabla-existencia');
const inputBusqueda = document.getElementById('input-busqueda');

// IDs de las tarjetas (KPIs)
const txtTotCosto = document.getElementById('tot-costo');
const txtTotPvp = document.getElementById('tot-pvp');
const txtTotGanancia = document.getElementById('tot-ganancia');
const txtTotAlertas = document.getElementById('tot-alertas');

let arrayProductosGlobal = [];

// 1. ESCUCHA FIRESTORE
function inicializarExistencia() {
    if (!USER_ID) return;
    const colRef = collection(db, "usuarios", USER_ID, "productos");

    onSnapshot(colRef, (snapshot) => {
        arrayProductosGlobal = [];
        
        snapshot.forEach((docSnap) => {
            const p = docSnap.data();
            arrayProductosGlobal.push({
                codigo: p.sku || p.barras || "S/C",
                nombre: p.nombre || "Producto sin descripción",
                stock: parseInt(p.stock || 0),
                stock_min: 3,
                costo: parseFloat(p.costo || 0),
                pvp: parseFloat(p.precio || 0)
            });
        });

        arrayProductosGlobal.sort((a, b) => a.nombre.localeCompare(b.nombre));
        procesarYFiltrarInventario();
    });

    inputBusqueda.addEventListener('input', procesarYFiltrarInventario);
}

// ... (mantiene tu código anterior hasta la función procesarYFiltrarInventario)

// 2. FILTRADO Y RENDERIZACIÓN (MODIFICADO)
function procesarYFiltrarInventario() {
    const filtro = inputBusqueda.value.toLowerCase().trim();
    tablaExistencia.innerHTML = "";

    // Filtramos el array primero
    const productosFiltrados = arrayProductosGlobal.filter(p => 
        p.nombre.toLowerCase().includes(filtro) || p.codigo.toLowerCase().includes(filtro)
    );

    // Reiniciamos contadores para el resultado del filtro
    let filtroCosto = 0;
    let filtroPvp = 0;
    let filtroAlertas = 0;

    if (productosFiltrados.length === 0) {
        tablaExistencia.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:20px;">No se encontraron productos.</td></tr>`;
    } else {
        productosFiltrados.forEach(p => {
            // Cálculos basados en el filtro activo
            const totalInversionItem = p.stock * p.costo;
            filtroCosto += totalInversionItem;
            filtroPvp += (p.stock * p.pvp);
            if (p.stock <= p.stock_min) filtroAlertas++;

            let badgeEstado = p.stock <= 0 ? `<span class="badge-stock stock-empty">Agotado</span>` : 
                              p.stock <= p.stock_min ? `<span class="badge-stock stock-low">Stock Bajo</span>` : 
                              `<span class="badge-stock stock-ok">Disponible</span>`;

            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td style="font-family: monospace; font-weight:700;">${p.codigo}</td>
                <td style="font-weight:600;">${p.nombre}</td>
                <td class="text-center" style="font-weight:700;">${p.stock}</td>
                <td>$ ${p.costo.toFixed(2)}</td>
                <td>$ ${p.pvp.toFixed(2)}</td>
                <td style="font-weight:700;">$ ${totalInversionItem.toFixed(2)}</td>
                <td>${badgeEstado}</td>
            `;
            tablaExistencia.appendChild(fila);
        });
    }

    // Actualizar las tarjetas con los valores calculados del FILTRO
    txtTotCosto.innerText = `$ ${filtroCosto.toFixed(2)}`;
    txtTotPvp.innerText = `$ ${filtroPvp.toFixed(2)}`;
    txtTotGanancia.innerText = `$ ${(filtroPvp - filtroCosto).toFixed(2)}`;
    txtTotAlertas.innerText = filtroAlertas;
}

// 3. EVENTOS ADICIONALES (Para mejorar la experiencia)
// Detectar cuando el usuario presiona "Enter" o borra el campo
inputBusqueda.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') {
        inputBusqueda.value = "";
        procesarYFiltrarInventario();
    }
});

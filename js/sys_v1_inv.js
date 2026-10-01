import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Obtener dinámicamente el ID de la empresa activa desde el navegador
const USER_ID = localStorage.getItem('youcontrol_empresa_id');

if (!USER_ID) {
    alert("Sesión no encontrada o expirada. Inicie sesión nuevamente.");
    window.location.href = 'index.html';
}

const cuerpoTabla = document.getElementById('cuerpo-tabla');
const filtroDepto = document.getElementById('filtro-depto');
const buscadorInv = document.getElementById('buscador-inv');

const mapaDeptos = {};
let tasaBCV = 1.00;

// Helper para prevenir inyecciones de HTML / XSS
const escapeHTML = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// --- FUNCIÓN UNIFICADA DE FILTRADO (Buscador + Departamento) ---
function aplicarFiltros() {
    const valorDepto = filtroDepto ? filtroDepto.value.trim().toLowerCase() : 'todos';
    const termBuscador = buscadorInv ? buscadorInv.value.trim().toLowerCase() : '';

    document.querySelectorAll('#cuerpo-tabla tr').forEach(tr => {
        if (tr.dataset.noData) return;

        const deptoFila = (tr.dataset.deptoId || "").trim().toLowerCase();
        const textoFila = tr.innerText.toLowerCase();

        const coincideDepto = (valorDepto === "todos" || deptoFila === valorDepto);
        const coincideTexto = textoFila.includes(termBuscador);

        tr.style.display = (coincideDepto && coincideTexto) ? '' : 'none';
    });
}

// Escuchadores de eventos para los filtros
if (filtroDepto) {
    filtroDepto.addEventListener('change', aplicarFiltros);
}
window.filtrarPorDepto = aplicarFiltros;

if (buscadorInv) {
    buscadorInv.addEventListener('input', aplicarFiltros);
}

// --- INICIALIZACIÓN ---
async function init() {
    try {
        // 1. Escuchar la tasa BCV en tiempo real
        onSnapshot(doc(db, "usuarios", USER_ID), (docSnap) => {
            if (docSnap.exists()) {
                tasaBCV = parseFloat(docSnap.data().tasa_bcv) || 1.00;
                recalcularPreciosBs();
            }
        });

        // 2. Cargar Departamentos
        const deptoSnap = await getDocs(collection(db, "usuarios", USER_ID, "departamentos"));
        
        if (filtroDepto) {
            filtroDepto.innerHTML = `<option value="todos">TODOS LOS DEPARTAMENTOS</option>`;
            deptoSnap.forEach(d => {
                const dataDepto = d.data();
                const nombre = dataDepto.nombre || dataDepto.descripcion || 'Sin nombre';
                mapaDeptos[d.id] = nombre;
                filtroDepto.innerHTML += `<option value="${escapeHTML(d.id)}">${escapeHTML(nombre.toUpperCase())}</option>`;
            });
        }

        // 3. Cargar Productos en tiempo real
        onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
            cuerpoTabla.innerHTML = "";
            
            if (snap.empty) {
                cuerpoTabla.innerHTML = `<tr data-no-data="true"><td colspan="7" style="text-align:center; color:#64748B;">No hay productos registrados.</td></tr>`;
                return;
            }

            snap.forEach(d => {
                const p = d.data();
                const precioUSD = parseFloat(p.precio || 0);
                const costoUSD = parseFloat(p.costo || 0);
                const precioBs = (precioUSD * tasaBCV).toFixed(2);
                const deptoId = p.departamento || '';
                const nombreDeptoMostrado = mapaDeptos[deptoId] || 'GENERAL';

                // Obtener el código o SKU disponible
                const codigoProd = p.sku || p.codigo || p.barras || 'S/C';

                const tr = document.createElement('tr');
                tr.dataset.deptoId = deptoId;
                tr.dataset.precioUsd = precioUSD;
                
                // Renderizado completo de las 7 columnas
                tr.innerHTML = `
                    <td><b>${escapeHTML(codigoProd)}</b></td>
                    <td>${escapeHTML(p.nombre || p.descripcion || 'Sin nombre')}</td>
                    <td>${escapeHTML(nombreDeptoMostrado)}</td>
                    <td>$${costoUSD.toFixed(2)}</td>
                    <td style="color: #6366f1; font-weight: bold;">${parseFloat(p.ganancia || p.porcentaje || 0)}%</td>
                    <td class="col-precio">$${precioUSD.toFixed(2)} / <b class="val-bs">${precioBs} Bs</b></td>
                    <td style="font-weight: 600;">${parseInt(p.stock || 0, 10)}</td>
                `;
                cuerpoTabla.appendChild(tr);
            });

            aplicarFiltros();
        }, (error) => {
            console.error("Error al escuchar productos:", error);
        });

    } catch (error) {
        console.error("Error al inicializar inventario:", error);
    }
}

// Recalcular precios en bolívares si cambia la tasa sin recargar la página
function recalcularPreciosBs() {
    document.querySelectorAll('#cuerpo-tabla tr').forEach(tr => {
        if (tr.dataset.precioUsd) {
            const precioUSD = parseFloat(tr.dataset.precioUsd);
            const precioBs = (precioUSD * tasaBCV).toFixed(2);
            const elemBs = tr.querySelector('.val-bs');
            if (elemBs) elemBs.textContent = `${precioBs} Bs`;
        }
    });
}

document.addEventListener('DOMContentLoaded', init);

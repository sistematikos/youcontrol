import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Obtener dinámicamente el ID de la empresa activa desde el navegador
const USER_ID = localStorage.getItem('youcontrol_empresa_id');

if (!USER_ID) {
    alert("Sesión no encontrada o expirada. Inicie sesión nuevamente.");
    window.location.href = 'index.html';
}

const cuerpoTabla = document.getElementById('cuerpo-tabla');
const filtroDepto = document.getElementById('filtro-depto');
const buscadorInv = document.getElementById('buscador-inv');

const mapaDeptos = {}; // Relación ID -> Nombre
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
    const valorDeptoSeleccionado = filtroDepto ? filtroDepto.value.trim().toLowerCase() : 'todos';
    const termBuscador = buscadorInv ? buscadorInv.value.trim().toLowerCase() : '';

    document.querySelectorAll('#cuerpo-tabla tr').forEach(tr => {
        if (tr.dataset.noData) return;

        const deptoIdFila = (tr.dataset.deptoId || "").trim().toLowerCase();
        const deptoNombreFila = (tr.dataset.deptoNombre || "").trim().toLowerCase();
        const textoFila = tr.innerText.toLowerCase();

        // Validar coincidencia de departamento de forma flexible (por ID o por Nombre exacto)
        let coincideDepto = false;
        if (valorDeptoSeleccionado === "todos" || valorDeptoSeleccionado === "todos los departamentos") {
            coincideDepto = true;
        } else {
            coincideDepto = (deptoIdFila === valorDeptoSeleccionado || deptoNombreFila === valorDeptoSeleccionado);
        }

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

        // 2. Cargar Departamentos y poblar el select unificando valores y nombres
        const deptoSnap = await getDocs(collection(db, "usuarios", USER_ID, "departamentos"));
        
        if (filtroDepto) {
            filtroDepto.innerHTML = `<option value="TODOS">TODOS LOS DEPARTAMENTOS</option>`;
            deptoSnap.forEach(d => {
                const dataDepto = d.data();
                const nombre = dataDepto.nombre || dataDepto.descripcion || 'Sin nombre';
                const idDepto = d.id;

                mapaDeptos[idDepto] = nombre;
                // Guardamos también el nombre en minúsculas en el mapa para búsqueda inversa
                mapaDeptos[nombre.trim().toLowerCase()] = nombre;

                // Usamos el nombre del departamento en minúsculas como value para que coincida con cómo se guarda en los productos/combos
                filtroDepto.innerHTML += `<option value="${escapeHTML(nombre.trim().toLowerCase())}">${escapeHTML(nombre.toUpperCase())}</option>`;
            });
        }

        // 3. Cargar Productos y Combos desde la colección "productos" en tiempo real
        onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snap) => {
            cuerpoTabla.innerHTML = "";
            
            if (snap.empty) {
                cuerpoTabla.innerHTML = `<tr data-no-data="true"><td colspan="7" style="text-align:center; color:#64748B;">No hay productos ni combos registrados.</td></tr>`;
                return;
            }

            snap.forEach(d => {
                const p = d.data();
                const precioUSD = parseFloat(p.precio || p.precioVenta || 0);
                const costoUSD = parseFloat(p.costo || p.costoTotal || 0);
                const precioBs = (precioUSD * tasaBCV).toFixed(2);
                
                // Obtener el departamento (puede venir como texto directo o ID)
                let deptoGuardado = p.departamento || p.depto || '';
                let nombreDeptoMostrado = mapaDeptos[deptoGuardado] || deptoGuardado || 'GENERAL';

                // Detectar si es un combo (por el campo es_combo == true o por tener componentes)
                const esCombo = p.es_combo === true || (Array.isArray(p.componentes) && p.componentes.length > 0);

                // Obtener el código o SKU disponible
                const codigoProd = p.sku || p.codigo || p.barras || 'S/C';
                const nombreProd = p.nombre || p.descripcion || 'Sin nombre';

                const tr = document.createElement('tr');
                tr.dataset.deptoId = deptoGuardado.trim().toLowerCase();
                tr.dataset.deptoNombre = nombreDeptoMostrado.trim().toLowerCase();
                tr.dataset.precioUsd = precioUSD;
                
                // Renderizado de la fila con etiqueta distintiva si es combo
                tr.innerHTML = `
                    <td><b>${escapeHTML(codigoProd)}</b></td>
                    <td>
                        ${escapeHTML(nombreProd)}
                        ${esCombo ? '<span style="background: #e0edff; color: #0055ff; font-size: 9px; padding: 2px 6px; border-radius: 6px; font-weight: bold; margin-left: 5px;">COMBO</span>' : ''}
                    </td>
                    <td>${escapeHTML(nombreDeptoMostrado)}</td>
                    <td>$${costoUSD.toFixed(2)}</td>
                    <td style="color: #6366f1; font-weight: bold;">${esCombo ? '-' : (parseFloat(p.ganancia || p.porcentaje || 0) + '%')}</td>
                    <td class="col-precio">$${precioUSD.toFixed(2)} / <b class="val-bs">${precioBs} Bs</b></td>
                    <td style="font-weight: 600;">${parseInt(p.stock || 0, 10)}</td>
                `;
                cuerpoTabla.appendChild(tr);
            });

            aplicarFiltros();
        }, (error) => {
            console.error("Error al escuchar productos y combos:", error);
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

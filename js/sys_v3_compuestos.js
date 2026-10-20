/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Productos Compuestos / Combos (sys_v3_compuestos.js)
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
if (!USER_ID) window.location.href = "index.html";

window.productosIndividuales = [];
window.departamentosMaster = [];
window.componentesCombo = [];
window.combosCreadosMaster = [];

// Helper para formatear decimales limpios
function formatearCantidad(num) {
    const val = parseFloat(num) || 0;
    return Number.isInteger(val) ? val.toString() : parseFloat(val.toFixed(4)).toString();
}

// 1. Cargar Departamentos para el selector
function cargarDepartamentos() {
    const depRef = collection(db, "usuarios", USER_ID, "departamentos");
    onSnapshot(depRef, (snapshot) => {
        window.departamentosMaster = [];
        snapshot.forEach(docSnap => {
            window.departamentosMaster.push({ id: docSnap.id, ...docSnap.data() });
        });
        poblarSelectDepartamentos();
    });
}

function poblarSelectDepartamentos() {
    const select = document.getElementById('combo-departamento');
    if (!select) return;

    if (window.departamentosMaster.length === 0) {
        select.innerHTML = '<option value="GENERAL">GENERAL</option>';
        return;
    }

    const valorActual = select.value;
    select.innerHTML = '<option value="">-- Seleccionar Departamento --</option>';
    window.departamentosMaster.forEach(d => {
        const option = document.createElement('option');
        const nombreDep = d.nombre || d.id;
        option.value = nombreDep;
        option.textContent = nombreDep.toUpperCase();
        select.appendChild(option);
    });
    if (valorActual) select.value = valorActual;
}

// 2. Cargar productos individuales para el selector de componentes
function cargarProductosIndividuales() {
    const productosRef = collection(db, "usuarios", USER_ID, "productos");
    onSnapshot(productosRef, (snapshot) => {
        window.productosIndividuales = [];
        window.combosCreadosMaster = [];

        snapshot.forEach(docSnap => {
            const prod = { id: docSnap.id, ...docSnap.data() };
            // Identificación robusta de combos o productos compuestos
            if (prod.es_combo === true || prod.tipo === "combo" || Array.isArray(prod.componentes)) {
                window.combosCreadosMaster.push(prod);
            } else {
                window.productosIndividuales.push(prod);
            }
        });

        poblarSelectProductos();
        renderizarTablaCombosCreados();
    });
}

function poblarSelectProductos() {
    const select = document.getElementById('select-componente');
    if (!select) return;

    const valorPrevio = select.value;
    select.innerHTML = '<option value="">-- Seleccionar Producto Individual --</option>';
    window.productosIndividuales.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.nombre || p.id} (Stock: ${formatearCantidad(p.stock || 0)} | Costo: $${(p.costo || 0).toFixed(2)})`;
        select.appendChild(option);
    });
    if (valorPrevio) select.value = valorPrevio;
}

// 3. Agregar componente a la lista temporal (SOPORTA DECIMALES)
window.agregarComponente = () => {
    const select = document.getElementById('select-componente');
    const inputCant = document.getElementById('cant-componente');
    
    const prodId = select?.value;
    const cantidad = parseFloat(inputCant?.value) || 0;

    if (!prodId || cantidad <= 0) {
        alert("⚠️ Selecciona un producto e ingresa una cantidad válida mayor a 0.");
        return;
    }

    const prodObj = window.productosIndividuales.find(p => p.id === prodId);
    if (!prodObj) return;

    const existe = window.componentesCombo.find(c => c.producto_id === prodId);
    if (existe) {
        existe.cantidad = parseFloat((existe.cantidad + cantidad).toFixed(4));
    } else {
        window.componentesCombo.push({
            producto_id: prodObj.id,
            sku: prodObj.sku || prodObj.id,
            nombre: prodObj.nombre || 'Sin Nombre',
            costo: Number(prodObj.costo || 0),
            cantidad: cantidad
        });
    }

    renderizarTablaComponentes();
    select.value = '';
    inputCant.value = '1';
};

function renderizarTablaComponentes() {
    const tbody = document.getElementById('tabla-componentes-combo');
    const txtCostoTotal = document.getElementById('costo-total-combo');
    if (!tbody) return;

    if (window.componentesCombo.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94A3B8; padding: 20px;">No hay productos agregados al combo actualmente.</td></tr>`;
        if (txtCostoTotal) txtCostoTotal.innerText = "$0.00";
        return;
    }

    let costoTotalCalculado = 0;
    tbody.innerHTML = window.componentesCombo.map((item, index) => {
        const subtotalCosto = item.cantidad * item.costo;
        costoTotalCalculado += subtotalCosto;
        return `
            <tr class="border-b border-slate-100">
                <td class="p-3"><strong>${item.sku}</strong></td>
                <td class="p-3">${item.nombre}</td>
                <td class="p-3 font-semibold text-sky-700">${formatearCantidad(item.cantidad)}</td>
                <td class="p-3">$${item.costo.toFixed(2)}</td>
                <td class="p-3 text-center">
                    <button type="button" onclick="window.eliminarComponente(${index})" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (txtCostoTotal) txtCostoTotal.innerText = `$${costoTotalCalculado.toFixed(2)}`;
}

window.eliminarComponente = (index) => {
    window.componentesCombo.splice(index, 1);
    renderizarTablaComponentes();
};

// 4. Guardar / Editar Combo con validación estricta
window.guardarCombo = async () => {
    const codigoInput = document.getElementById('combo-codigo');
    const nombreInput = document.getElementById('combo-nombre');
    const precioInput = document.getElementById('combo-precio');
    const depInput = document.getElementById('combo-departamento');

    const codigo = codigoInput?.value.trim().toUpperCase();
    const nombre = nombreInput?.value.trim().toUpperCase();
    const precio = parseFloat(precioInput?.value) || 0;
    const departamento = depInput?.value.trim().toUpperCase() || "GENERAL";

    if (!codigo || !nombre || isNaN(precio) || precio <= 0) {
        alert("⚠️ Ingresa un código SKU, un nombre descriptivo y un precio de venta válido mayor a 0.");
        return;
    }

    if (!window.componentesCombo || window.componentesCombo.length === 0) {
        alert("⚠️ El combo debe incluir al menos un producto componente.");
        return;
    }

    try {
        const fechaVenezuela = new Date().toLocaleString("en-US", { timeZone: "America/Caracas" });
        const costoTotalCombo = window.componentesCombo.reduce((sum, item) => sum + (item.cantidad * item.costo), 0);

        const datosCombo = {
            codigo,
            sku: codigo,
            nombre,
            precio,
            costo: Number(costoTotalCombo.toFixed(4)),
            departamento,
            tipo: "combo",
            es_combo: true,
            componentes: window.componentesCombo,
            updatedAt: fechaVenezuela
        };

        console.log("Guardando combo en Firestore:", datosCombo);

        await setDoc(doc(db, "usuarios", USER_ID, "productos", codigo), datosCombo, { merge: true });

        alert("✅ ¡Producto Compuesto / Combo guardado con éxito!");
        window.limpiarFormularioCombo();

    } catch (error) {
        console.error("Error crítico al guardar combo en Firestore:", error);
        alert("❌ Error al guardar en la base de datos: " + error.message);
    }
};

window.limpiarFormularioCombo = () => {
    const codigoInput = document.getElementById('combo-codigo');
    const nombreInput = document.getElementById('combo-nombre');
    const precioInput = document.getElementById('combo-precio');
    const depInput = document.getElementById('combo-departamento');

    if (codigoInput) { codigoInput.value = ''; codigoInput.readOnly = false; }
    if (nombreInput) nombreInput.value = '';
    if (precioInput) precioInput.value = '';
    if (depInput) depInput.value = '';
    
    window.componentesCombo = [];
    renderizarTablaComponentes();
};

// 5. Cargar Combo para Edición
window.cargarComboParaEditar = (codigoCombo) => {
    const combo = window.combosCreadosMaster.find(c => c.id === codigoCombo || c.codigo === codigoCombo);
    if (!combo) return;

    const codigoInput = document.getElementById('combo-codigo');
    const nombreInput = document.getElementById('combo-nombre');
    const precioInput = document.getElementById('combo-precio');
    const depInput = document.getElementById('combo-departamento');

    if (codigoInput) {
        codigoInput.value = combo.codigo || combo.id;
        codigoInput.readOnly = true; // Bloqueado para mantener la clave primaria
    }
    if (nombreInput) nombreInput.value = combo.nombre || '';
    if (precioInput) precioInput.value = combo.precio || '';
    if (depInput) depInput.value = combo.departamento || '';

    window.componentesCombo = Array.isArray(combo.componentes) ? JSON.parse(JSON.stringify(combo.componentes)) : [];
    renderizarTablaComponentes();

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 6. Eliminar Combo
window.eliminarCombo = async (codigoCombo) => {
    if (!confirm(`¿Está seguro de eliminar el combo con código "${codigoCombo}"?`)) return;

    try {
        await deleteDoc(doc(db, "usuarios", USER_ID, "productos", codigoCombo));
        alert("✅ Combo eliminado con éxito.");
    } catch (err) {
        console.error("Error al eliminar combo:", err);
        alert("❌ Error al eliminar: " + err.message);
    }
};

// 7. Renderizar Tabla de Combos Creados
function renderizarTablaCombosCreados() {
    const tbody = document.getElementById('tabla-combos-creados');
    if (!tbody) return;

    if (window.combosCreadosMaster.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-400">No hay productos compuestos creados aún.</td></tr>`;
        return;
    }

    tbody.innerHTML = window.combosCreadosMaster.map(c => {
        const componentesStr = Array.isArray(c.componentes) 
            ? c.componentes.map(i => `${i.nombre} (x${formatearCantidad(i.cantidad)})`).join(', ')
            : 'Sin componentes';

        return `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-3 font-mono font-bold text-sky-700">${c.codigo || c.id}</td>
                <td class="p-3 font-semibold text-slate-800">${c.nombre}</td>
                <td class="p-3 text-slate-600">${c.departamento || 'GENERAL'}</td>
                <td class="p-3 text-xs text-slate-500 max-w-xs truncate" title="${componentesStr}">${componentesStr}</td>
                <td class="p-3 font-bold text-emerald-600">$${(c.precio || 0).toFixed(2)}</td>
                <td class="p-3 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                        <button type="button" onclick="window.cargarComboParaEditar('${c.codigo || c.id}')" class="bg-amber-500 text-white p-1.5 rounded-lg text-xs hover:bg-amber-600 transition" title="Editar Combo">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" onclick="window.eliminarCombo('${c.codigo || c.id}')" class="bg-red-500 text-white p-1.5 rounded-lg text-xs hover:bg-red-600 transition" title="Eliminar Combo">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    cargarDepartamentos();
    cargarProductosIndividuales();
});

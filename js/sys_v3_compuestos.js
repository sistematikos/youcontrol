/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Productos Compuestos / Combos (sys_v3_compuestos.js)
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
if (!USER_ID) window.location.href = "index.html";

window.productosIndividuales = [];
window.componentesCombo = [];

// 1. Cargar productos individuales desde Firestore para el selector de componentes
function cargarProductosIndividuales() {
    const productosRef = collection(db, "usuarios", USER_ID, "productos");
    onSnapshot(productosRef, (snapshot) => {
        window.productosIndividuales = [];
        snapshot.forEach(docSnap => {
            const prod = { id: docSnap.id, ...docSnap.data() };
            // Filtrar solo productos individuales simples (no combos)
            if (!prod.es_combo) {
                window.productosIndividuales.push(prod);
            }
        });
        poblarSelectProductos();
    });
}

function poblarSelectProductos() {
    const select = document.getElementById('select-componente');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccionar Producto Individual --</option>';
    window.productosIndividuales.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = `${p.nombre || p.id} (Stock: ${p.stock || 0} | Costo: $${(p.costo || 0).toFixed(2)})`;
        select.appendChild(option);
    });
}

// 2. Agregar componente a la lista temporal del combo
window.agregarComponente = () => {
    const select = document.getElementById('select-componente');
    const inputCant = document.getElementById('cant-componente');
    
    const prodId = select?.value;
    const cantidad = parseInt(inputCant?.value) || 0;

    if (!prodId || cantidad <= 0) {
        alert("⚠️ Selecciona un producto e ingresa una cantidad mayor a 0.");
        return;
    }

    const prodObj = window.productosIndividuales.find(p => p.id === prodId);
    if (!prodObj) return;

    // Verificar si ya está agregado para acumular cantidad
    const existe = window.componentesCombo.find(c => c.producto_id === prodId);
    if (existe) {
        existe.cantidad += cantidad;
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
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94A3B8; padding: 10px;">No hay productos agregados al combo.</td></tr>`;
        if (txtCostoTotal) txtCostoTotal.innerText = "$0.00";
        return;
    }

    let costoTotalCalculado = 0;
    tbody.innerHTML = window.componentesCombo.map((item, index) => {
        const subtotalCosto = item.cantidad * item.costo;
        costoTotalCalculado += subtotalCosto;
        return `
            <tr>
                <td><strong>${item.sku}</strong></td>
                <td>${item.nombre}</td>
                <td>${item.cantidad}</td>
                <td>$${item.costo.toFixed(2)}</td>
                <td style="text-align: center;">
                    <button type="button" onclick="window.eliminarComponente(${index})" style="background: var(--rose); color: white; border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer;">
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

// 3. Guardar el Combo en Firestore
window.guardarCombo = async () => {
    const codigoInput = document.getElementById('combo-codigo');
    const nombreInput = document.getElementById('combo-nombre');
    const precioInput = document.getElementById('combo-precio');

    const codigo = codigoInput?.value.trim().toUpperCase();
    const nombre = nombreInput?.value.trim().toUpperCase();
    const precio = parseFloat(precioInput?.value) || 0;

    if (!codigo || !nombre || precio <= 0) {
        alert("⚠️ Ingresa un código, nombre y precio de venta válido.");
        return;
    }

    if (window.componentesCombo.length === 0) {
        alert("⚠️ El combo debe incluir al menos un producto individual.");
        return;
    }

    try {
        const fechaVenezuela = new Date().toLocaleString("en-US", { timeZone: "America/Caracas" });
        const costoTotalCombo = window.componentesCombo.reduce((sum, item) => sum + (item.cantidad * item.costo), 0);

        await setDoc(doc(db, "usuarios", USER_ID, "productos", codigo), {
            codigo,
            sku: codigo,
            nombre,
            precio,
            costo: costoTotalCombo,
            tipo: "combo",
            es_combo: true,
            componentes: window.componentesCombo,
            updatedAt: fechaVenezuela
        }, { merge: true });

        alert("✅ ¡Producto Compuesto / Combo guardado con éxito!");
        
        // Limpieza
        codigoInput.value = '';
        nombreInput.value = '';
        precioInput.value = '';
        window.componentesCombo = [];
        renderizarTablaComponentes();

    } catch (error) {
        console.error("Error al guardar combo:", error);
        alert("❌ Error al guardar en Firestore: " + error.message);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    cargarProductosIndividuales();
});

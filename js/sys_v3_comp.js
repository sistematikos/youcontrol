/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo de Compras e Inventario (sys_v3_comp.js) - Solo Productos Existentes
 */

import { db } from './firebase-config.js'; 
import { collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- VALIDACIÓN DE SESIÓN ---
const USER_ID = localStorage.getItem('youcontrol_empresa_id');
if (!USER_ID) {
    window.location.href = "index.html"; 
}

// --- VARIABLES GLOBALES ---
window.USER_ID = USER_ID;
window.productosLocales = [];
window.proveedoresLocales = [];
window.listaIngreso = [];
window.tasaActual = 1.0;
window.proveedorSeleccionado = null;

// --- CARGA DE CONFIGURACIÓN Y TASA ---
async function cargarConfiguracionGlobal() {
    try {
        const userDocRef = doc(db, "usuarios", USER_ID);
        const snapConfig = await getDoc(userDocRef);
        if (snapConfig.exists()) {
            const data = snapConfig.data();
            window.tasaActual = data.tasa_bcv || 1.0;
        }
    } catch (e) {
        console.error("Error al cargar configuración:", e);
    }
}

// --- ESCUCHA DE PROVEEDORES Y POBLACIÓN DEL SELECT ---
function inicializarProveedores() {
    const proveedoresRef = collection(db, "usuarios", USER_ID, "proveedores");
    onSnapshot(proveedoresRef, (snapshot) => {
        window.proveedoresLocales = [];
        const selectProv = document.getElementById('comp-proveedor');
        if (!selectProv) return;

        selectProv.innerHTML = '<option value="">-- Casual / General --</option>';

        snapshot.forEach(docSnap => {
            const provData = { id: docSnap.id, ...docSnap.data() };
            window.proveedoresLocales.push(provData);

            const option = document.createElement('option');
            option.value = provData.id;
            option.textContent = provData.nombre || provData.razon_social || provData.id;
            selectProv.appendChild(option);
        });
    });
}

// --- SELECCIÓN DE PROVEEDOR Y MOSTRAR INFO ---
window.seleccionarProveedor = (id) => {
    const infoBox = document.getElementById('info-proveedor');
    const txtRif = document.getElementById('prov-info-rif');
    const txtContacto = document.getElementById('prov-info-contacto');

    if (!id) {
        window.proveedorSeleccionado = null;
        if (infoBox) infoBox.style.display = 'none';
        return;
    }

    const prov = window.proveedoresLocales.find(p => p.id === id);
    if (prov) {
        window.proveedorSeleccionado = prov;
        if (txtRif) txtRif.innerText = prov.rif || prov.id || '-';
        if (txtContacto) txtContacto.innerText = prov.telefono || prov.contacto || '-';
        if (infoBox) infoBox.style.display = 'block';
    }
};

// --- ESCUCHA DE PRODUCTOS Y BUSCADOR DINÁMICO ---
function inicializarProductos() {
    const productosRef = collection(db, "usuarios", USER_ID, "productos");
    onSnapshot(productosRef, (snapshot) => {
        window.productosLocales = [];
        snapshot.forEach(docSnap => {
            window.productosLocales.push({ id: docSnap.id, ...docSnap.data() });
        });
    });
}

function initBuscadorDinamico() {
    const inputBuscador = document.getElementById('buscador-dinamico');
    const dropdown = document.getElementById('dropdown-resultados');
    const avisoNoReg = document.getElementById('aviso-no-registrado');

    inputBuscador?.addEventListener('input', (e) => {
        const texto = e.target.value.trim().toLowerCase();
        if (!dropdown) return;

        if (texto === "") {
            dropdown.style.display = 'none';
            if (avisoNoReg) avisoNoReg.style.display = 'none';
            return;
        }

        const coindicencias = window.productosLocales.filter(p => 
            (p.id || '').toLowerCase().includes(texto) ||
            (p.sku || '').toLowerCase().includes(texto) ||
            (p.barras || '').toLowerCase().includes(texto) ||
            (p.nombre || '').toLowerCase().includes(texto)
        );

        if (coindicencias.length > 0) {
            dropdown.style.display = 'block';
            if (avisoNoReg) avisoNoReg.style.display = 'none';
            dropdown.innerHTML = coindicencias.map(p => `
                <div style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border); font-size: 0.8rem;" 
                     onclick="window.cargarDatosProducto('${p.id}')">
                    <strong>${p.nombre}</strong> <br>
                    <small style="color: #64748B;">SKU: ${p.sku || p.id} | Stock Actual: ${p.stock || 0}</small>
                </div>
            `).join('');
        } else {
            dropdown.style.display = 'none';
            if (avisoNoReg) avisoNoReg.style.display = 'block';
        }
    });
}

window.cargarDatosProducto = (id) => {
    const prod = window.productosLocales.find(p => p.id === id);
    if (!prod) return;

    document.getElementById('comp-sku').value = prod.sku || prod.id || '';
    document.getElementById('comp-barras').value = prod.barras || '';
    document.getElementById('comp-nombre').value = prod.nombre || '';
    document.getElementById('comp-costo').value = prod.costo || 0.00;
    document.getElementById('comp-precio').value = prod.precio || 0.00;
    
    const costo = parseFloat(prod.costo) || 0;
    const precio = parseFloat(prod.precio) || 0;
    if (costo > 0 && precio > 0) {
        const ganancia = ((precio - costo) / costo) * 100;
        document.getElementById('comp-ganancia').value = ganancia.toFixed(0);
    }

    calcularPrecioBs();

    const dropdown = document.getElementById('dropdown-resultados');
    if (dropdown) dropdown.style.display = 'none';
    const inputBuscador = document.getElementById('buscador-dinamico');
    if (inputBuscador) inputBuscador.value = '';
};

// --- CÁLCULOS DE PRECIO Y GANANCIA ---
function initCalculosPrecios() {
    const inputCosto = document.getElementById('comp-costo');
    const inputGanancia = document.getElementById('comp-ganancia');
    const inputPrecio = document.getElementById('comp-precio');

    const recalcular = () => {
        const costo = parseFloat(inputCosto.value) || 0;
        const ganancia = parseFloat(inputGanancia.value) || 0;
        
        if (costo > 0) {
            const precioSugerido = costo + (costo * (ganancia / 100));
            inputPrecio.value = precioSugerido.toFixed(2);
        }
        calcularPrecioBs();
    };

    inputCosto?.addEventListener('input', recalcular);
    inputGanancia?.addEventListener('input', recalcular);
    inputPrecio?.addEventListener('input', calcularPrecioBs);
}

function calcularPrecioBs() {
    const precioUsd = parseFloat(document.getElementById('comp-precio')?.value) || 0;
    const precioBsInput = document.getElementById('comp-precio-bs');
    if (precioBsInput) {
        const totalBs = precioUsd * window.tasaActual;
        precioBsInput.value = `${totalBs.toLocaleString('es-VE', {minimumFractionDigits: 2})} Bs.`;
    }
}

// --- AGREGAR A LA TABLA LISTA DE INGRESO (VALIDANDO EXISTENCIA) ---
window.agregarALista = () => {
    const skuField = document.getElementById('comp-sku');
    const cantidadField = document.getElementById('comp-cantidad');

    const sku = skuField ? skuField.value.trim().toUpperCase() : '';
    const cantidad = parseInt(cantidadField?.value) || 0;
    const costo = parseFloat(document.getElementById('comp-costo')?.value) || 0;
    const precio = parseFloat(document.getElementById('comp-precio')?.value) || 0;

    if (!sku || cantidad <= 0) {
        return alert("Por favor seleccione un producto válido y una cantidad mayor a 0.");
    }

    // VALIDACIÓN ESTRICTA: El producto DEBE existir en la ficha de productos
    const prodExistente = window.productosLocales.find(p => p.id === sku || p.sku === sku);
    if (!prodExistente) {
        return alert(`❌ El producto con SKU/Código "${sku}" no se encuentra registrado en la ficha de productos terminados. Debe crearlo primero en el inventario.`);
    }

    window.listaIngreso.push({
        idFirestore: prodExistente.id, // Guardamos el ID exacto del documento
        sku: prodExistente.sku || sku,
        barras: prodExistente.barras || '',
        nombre: prodExistente.nombre || 'Sin Nombre',
        cantidad, 
        costo, 
        precio,
        subtotalCosto: cantidad * costo
    });

    renderizarTablaLista();
    limpiarFormularioProducto();
};

function renderizarTablaLista() {
    const tbody = document.getElementById('tabla-items-compra');
    const txtTotal = document.getElementById('total-compra-monto');
    if (!tbody) return;

    if (window.listaIngreso.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94A3B8; padding: 15px;">No hay productos agregados a la lista.</td></tr>`;
        if (txtTotal) txtTotal.innerText = "$0.00";
        return;
    }

    let totalAcumulado = 0;
    tbody.innerHTML = window.listaIngreso.map((item, index) => {
        totalAcumulado += item.subtotalCosto;
        return `
            <tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 8px;"><strong>${item.sku}</strong></td>
                <td>${item.nombre}</td>
                <td>${item.cantidad}</td>
                <td>$${item.costo.toFixed(2)}</td>
                <td>$${item.precio.toFixed(2)}</td>
                <td style="text-align: center;">
                    <button type="button" style="background: var(--rose); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;" onclick="window.eliminarDeLista(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    if (txtTotal) txtTotal.innerText = `$${totalAcumulado.toFixed(2)}`;
}

window.eliminarDeLista = (index) => {
    window.listaIngreso.splice(index, 1);
    renderizarTablaLista();
};

function limpiarFormularioProducto() {
    document.getElementById('comp-sku').value = '';
    document.getElementById('comp-barras').value = '';
    document.getElementById('comp-nombre').value = '';
    document.getElementById('comp-cantidad').value = '1';
    document.getElementById('comp-costo').value = '0.00';
    document.getElementById('comp-ganancia').value = '0';
    document.getElementById('comp-precio').value = '0.00';
    document.getElementById('comp-precio-bs').value = '';
}

// --- GUARDAR Y PROCESAR COMPRA EN FIRESTORE (SOLO ACTUALIZACIÓN) ---
window.procesarIngresoMercancia = async () => {
    if (window.listaIngreso.length === 0) {
        return alert("La lista de mercancía está vacía.");
    }

    try {
        const provSelect = document.getElementById('comp-proveedor');
        const provId = provSelect?.value || "Casual";
        const provNombre = window.proveedorSeleccionado ? (window.proveedorSeleccionado.nombre || window.proveedorSeleccionado.razon_social) : "Casual / General";

        const totalCompraUSD = window.listaIngreso.reduce((sum, item) => sum + item.subtotalCosto, 0);

        // 1. Crear Registro de la Entrada de Compra (Historial)
        const entradaData = {
            proveedor_id: provId,
            nombre_proveedor: provNombre,
            items: window.listaIngreso,
            total_usd: totalCompraUSD,
            tasa_aplicada: window.tasaActual,
            fecha: serverTimestamp()
        };

        await addDoc(collection(db, "usuarios", USER_ID, "compras"), entradaData);

        // 2. Actualizar el Stock y Precios de los Productos Existentes
        for (const item of window.listaIngreso) {
            const prodRef = doc(db, "usuarios", USER_ID, "productos", item.idFirestore);
            await updateDoc(prodRef, {
                stock: increment(item.cantidad),
                costo: item.costo,
                precio: item.precio
            });
        }

        alert("✅ Entrada de mercancía procesada y stock de productos actualizado con éxito.");

        window.listaIngreso = [];
        renderizarTablaLista();
        if (provSelect) provSelect.value = '';
        window.seleccionarProveedor('');

    } catch (error) {
        console.error("Error al guardar mercancía:", error);
        alert("Error al procesar: " + error.message);
    }
};

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    await cargarConfiguracionGlobal();
    inicializarProveedores();
    inicializarProductos();
    initBuscadorDinamico();
    initCalculosPrecios();
});

/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo: Operaciones de Inventario (sys_v3_op-inv.html)
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id'); 

let productosLocales = [];
let listaTemporal = []; 

// Vinculación DOM basada en sys_v3_op-inv.html
const tipoOperacion = document.getElementById('tipo-operacion');
const buscador = document.getElementById('buscador-dinamico');
const dropdown = document.getElementById('dropdown-resultados');
const aviso = document.getElementById('aviso-no-registrado');

const inputSku = document.getElementById('inv-sku');
const inputBarras = document.getElementById('inv-barras');
const inputNombre = document.getElementById('inv-nombre');
const inputStockActual = document.getElementById('inv-stock-actual');
const inputCantidad = document.getElementById('inv-cantidad');

// 1. CARGA DE PRODUCTOS DESDE FIRESTORE EN TIEMPO REAL
function cargarProductos() {
    if (!USER_ID) {
        console.warn("No se encontró el ID de empresa registrado.");
        return;
    }
    try {
        onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
            productosLocales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
    } catch (e) { 
        console.error("Error al cargar productos:", e); 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();

    // Evento al presionar ENTER en el campo de cantidad para anexar directamente
    if (inputCantidad) {
        inputCantidad.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                window.agregarALista();
            }
        });
    }
});

// 2. BUSCADOR EN TIEMPO REAL
if (buscador) {
    buscador.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        if (!val) { 
            dropdown.style.display = 'none'; 
            aviso.style.display = 'none'; 
            return; 
        }
        
        const filtrados = productosLocales.filter(p => 
            (p.sku && String(p.sku).toLowerCase().includes(val)) || 
            (p.barras && String(p.barras).toLowerCase().includes(val)) || 
            (p.nombre && String(p.nombre).toLowerCase().includes(val))
        );
        
        if (filtrados.length > 0) {
            aviso.style.display = 'none';
            dropdown.innerHTML = filtrados.map(p => `
                <div class="search-item" style="padding:10px; cursor:pointer; border-bottom:1px solid #eee; background:white;" 
                     onclick="window.seleccionar('${p.sku}')">
                    <strong>${p.nombre}</strong><br>
                    <small>SKU: ${p.sku} | Stock Actual: ${p.stock || 0}</small>
                </div>
            `).join('');
            dropdown.style.display = 'block';
        } else {
            dropdown.style.display = 'none';
            aviso.style.display = 'block'; 
        }
    });

    // Búsqueda directa por escáner / Enter
    buscador.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const criterio = buscador.value.trim();
            const prod = productosLocales.find(p => p.sku === criterio || p.barras === criterio);
            
            if (prod) {
                aviso.style.display = 'none';
                window.seleccionar(prod.sku);
            } else {
                aviso.style.display = 'block';
                limpiarFormulario();
            }
        }
    });
}

// 3. SELECCIÓN DE PRODUCTO
window.seleccionar = (sku) => {
    const prod = productosLocales.find(p => p.sku === sku);
    if (prod) {
        inputSku.value = prod.sku;
        inputBarras.value = prod.barras || '';
        inputNombre.value = prod.nombre;
        inputStockActual.value = parseInt(prod.stock) || 0;
        inputCantidad.value = '';
        
        if (aviso) aviso.style.display = 'none';
        if (dropdown) dropdown.style.display = 'none';
        if (buscador) buscador.value = '';
        
        inputCantidad.focus();
    }
};

// 4. ANEXAR A LA LISTA TEMPORAL
window.agregarALista = () => {
    const sku = inputSku.value;
    const nombre = inputNombre.value;
    const cantidadModificar = parseInt(inputCantidad.value) || 0;
    const stockActual = parseInt(inputStockActual.value) || 0;
    const operacion = tipoOperacion.value; // 'carga' o 'descarga'

    if (!sku || !nombre) {
        return alert("Por favor busque y seleccione un producto primero.");
    }
    if (cantidadModificar <= 0) {
        return alert("Ingrese una cantidad válida a modificar.");
    }

    if (operacion === 'descarga' && cantidadModificar > stockActual) {
        if (!confirm(`La cantidad a descargar (${cantidadModificar}) supera el stock actual (${stockActual}). ¿Desea continuar?`)) {
            return;
        }
    }

    const nuevoStock = operacion === 'carga' 
        ? stockActual + cantidadModificar 
        : stockActual - cantidadModificar;

    const idx = listaTemporal.findIndex(item => item.sku === sku);
    if (idx !== -1) {
        listaTemporal[idx].cantidadModificar = cantidadModificar;
        listaTemporal[idx].operacion = operacion;
        listaTemporal[idx].nuevoStock = nuevoStock;
    } else {
        listaTemporal.push({
            sku,
            barras: inputBarras.value,
            nombre,
            stockActual,
            cantidadModificar,
            operacion,
            nuevoStock
        });
    }

    renderizarTabla();
    limpiarFormulario();
};

function renderizarTabla() {
    const tbody = document.getElementById('tabla-items-operacion');
    if (!tbody) return;

    tbody.innerHTML = listaTemporal.map((item, i) => {
        const esCarga = item.operacion === 'carga';
        const badgeStyle = esCarga 
            ? 'background-color: #d4edda; color: #155724; font-weight: bold;' 
            : 'background-color: #f8d7da; color: #721c24; font-weight: bold;';
        const signo = esCarga ? '+' : '-';

        return `
            <tr>
                <td>${item.sku}</td>
                <td>${item.nombre}</td>
                <td style="text-align: center;">${item.stockActual}</td>
                <td style="text-align: center; ${badgeStyle}">
                    ${item.operacion.toUpperCase()} (${signo}${item.cantidadModificar})
                </td>
                <td style="text-align: center;"><strong>${item.nuevoStock}</strong></td>
                <td style="text-align: center;">
                    <button class="btn btn-sm btn-danger" onclick="window.eliminarDeLista(${i})">X</button>
                </td>
            </tr>
        `;
    }).join('');
}

window.eliminarDeLista = (index) => {
    listaTemporal.splice(index, 1);
    renderizarTabla();
};

// 5. GUARDAR CAMBIOS MASIVOS EN FIRESTORE
window.procesarOperacionInventario = async () => {
    if (listaTemporal.length === 0) {
        return alert("La lista de productos a modificar está vacía.");
    }

    try {
        for (const item of listaTemporal) {
            const prodActual = productosLocales.find(p => p.sku === item.sku);
            const stockBase = parseInt(prodActual?.stock) || 0;

            const stockFinal = item.operacion === 'carga' 
                ? stockBase + item.cantidadModificar 
                : stockBase - item.cantidadModificar;

            await setDoc(doc(db, "usuarios", USER_ID, "productos", item.sku), {
                stock: stockFinal
            }, { merge: true });
        }

        alert("Operación procesada y stock actualizado con éxito.");
        listaTemporal = [];
        renderizarTabla();
        limpiarFormulario();
    } catch (error) {
        console.error("Error al procesar el inventario:", error);
        alert("Ocurrió un error al actualizar los datos en la base de datos.");
    }
};

function limpiarFormulario() {
    if (inputSku) inputSku.value = ''; 
    if (inputBarras) inputBarras.value = '';
    if (inputNombre) inputNombre.value = ''; 
    if (inputStockActual) inputStockActual.value = '0';
    if (inputCantidad) inputCantidad.value = '';
    if (buscador) {
        buscador.value = '';
        buscador.focus();
    }
}

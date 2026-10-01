/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo: Operaciones de Inventario (sys_v3_op-inv.js)
 */

import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id'); 

let productosLocales = [];
let listaTemporal = []; 

// Referencias DOM
const tipoOperacion = document.getElementById('tipo-operacion');
const buscador = document.getElementById('buscador-dinamico');
const dropdown = document.getElementById('dropdown-resultados');
const aviso = document.getElementById('aviso-no-registrado');

const inputSku = document.getElementById('inv-sku');
const inputBarras = document.getElementById('inv-barras');
const inputNombre = document.getElementById('inv-nombre');
const inputStockActual = document.getElementById('inv-stock-actual');
const inputCantidad = document.getElementById('inv-cantidad');

const normalizar = (texto) => String(texto || '').trim().toLowerCase();

// 1. CARGA EN TIEMPO REAL (Mismo esquema que Ventas)
function cargarProductos() {
    if (!USER_ID) {
        console.warn("No se encontró el ID de empresa registrado.");
        return;
    }
    try {
        onSnapshot(collection(db, "usuarios", USER_ID, "productos"), (snapshot) => {
            productosLocales = snapshot.docs.map(doc => ({ 
                id: doc.id, // Ejemplo: "ACE-01", "ANI-01"
                ...doc.data() 
            }));
            console.log("✅ Productos cargados en Operaciones:", productosLocales.length);
        });
    } catch (e) { 
        console.error("Error al cargar productos:", e); 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();

    if (inputCantidad) {
        inputCantidad.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                window.agregarALista();
            }
        });
    }
});

// 2. BUSCADOR EN TIEMPO REAL (Lógica calcada del Módulo Ventas)
if (buscador) {
    buscador.addEventListener('input', (e) => {
        const criterio = normalizar(e.target.value);
        
        if (!criterio) { 
            if (dropdown) dropdown.style.display = 'none'; 
            if (aviso) aviso.style.display = 'none'; 
            return; 
        }
        
        // Búsqueda idéntica al módulo de ventas
        const filtrados = productosLocales.filter(p => 
            normalizar(p.id).includes(criterio) || 
            normalizar(p.nombre || p.descripcion).includes(criterio) || 
            normalizar(p.barras || p.codigoBarras).includes(criterio)
        );
        
        if (filtrados.length > 0) {
            if (aviso) aviso.style.display = 'none';
            if (dropdown) {
                dropdown.innerHTML = ''; // Limpiamos desplegable

                filtrados.slice(0, 10).forEach(p => {
                    const codigoMostrar = p.id || p.sku || 'S/C';
                    const nombreMostrar = p.nombre || p.descripcion || 'Sin Nombre';
                    
                    const item = document.createElement('div');
                    item.className = 'search-item';
                    item.style.cssText = 'padding:10px; cursor:pointer; border-bottom:1px solid #eee; background:white;';
                    item.innerHTML = `
                        <strong>${nombreMostrar}</strong><br>
                        <small>CÓDIGO: ${codigoMostrar} | Stock Actual: ${p.stock ?? 0}</small>
                    `;
                    
                    // Asignación limpia del evento de selección
                    item.addEventListener('click', () => {
                        seleccionarProducto(p);
                    });

                    dropdown.appendChild(item);
                });

                dropdown.style.display = 'block';
            }
        } else {
            if (dropdown) dropdown.style.display = 'none';
            if (aviso) aviso.style.display = 'block'; 
        }
    });

    // Enter / Escáner de código de barras
    buscador.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const criterio = normalizar(buscador.value);
            
            const prod = productosLocales.find(p => 
                normalizar(p.id) === criterio || 
                normalizar(p.barras || p.codigoBarras) === criterio
            );
            
            if (prod) {
                if (aviso) aviso.style.display = 'none';
                seleccionarProducto(prod);
            } else {
                if (aviso) aviso.style.display = 'block';
                limpiarFormulario();
            }
        }
    });
}

// 3. SELECCIÓN DE PRODUCTO
function seleccionarProducto(prod) {
    if (inputSku) {
        inputSku.value = prod.id || prod.sku || '';
        inputSku.dataset.docId = prod.id;
    }
    if (inputBarras) inputBarras.value = prod.barras || prod.codigoBarras || '';
    if (inputNombre) inputNombre.value = prod.nombre || prod.descripcion || '';
    if (inputStockActual) inputStockActual.value = parseInt(prod.stock, 10) || 0;
    
    if (inputCantidad) {
        inputCantidad.value = '';
        inputCantidad.focus();
    }
    
    if (aviso) aviso.style.display = 'none';
    if (dropdown) dropdown.style.display = 'none';
    if (buscador) buscador.value = '';
}

window.seleccionar = (docId) => {
    const prod = productosLocales.find(p => p.id === docId);
    if (prod) seleccionarProducto(prod);
};

// 4. AGREGAR A LISTA TEMPORAL
window.agregarALista = () => {
    const docId = inputSku ? inputSku.dataset.docId : null;
    const sku = inputSku ? inputSku.value : '';
    const nombre = inputNombre ? inputNombre.value : '';
    const cantidadModificar = parseInt(inputCantidad ? inputCantidad.value : 0, 10) || 0;
    const stockActual = parseInt(inputStockActual ? inputStockActual.value : 0, 10) || 0;
    const operacion = tipoOperacion ? tipoOperacion.value : 'carga';

    if (!docId || !nombre) {
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

    const idx = listaTemporal.findIndex(item => item.docId === docId);
    if (idx !== -1) {
        listaTemporal[idx].cantidadModificar = cantidadModificar;
        listaTemporal[idx].operacion = operacion;
        listaTemporal[idx].nuevoStock = nuevoStock;
    } else {
        listaTemporal.push({
            docId,
            sku,
            barras: inputBarras ? inputBarras.value : '',
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
                <td>${item.sku || 'S/C'}</td>
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

// 5. PROCESAR Y ACTUALIZAR EN FIRESTORE
window.procesarOperacionInventario = async () => {
    if (!USER_ID) {
        return alert("Error de sesión. No se puede actualizar el inventario.");
    }
    if (listaTemporal.length === 0) {
        return alert("La lista de productos a modificar está vacía.");
    }

    try {
        for (const item of listaTemporal) {
            const prodActual = productosLocales.find(p => p.id === item.docId);
            const stockBase = parseInt(prodActual?.stock || 0, 10);

            const stockFinal = item.operacion === 'carga' 
                ? stockBase + item.cantidadModificar 
                : stockBase - item.cantidadModificar;

            await setDoc(doc(db, "usuarios", USER_ID, "productos", item.docId), {
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
    if (inputSku) {
        inputSku.value = ''; 
        delete inputSku.dataset.docId;
    }
    if (inputBarras) inputBarras.value = '';
    if (inputNombre) inputNombre.value = ''; 
    if (inputStockActual) inputStockActual.value = '0';
    if (inputCantidad) inputCantidad.value = '';
    if (buscador) {
        buscador.value = '';
        buscador.focus();
    }
}

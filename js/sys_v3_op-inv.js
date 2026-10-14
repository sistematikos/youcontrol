/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo: Operaciones de Inventario por Lotes / Múltiples Ítems (00001 correlativo)
 */

import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc, Timestamp, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const USER_ID = localStorage.getItem('youcontrol_empresa_id');
let listaProductosGlobal = [];
window.listaMovimientoLote = [];
let productoSeleccionado = null;
let indiceRes = -1;

async function iniciarOperacionesInventario() {
    if (!USER_ID) {
        console.warn("No se encontró el ID de empresa en localStorage.");
        return;
    }

    try {
        const snapProds = await getDocs(collection(db, "usuarios", USER_ID, "productos"));
        listaProductosGlobal = snapProds.docs.map(d => ({ id: d.id, ...d.data() }));
        console.log("Productos cargados:", listaProductosGlobal.length);
    } catch (e) {
        console.error("Error al cargar productos:", e);
    }
}

// Buscador dinámico
const buscador = document.getElementById('buscador-prod-inv');
if (buscador) {
    buscador.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase().trim();
        const lista = document.getElementById('lista-resultados-inv');
        indiceRes = -1;

        if (term.length < 1) { 
            lista.style.display = 'none'; 
            return; 
        }

        const filtrados = listaProductosGlobal.filter(p => 
            (p.nombre?.toLowerCase().includes(term) || 
             p.sku?.toLowerCase().includes(term) || 
             p.barras?.toLowerCase().includes(term))
        );

        if (filtrados.length > 0) {
            lista.style.display = 'block';
            lista.innerHTML = filtrados.map((p) => `
                <div class="item-res-inv" onclick="window.cargarProductoInv('${p.id}')">
                    <strong>${p.nombre || 'Sin nombre'}</strong><br>
                    <small>SKU: ${p.sku || p.id} | Stock Actual: ${p.stock ?? 0}</small>
                </div>
            `).join('');
        } else {
            lista.style.display = 'block';
            lista.innerHTML = `<div style="padding:10px; color:#94A3B8;"><small>No hay coincidencias</small></div>`;
        }
    });

    // Permitir tabular o presionar Enter en el buscador
    buscador.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const term = buscador.value.trim().toLowerCase();
            const encontrado = listaProductosGlobal.find(p => p.sku?.toLowerCase() === term || p.barras?.toLowerCase() === term || p.nombre?.toLowerCase().includes(term));
            if (encontrado) {
                window.cargarProductoInv(encontrado.id);
            }
        }
    });
}

window.cargarProductoInv = (id) => {
    const p = listaProductosGlobal.find(x => x.id === id);
    if (!p) return;

    productoSeleccionado = p;

    document.getElementById('inv-sku').value = p.sku || p.id || "";
    document.getElementById('inv-nombre').value = p.nombre || "";
    document.getElementById('inv-stock-actual').value = p.stock !== undefined ? p.stock : 0;
    document.getElementById('buscador-prod-inv').value = p.nombre || "";

    const lista = document.getElementById('lista-resultados-inv');
    if (lista) lista.style.display = 'none';

    document.getElementById('inv-cantidad').focus();
    document.getElementById('inv-cantidad').select();
};

window.agregarAListaInv = () => {
    if (!productoSeleccionado) {
        alert("Por favor seleccione un producto del buscador.");
        return;
    }

    const cantidadInput = document.getElementById('inv-cantidad').value;
    const cantidad = parseFloat(cantidadInput);

    if (isNaN(cantidad) || cantidad <= 0) {
        alert("Ingrese una cantidad válida mayor a 0.");
        return;
    }

    // Verificar si el producto ya existe en el lote actual para acumular la cantidad o agregarlo como nueva línea
    const indexExistente = window.listaMovimientoLote.findIndex(item => item.idFirestore === productoSeleccionado.id);
    
    if (indexExistente >= 0) {
        window.listaMovimientoLote[indexExistente].cantidad += cantidad;
    } else {
        window.listaMovimientoLote.push({
            idFirestore: productoSeleccionado.id,
            sku: productoSeleccionado.sku || productoSeleccionado.id,
            nombre: productoSeleccionado.nombre || 'Sin nombre',
            stockActual: parseInt(productoSeleccionado.stock || 0),
            cantidad: cantidad
        });
    }

    renderizarTablaLote();
    limpiarFormularioItem();
};

function renderizarTablaLote() {
    const tbody = document.getElementById('tabla-items-movimiento');
    const txtTotalItems = document.getElementById('total-items-lote');
    if (!tbody) return;

    if (window.listaMovimientoLote.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94A3B8; padding: 15px;">No hay productos agregados a la lista.</td></tr>`;
        if (txtTotalItems) txtTotalItems.innerText = "0";
        return;
    }

    tbody.innerHTML = window.listaMovimientoLote.map((item, index) => `
        <tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 8px;"><strong>${item.sku}</strong></td>
            <td>${item.nombre}</td>
            <td>${item.stockActual}</td>
            <td><strong>${item.cantidad}</strong></td>
            <td style="text-align: center;">
                <button type="button" style="background: #F43F5E; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;" onclick="window.eliminarItemLote(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    if (txtTotalItems) txtTotalItems.innerText = window.listaMovimientoLote.length;
}

window.eliminarItemLote = (index) => {
    window.listaMovimientoLote.splice(index, 1);
    renderizarTablaLote();
};

function limpiarFormularioItem() {
    productoSeleccionado = null;
    document.getElementById('inv-sku').value = "";
    document.getElementById('inv-nombre').value = "";
    document.getElementById('inv-stock-actual').value = "0";
    document.getElementById('inv-cantidad').value = "1";
    document.getElementById('buscador-prod-inv').value = "";
    document.getElementById('buscador-prod-inv').focus();
}

async function obtenerSiguienteNroMovimiento() {
    try {
        const movRef = collection(db, "usuarios", USER_ID, "mov_inventario");
        const q = query(movRef, orderBy("correlativo", "desc"), limit(1));
        const querySnapshot = await getDocs(q);

        let siguienteNum = 1;
        if (!querySnapshot.empty) {
            const ultimoDoc = querySnapshot.docs[0].data();
            if (ultimoDoc.correlativo) {
                siguienteNum = Number(ultimoDoc.correlativo) + 1;
            }
        }
        return siguienteNum;
    } catch (e) {
        return 1;
    }
}

window.procesarMovimientoLote = async function() {
    if (window.listaMovimientoLote.length === 0) {
        alert("La lista de artículos está vacía.");
        return;
    }

    const tipoOp = document.getElementById('inv-tipo-op').value;
    const concepto = document.getElementById('inv-concepto').value.trim() || 'Movimiento de inventario por lote';

    try {
        const correlativoNum = await obtenerSiguienteNroMovimiento();
        const nroMovimientoStr = String(correlativoNum).padStart(5, '0');

        let itemsProcesados = [];

        for (const item of window.listaMovimientoLote) {
            let nuevoStock = item.stockActual;
            if (tipoOp === 'ENTRADA') nuevoStock += item.cantidad;
            else if (tipoOp === 'SALIDA') nuevoStock -= item.cantidad;
            else if (tipoOp === 'AJUSTE') nuevoStock = item.cantidad;

            // Actualizar stock en la colección de productos
            await setDoc(doc(db, "usuarios", USER_ID, "productos", item.idFirestore), {
                stock: parseInt(nuevoStock)
            }, { merge: true });

            itemsProcesados.push({
                producto_id: item.idFirestore,
                sku: item.sku,
                nombre_producto: item.nombre,
                stock_anterior: item.stockActual,
                stock_nuevo: parseInt(nuevoStock),
                cantidad: item.cantidad
            });
        }

        // Guardar documento consolidado en mov_inventario con ID correlativo
        const documentoLote = {
            correlativo: correlativoNum,
            nro_movimiento: nroMovimientoStr,
            tipo_operacion: tipoOp,
            concepto: concepto,
            items: itemsProcesados,
            total_items: itemsProcesados.length,
            fecha: Timestamp.now()
        };

        const docMovRef = doc(db, "usuarios", USER_ID, "mov_inventario", nroMovimientoStr);
        await setDoc(docMovRef, documentoLote);

        alert(`✅ Movimiento por lote procesado con éxito.\nNro. de Documento: ${nroMovimientoStr}`);

        // Limpieza general
        window.listaMovimientoLote = [];
        document.getElementById('inv-concepto').value = "";
        renderizarTablaLote();
        iniciarOperacionesInventario();

    } catch (e) {
        alert("Error al procesar el movimiento: " + e.message);
    }
};

// Atajo global F9
document.addEventListener('keydown', (e) => {
    if (e.key === 'F9') {
        e.preventDefault();
        window.procesarMovimientoLote();
    }
});

document.addEventListener('DOMContentLoaded', iniciarOperacionesInventario);

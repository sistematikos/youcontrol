/**
 * YOU CONTROL - SISTEMATIKOS
 * Módulo Helper para Gestión de Productos Compuestos / Combos en el POS (pos-core-compuestos.js)
 */

import { doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Valida si hay stock suficiente en Firestore para todos los componentes de un combo antes de agregarlo o facturarlo.
 * @param {Object} combo - Objeto producto de tipo combo (contiene propiedad componentes[])
 * @param {number} cantidadDeseada - Cantidad de combos que se van a vender
 * @param {Array} productosList - Arreglo local con la lista de productos cargada en memoria
 * @returns {Object} { valido: boolean, mensaje: string }
 */
export function validarStockCombo(combo, cantidadDeseada, productosList) {
    if (!combo.es_combo || !Array.isArray(combo.componentes)) {
        return { valido: true, mensaje: "" };
    }

    for (const comp of combo.componentes) {
        const insumo = productosList.find(p => p.id === comp.producto_id);
        const cantRequerida = (comp.cantidad || 1) * cantidadDeseada;

        if (!insumo) {
            return {
                valido: false,
                mensaje: `El insumo [${comp.nombre || comp.sku}] del combo no está registrado en el inventario.`
            };
        }

        const stockDisponible = Number(insumo.stock || 0);
        if (stockDisponible < cantRequerida) {
            return {
                valido: false,
                mensaje: `Stock insuficiente del insumo "${insumo.nombre}". Requiere ${cantRequerida} unidades y hay ${stockDisponible} en existencia.`
            };
        }
    }

    return { valido: true, mensaje: "" };
}

/**
 * Descuenta en Firestore el stock individual de cada insumo que conforma el combo al registrar la venta.
 * @param {Object} db - Instancia de Firestore
 * @param {string} userId - ID de la empresa / licencia
 * @param {Object} itemVendido - Ítem del carrito correspondiente al combo
 */
export async function descontarStockInsumosCombo(db, userId, itemVendido) {
    if (!itemVendido.es_combo || !Array.isArray(itemVendido.componentes)) return;

    const promesasDescuento = itemVendido.componentes.map(async (comp) => {
        const cantidadTotalDescuento = (comp.cantidad || 1) * (itemVendido.cantidad || 1);
        const refInsumo = doc(db, "usuarios", userId, "productos", comp.producto_id);

        await updateDoc(refInsumo, {
            stock: increment(-cantidadTotalDescuento)
        });
    });

    await Promise.all(promesasDescuento);
}

// js/pos-core-dev.js
import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Registra una devolución y ajusta el inventario.
 * @param {string} ventaID - ID del documento original en Firestore.
 * @param {Array} itemsDevueltos - Array de objetos { id: string, cantidad: number, nombre: string }.
 * @param {string} motivo - Razón de la devolución.
 */
export async function registrarDevolucion(ventaID, itemsDevueltos, motivo) {
    const USER_ID = localStorage.getItem('youcontrol_empresa_id');
    
    try {
        // 1. Guardar la Nota de Crédito en la colección 'devoluciones'
        await addDoc(collection(db, "usuarios", USER_ID, "devoluciones"), {
            venta_original_id: ventaID,
            items: itemsDevueltos,
            motivo: motivo,
            fecha: serverTimestamp(),
            estado: "procesado"
        });

        // 2. Actualizar inventario de forma atómica
        // Usamos un bucle para procesar cada producto devuelto
        for (const item of itemsDevueltos) {
            const prodRef = doc(db, "usuarios", USER_ID, "productos", item.id);
            
            // Incrementamos el stock con el valor de la devolución
            await updateDoc(prodRef, {
                stock: increment(item.cantidad)
            });
        }

        return { success: true, message: "Devolución procesada y stock actualizado." };
        
    } catch (error) {
        console.error("Error en módulo de devoluciones:", error);
        throw new Error("No se pudo procesar la devolución: " + error.message);
    }
}

import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function registrarDevolucion(ventaID, itemsDevueltos, motivo) {
    const USER_ID = localStorage.getItem('youcontrol_empresa_id');
    
    // 1. Crear el documento de devolución
    await addDoc(collection(db, "usuarios", USER_ID, "devoluciones"), {
        venta_original_id: ventaID,
        items: itemsDevueltos,
        motivo: motivo,
        fecha: serverTimestamp(),
        estado: "procesado"
    });

    // 2. Actualizar stock de cada producto
    for (const item of itemsDevueltos) {
        // Asegúrate de que el ID en 'item.id' coincida con el documento en 'productos'
        const prodRef = doc(db, "usuarios", USER_ID, "productos", item.id);
        await updateDoc(prodRef, {
            stock: increment(item.cantidad)
        });
    }
}

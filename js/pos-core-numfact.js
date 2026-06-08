import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';

export async function obtenerUltimoNumero(userId) {
    try {
        const ventasRef = collection(db, "usuarios", userId, "ventas");
        // Ordenamos por nro_factura descendente para obtener el mayor
        const q = query(ventasRef, orderBy("nro_factura", "desc"), limit(1));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            const data = snap.docs[0].data();
            // Convertimos a entero, sumamos 1 y devolvemos con formato 00000X
            const ultimoNro = parseInt(data.nro_factura, 10);
            return (ultimoNro + 1).toString().padStart(6, '0');
        }
        return "000001"; // Si no hay facturas, empezamos en 000001
    } catch (e) {
        console.error("Error al obtener el número de factura:", e);
        // Si hay error de índice, la consola mostrará un link para crearlo
        return "000001"; 
    }
}

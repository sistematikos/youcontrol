import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';

export async function obtenerUltimoNumero(userId) {
    try {
        const ventasRef = collection(db, "usuarios", userId, "ventas");
        
        // 1. Ordenamos por nro_factura para obtener el mayor
        const q = query(ventasRef, orderBy("nro_factura", "desc"), limit(1));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            const data = snap.docs[0].data();
            // Aseguramos convertir el string "000001" a número (1)
            const ultimoNro = parseInt(data.nro_factura, 10) || 0;
            // Sumamos 1 y volvemos a formatear a 6 dígitos
            return (ultimoNro + 1).toString().padStart(6, '0');
        }
        
        // Si no hay documentos, devolvemos el primero
        return "000001";
    } catch (e) {
        console.error("Error al obtener número:", e);
        return "000001";
    }
}

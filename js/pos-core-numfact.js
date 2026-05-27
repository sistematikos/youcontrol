import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';

export async function obtenerUltimoNumero(userId) {
    try {
        const ventasRef = collection(db, "usuarios", userId, "ventas");
        const q = query(ventasRef, orderBy("fecha", "desc"), limit(1));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            const ultimoNro = parseInt(snap.docs[0].data().nro_factura) || 0;
            return (ultimoNro + 1).toString().padStart(6, '0');
        }
        return "000001";
    } catch (e) {
        console.error("Error al obtener número:", e);
        return "000001";
    }
}

// En tu archivo pos-core-numfact.js
export async function obtenerUltimoNumero(userId) {
    try {
        const ventasRef = collection(db, "usuarios", userId, "ventas");
        const q = query(ventasRef, orderBy("fecha", "desc"), limit(1));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            const data = snap.docs[0].data();
            // Aseguramos que tomamos el valor y lo convertimos a número limpio
            const ultimoNro = parseInt(data.nro_factura, 10) || 0;
            return (ultimoNro + 1).toString().padStart(6, '0');
        }
        return "000001";
    } catch (e) {
        console.error("Error al obtener número:", e);
        return "000001";
    }
}

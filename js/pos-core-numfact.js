export async function obtenerUltimoNumero(userId) {
    try {
        const ventasRef = collection(db, "usuarios", userId, "ventas");
        // Ordenamos por nro_factura descendentemente para traer el más alto
        const q = query(ventasRef, orderBy("nro_factura", "desc"), limit(1));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            const data = snap.docs[0].data();
            // Convertimos el string "000001" a número (1)
            const ultimoNro = parseInt(data.nro_factura, 10); 
            
            // Si la conversión falla (es NaN), volvemos a 0
            const numeroSiguiente = (isNaN(ultimoNro) ? 0 : ultimoNro) + 1;
            
            // Retornamos formateado a 6 dígitos (ej: 000002)
            return numeroSiguiente.toString().padStart(6, '0');
        }
        return "000001"; // Caso inicial si no hay ventas
    } catch (e) {
        console.error("Error al obtener número:", e);
        return "000001";
    }
}

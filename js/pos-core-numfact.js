import { doc, getDoc, runTransaction, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';

export async function obtenerSiguienteNumero(userId) {
    const contadorRef = doc(db, "usuarios", userId, "config", "contador_facturas");
    
    try {
        const nuevoNro = await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(contadorRef);
            
            if (!sfDoc.exists()) {
                // Si es la primera vez, inicializamos en 1
                transaction.set(contadorRef, { ultimo: 1 });
                return 1;
            }
            
            const nuevoValor = sfDoc.data().ultimo + 1;
            transaction.update(contadorRef, { ultimo: nuevoValor });
            return nuevoValor;
        });
        
        return nuevoNro.toString().padStart(6, '0');
    } catch (e) {
        console.error("Error al obtener contador:", e);
        return "000001"; // Fallback
    }
}

import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, addDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const UID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
export let tasaActual = 0;
export let productosMaster = [];

// Tasa en tiempo real
onSnapshot(doc(db, "usuarios", UID, "configuracion", "tasa"), (s) => {
    if (s.exists()) {
        tasaActual = s.data().valor;
        document.getElementById('txt-tasa').innerText = tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 });
        document.dispatchEvent(new CustomEvent('tasaActualizada'));
    }
});

// Productos en tiempo real
onSnapshot(collection(db, "usuarios", UID, "productos"), (s) => {
    productosMaster = [];
    s.forEach(d => productosMaster.push({ id: d.id, ...d.data() }));
    document.dispatchEvent(new CustomEvent('productosActualizados'));
});

export async function procesarVentaFirebase(carrito, total, pago) {
    try {
        await addDoc(collection(db, "usuarios", UID, "ventas"), {
            fecha: new Date().toLocaleString(),
            items: carrito,
            totalUSD: total,
            detalle: pago,
            tasa: tasaActual
        });
        for (let item of carrito) {
            await updateDoc(doc(db, "usuarios", UID, "productos", item.id), { stock: increment(-item.cantidad) });
        }
        return true;
    } catch (e) { return false; }
}

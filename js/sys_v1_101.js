import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const UID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasaActual = 0;

// 1. ESCUCHAR LA TASA Y LOS PRODUCTOS
function iniciarSistema() {
    const tasaRef = doc(db, "usuarios", UID, "configuracion", "tasa");

    onSnapshot(tasaRef, (snap) => {
        if (snap.exists()) {
            tasaActual = snap.data().valor;
            document.getElementById('tasa-valor').innerText = tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + " Bs.";
            cargarProductos(); // Refresca la tabla cuando la tasa cambia
        }
    });
}

// 2. FUNCIÓN PARA ACTUALIZAR LA TASA (Se activa al pulsar el botón azul)
window.actualizarTasaManualmente = async () => {
    const nuevaTasa = prompt("Ingrese el nuevo valor de la tasa (Bs.):", tasaActual);
    
    if (nuevaTasa !== null && !isNaN(nuevaTasa) && nuevaTasa > 0) {
        try {
            const tasaRef = doc(db, "usuarios", UID, "configuracion", "tasa");
            await updateDoc(tasaRef, {
                valor: parseFloat(nuevaTasa),
                fecha: new Date().toLocaleString()
            });
            alert("Tasa actualizada correctamente");
        } catch (error) {
            console.error("Error al actualizar tasa:", error);
            alert("Error al guardar en Firebase");
        }
    }
};

// 3. CARGAR PRODUCTOS EN LA TABLA
function cargarProductos() {
    const productosRef = collection(db, "usuarios", UID, "productos");
    const tabla = document.getElementById('tabla-inventario');

    onSnapshot(productosRef, (snapshot) => {
        tabla.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const p = docSnap.data();
            const precioBs = (p.precio * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });

            tabla.innerHTML += `
                <tr>
                    <td>
                        <span class="prod-name" style="font-weight:700; display:block;">${p.nombre}</span>
                        <span class="prod-code" style="font-size:0.75rem; color:#94A3B8; font-family:monospace;">
                            <i class="fas fa-barcode"></i> ${p.codigo || 'S/C'}
                        </span>
                    </td>
                    <td><span class="badge-stock" style="background:#F1F5F9; padding:5px 12px; border-radius:8px; font-weight:800;">${p.stock}</span></td>
                    <td style="font-weight:600;">$${p.precio.toFixed(2)}</td>
                    <td style="color:#3B82F6; font-weight:900;">${precioBs} Bs.</td>
                    <td style="text-align: center;">
                        <button style="color:#3B82F6; border:none; background:none; cursor:pointer;"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `;
        });
    });
}

iniciarSistema();

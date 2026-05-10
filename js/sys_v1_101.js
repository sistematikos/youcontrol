import { db } from './firebase-config.js';
import { collection, onSnapshot, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const UID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
let tasaActual = 0;

// Función para iniciar la escucha de datos
function iniciarEscucha() {
    // 1. Obtener la tasa desde la sub-colección 'configuracion'
    // Nota: Según tu imagen, 'configuracion' es una sub-colección. 
    // Si dentro de 'configuracion' tienes un documento llamado 'tasa', usamos esta ruta:
    const tasaRef = doc(db, "usuarios", UID, "configuracion", "tasa");

    onSnapshot(tasaRef, (docSnap) => {
        if (docSnap.exists()) {
            tasaActual = docSnap.data().valor || 0;
            document.getElementById('tasa-valor').innerText = tasaActual.toLocaleString('es-VE', { minimumFractionDigits: 2 }) + " Bs.";
            renderizarProductos(); // Refrescar productos con la nueva tasa
        } else {
            document.getElementById('tasa-valor').innerText = "0.00 Bs.";
            renderizarProductos();
        }
    });
}

// Función para renderizar la tabla de productos
function renderizarProductos() {
    const productosRef = collection(db, "usuarios", UID, "productos");
    const tbody = document.getElementById('tabla-inventario');

    onSnapshot(productosRef, (snapshot) => {
        tbody.innerHTML = "";

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">No hay productos registrados</td></tr>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const id = docSnap.id;
            const precioBs = (item.precio * tasaActual).toLocaleString('es-VE', { minimumFractionDigits: 2 });

            tbody.innerHTML += `
                <tr>
                    <td>
                        <span class="prod-name">${item.nombre || 'Sin nombre'}</span>
                        <span class="prod-code"><i class="fas fa-barcode"></i> ${item.codigo || 'S/C'}</span>
                    </td>
                    <td><span class="badge-stock">${item.stock || 0}</span></td>
                    <td><span style="font-weight:600;">$${parseFloat(item.precio || 0).toFixed(2)}</span></td>
                    <td><span class="price-bs">${precioBs} Bs.</span></td>
                    <td style="text-align: center;">
                        <button style="color:var(--blue); border:none; background:none; cursor:pointer; font-size:1.1rem;"><i class="fas fa-edit"></i></button>
                        <button style="color:#EF4444; border:none; background:none; cursor:pointer; font-size:1.1rem; margin-left:10px;"><i class="fas fa-eye-slash"></i></button>
                    </td>
                </tr>
            `;
        });
    });
}

// Iniciar el sistema
iniciarEscucha();

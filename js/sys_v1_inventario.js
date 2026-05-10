import { db } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const UID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
const tabla = document.getElementById('cuerpo-tabla');

window.agregarFila = () => {
    const tr = document.createElement('tr');
    tr.className = "fila-producto";
    tr.innerHTML = `
        <td><input type="text" class="input-table p-barcode" placeholder="Scanner"></td>
        <td><input type="text" class="input-table p-nombre" placeholder="Producto"></td>
        <td><input type="number" class="input-table p-precio" placeholder="0.00" step="0.01"></td>
        <td><input type="number" class="input-table p-stock" placeholder="0"></td>
        <td style="text-align: center;">
            <button class="btn-remove" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    tabla.appendChild(tr);
    tr.querySelector('.p-barcode').focus();
};

window.guardarInventario = async () => {
    const filas = document.querySelectorAll('.fila-producto');
    const btn = document.getElementById('btnGuardarTodo');
    
    if (filas.length === 0) return alert("Tabla vacía");

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ESCRIBIENDO EN FIREBASE...';

    try {
        const productosRef = collection(db, "usuarios", UID, "productos");

        for (let fila of filas) {
            const barcode = fila.querySelector('.p-barcode').value.trim();
            const nombre = fila.querySelector('.p-nombre').value.trim();
            const precio = parseFloat(fila.querySelector('.p-precio').value);
            const stock = parseInt(fila.querySelector('.p-stock').value);

            if (nombre && !isNaN(precio)) {
                await addDoc(productosRef, {
                    codigo: barcode || "N/A",
                    nombre: nombre,
                    precio: precio,
                    stock: stock || 0,
                    estado: "activo",
                    version: "sys_v1",
                    fecha: new Date().toLocaleString()
                });
            }
        }

        alert("Carga exitosa en sys_v1");
        tabla.innerHTML = ""; 
        agregarFila();

    } catch (error) {
        console.error("Error Core:", error);
        alert("Error de sistema");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> PROCESAR CARGA MASIVA (FIREBASE)';
    }
};

agregarFila();
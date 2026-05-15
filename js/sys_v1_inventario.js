import { db } from './firebase-config.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ID de usuario verificado
const UID = "sUhfZI9Fy3M9UlInTYw2wFWZmB12";
const tabla = document.getElementById('cuerpo-tabla');

// Función para añadir una fila nueva a la tabla
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
    // Auto-foco en el código de barras para usar el scanner rápido
    tr.querySelector('.p-barcode').focus();
};

// Función para guardar los datos en Firebase
window.guardarInventario = async () => {
    const filas = document.querySelectorAll('.fila-producto');
    const btn = document.getElementById('btnGuardarTodo');
    
    if (filas.length === 0) return alert("La tabla está vacía");

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ESCRIBIENDO EN FIREBASE...';

    try {
        for (let fila of filas) {
            const barcode = fila.querySelector('.p-barcode').value.trim();
            const nombre = fila.querySelector('.p-nombre').value.trim();
            const precio = parseFloat(fila.querySelector('.p-precio').value);
            const stock = parseInt(fila.querySelector('.p-stock').value);

            // Solo procesamos si hay nombre y código de barras
            if (nombre && barcode) {
                // Usamos el código de barras como ID único del documento
                const productoRef = doc(db, "usuarios", UID, "productos", barcode);
                
                await setDoc(productoRef, {
                    codigo: barcode,
                    nombre: nombre,
                    precio: precio || 0,
                    stock: stock || 0,
                    costo: (precio || 0) * 0.70, // Guardamos un costo base para los reportes de ganancia
                    estado: "activo",
                    version: "sys_v1",
                    fecha_registro: new Date().toISOString()
                }, { merge: true }); // 'merge' asegura que no borre otros campos si ya existía
            }
        }

        alert("¡Inventario actualizado con éxito!");
        tabla.innerHTML = ""; // Limpiar tabla
        agregarFila(); // Dejar una fila lista para seguir cargando

    } catch (error) {
        console.error("Error Core:", error);
        alert("Error de sistema al conectar con Firebase");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> PROCESAR CARGA MASIVA (FIREBASE)';
    }
};

// Inicializamos con una fila al cargar la página
agregarFila();
